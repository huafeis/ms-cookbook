"""Reading community API and static site; OAuth credentials never leave this process."""
from contextlib import contextmanager
import json
import os
import secrets
import sqlite3
import time
from pathlib import Path
from urllib.parse import urlparse

from authlib.integrations.starlette_client import OAuth, OAuthError
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, RedirectResponse
from pydantic import BaseModel, Field
from starlette.middleware.sessions import SessionMiddleware
from starlette.staticfiles import StaticFiles

ROOT = Path(__file__).resolve().parent

class Entry(BaseModel):
    kind: str
    text: str = Field(default='', max_length=2000)
    quote: str = Field(default='', max_length=2000)
    block: int = Field(default=0, ge=0, le=100000)
    start: int = Field(default=0, ge=0, le=1000000)
    end: int = Field(default=0, ge=0, le=1000000)

class Wish(BaseModel):
    text: str = Field(max_length=2000)


def create_app(data_dir=None):
    folder = Path(data_dir or os.getenv('DATA_DIR', ROOT / '.data'))
    folder.mkdir(parents=True, exist_ok=True)
    db_path = folder / 'reading.sqlite3'
    @contextmanager
    def db():
        conn = sqlite3.connect(db_path, timeout=15)
        conn.row_factory = sqlite3.Row
        conn.execute('PRAGMA foreign_keys=ON')
        try:
            with conn: yield conn
        finally:
            conn.close()
    with db() as conn:
        conn.executescript('''
        PRAGMA journal_mode=WAL;
        CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY, sub TEXT UNIQUE NOT NULL, name TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS sessions(id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), expires INTEGER NOT NULL);
        CREATE TABLE IF NOT EXISTS entries(id TEXT PRIMARY KEY, chapter TEXT NOT NULL, user_id TEXT NOT NULL REFERENCES users(id), kind TEXT NOT NULL, text TEXT NOT NULL, quote TEXT NOT NULL, block INTEGER NOT NULL, start INTEGER NOT NULL, end INTEGER NOT NULL, created INTEGER NOT NULL);
        CREATE INDEX IF NOT EXISTS entries_chapter ON entries(chapter, created);
        CREATE INDEX IF NOT EXISTS entries_user_time ON entries(user_id, created);
        CREATE TABLE IF NOT EXISTS wishes(id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), text TEXT NOT NULL, created INTEGER NOT NULL);
        CREATE INDEX IF NOT EXISTS wishes_user_time ON wishes(user_id, created);
        ''')
    key_path = folder / 'session.key'
    if not key_path.exists():
        try:
            with key_path.open('x') as f: f.write(secrets.token_hex(32))
            key_path.chmod(0o600)
        except FileExistsError: pass
    base = os.getenv('APP_BASE_URL') or ('https://' + os.environ['STUDIO_HOST'] if os.getenv('STUDIO_HOST') else 'http://127.0.0.1:7860')
    parsed = urlparse(base)
    if parsed.scheme not in ('https', 'http') or not parsed.netloc or parsed.path not in ('', '/'):
        raise RuntimeError('APP_BASE_URL must be an origin without a path')
    if parsed.scheme != 'https' and parsed.hostname not in ('127.0.0.1', 'localhost'):
        raise RuntimeError('Public OAuth deployments require HTTPS')
    base = base.rstrip('/')
    app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)
    app.add_middleware(SessionMiddleware, secret_key=os.getenv('SESSION_SECRET') or key_path.read_text(), session_cookie='purplebook_session', max_age=7*86400, same_site='lax', https_only=parsed.scheme=='https')
    oauth = OAuth()
    enabled = bool(os.getenv('OAUTH_CLIENT_ID') and os.getenv('OAUTH_CLIENT_SECRET'))
    if enabled:
        # Studio can inject an internal issuer alias. Use the verified public
        # ModelScope discovery endpoint so redirects remain browser-accessible.
        provider = 'https://www.modelscope.cn'
        oauth.register(name='modelscope', client_id=os.environ['OAUTH_CLIENT_ID'], client_secret=os.environ['OAUTH_CLIENT_SECRET'], server_metadata_url=provider+'/.well-known/openid-configuration', client_kwargs={'scope':'openid profile'})
    raw = (ROOT / 'assets/content.js').read_text().split('=',1)[1].strip().rstrip(';')
    # Keep notes attached to their original article when display numbers change.
    chapters = {c['id']: c.get('discussionId', c['id']) for c in json.loads(raw)['chapters'] if c.get('status') != 'pending'}
    admins = set(filter(None, os.getenv('MODERATOR_SUBS','').split(',')))

    def user(request):
        sid = request.session.get('sid')
        if not sid: return None
        with db() as conn:
            row = conn.execute('SELECT users.* FROM sessions JOIN users ON users.id=sessions.user_id WHERE sessions.id=? AND expires>?', (sid,int(time.time()))).fetchone()
        return dict(row) if row else None
    def public_user(u):
        return {'id':u['id'],'name':u['name'],'moderator':u['sub'] in admins} if u else None
    def require_user(request):
        u=user(request)
        if not u: raise HTTPException(401,'请先使用魔搭账号登录')
        csrf=request.headers.get('x-csrf-token','')
        if request.headers.get('origin') != base or not csrf or not secrets.compare_digest(csrf, request.session.get('csrf','')):
            raise HTTPException(403,'页面已过期，请刷新后重试')
        return u
    def check_chapter(chapter):
        if chapter not in chapters: raise HTTPException(404,'章节不存在或尚未开放')
        return chapters[chapter]

    @app.middleware('http')
    async def response_headers(request, call_next):
        response = await call_next(request)
        response.headers['X-Content-Type-Options']='nosniff'
        response.headers['Referrer-Policy']='strict-origin-when-cross-origin'
        if request.url.path.startswith(('/api/','/auth/')):
            response.headers['Cache-Control']='no-store'
        return response

    @app.get('/api/session')
    def session(request: Request):
        request.session.setdefault('csrf',secrets.token_urlsafe(32))
        return {'user':public_user(user(request)), 'csrf':request.session['csrf'], 'loginEnabled':enabled}

    @app.get('/auth/login')
    async def login(request: Request, return_to: str = '#home'):
        if not enabled: raise HTTPException(503,'魔搭登录尚未配置')
        # Only a local chapter/home hash can be used as the return destination.
        import re
        request.session['return_to'] = return_to if re.fullmatch(r'#[a-zA-Z0-9_/?=&%-]{1,180}', return_to) else '#home'
        return await oauth.modelscope.authorize_redirect(request, base+'/auth/callback')

    @app.get('/auth/callback')
    async def callback(request: Request):
        if not enabled: raise HTTPException(503,'魔搭登录尚未配置')
        try:
            token = await oauth.modelscope.authorize_access_token(request)
            info = token.get('userinfo')
            if not info or not info.get('sub'): raise ValueError('Missing validated identity')
        except (OAuthError, ValueError):
            return RedirectResponse('/?login=failed#home',status_code=303)
        sub=str(info['sub'])
        name=str(info.get('name') or info.get('preferred_username') or '魔搭读者')[:100]
        now=int(time.time()); sid=secrets.token_urlsafe(32)
        with db() as conn:
            conn.execute('INSERT INTO users VALUES (?,?,?) ON CONFLICT(sub) DO UPDATE SET name=excluded.name',(secrets.token_hex(16),sub,name))
            uid=conn.execute('SELECT id FROM users WHERE sub=?',(sub,)).fetchone()['id']
            conn.execute('DELETE FROM sessions WHERE expires<=? OR id=?',(now,request.session.get('sid','')))
            conn.execute('INSERT INTO sessions VALUES (?,?,?)',(sid,uid,now+7*86400))
        target=request.session.get('return_to','#home')
        request.session.clear()
        request.session.update(sid=sid,csrf=secrets.token_urlsafe(32))
        return RedirectResponse('/'+target,status_code=303)

    @app.post('/api/logout')
    def logout(request: Request):
        require_user(request)
        with db() as conn: conn.execute('DELETE FROM sessions WHERE id=?',(request.session.get('sid'),))
        request.session.clear()
        return {'ok':True}

    @app.get('/api/chapters/{chapter}/entries')
    def list_entries(chapter: str, request: Request, before: int = 0):
        storage_chapter=check_chapter(chapter); u=user(request); uid=u['id'] if u else ''
        # Rowid cursor remains stable even when multiple entries share a timestamp.
        with db() as conn:
            rows=conn.execute('SELECT e.rowid cursor,e.*,u.name FROM entries e JOIN users u ON u.id=e.user_id WHERE e.chapter=? AND (e.kind!=\'highlight\' OR e.user_id=?) AND (?=0 OR e.rowid<?) ORDER BY e.rowid DESC LIMIT 101',(storage_chapter,uid,before,before)).fetchall()
        items=[]
        for row in rows[:100]:
            item=dict(row); item['chapter']=chapter; item['mine']=item['user_id']==uid
            item['canDelete']=item['mine'] or bool(u and u['sub'] in admins)
            item.pop('user_id'); items.append(item)
        return {'items':items,'next':items[-1]['cursor'] if len(rows)>100 else None}

    @app.post('/api/chapters/{chapter}/entries',status_code=201)
    def add_entry(chapter: str, entry: Entry, request: Request):
        u=require_user(request); chapter=check_chapter(chapter)
        if entry.kind not in ('highlight','annotation','comment'): raise HTTPException(422,'不支持的笔记类型')
        if entry.kind!='highlight' and not entry.text.strip(): raise HTTPException(422,'请填写内容')
        if entry.kind!='comment' and (not entry.quote.strip() or entry.end<=entry.start): raise HTTPException(422,'请先选择正文中的文字')
        now=int(time.time()); eid=secrets.token_hex(16)
        with db() as conn:
            conn.execute('BEGIN IMMEDIATE')
            count=conn.execute('SELECT count(*) FROM entries WHERE user_id=? AND created>?',(u['id'],now-60)).fetchone()[0]
            if count>=10: raise HTTPException(429,'操作太频繁，请稍后再试')
            if entry.kind=='highlight':
                existing=conn.execute('SELECT id FROM entries WHERE chapter=? AND user_id=? AND kind=? AND block=? AND start=? AND end=? AND quote=?',(chapter,u['id'],entry.kind,entry.block,entry.start,entry.end,entry.quote)).fetchone()
                if existing: return {'id':existing['id']}
            conn.execute('INSERT INTO entries VALUES (?,?,?,?,?,?,?,?,?,?)',(eid,chapter,u['id'],entry.kind,entry.text.strip(),entry.quote,entry.block,entry.start,entry.end,now))
        return {'id':eid}

    @app.delete('/api/entries/{entry_id}')
    def delete_entry(entry_id: str, request: Request):
        u=require_user(request)
        with db() as conn:
            row=conn.execute('SELECT user_id FROM entries WHERE id=?',(entry_id,)).fetchone()
            if not row: raise HTTPException(404,'内容已删除')
            if row['user_id']!=u['id'] and u['sub'] not in admins: raise HTTPException(403,'只能删除自己发表的内容')
            conn.execute('DELETE FROM entries WHERE id=?',(entry_id,))
        return {'ok':True}

    @app.get('/api/wishes')
    def list_wishes(request: Request, before: int = 0):
        u=user(request)
        with db() as conn:
            rows=conn.execute('SELECT w.rowid cursor,w.*,u.name FROM wishes w JOIN users u ON u.id=w.user_id WHERE (?=0 OR w.rowid<?) ORDER BY w.rowid DESC LIMIT 21',(before,before)).fetchall()
        items=[]
        for row in rows[:20]:
            item=dict(row)
            item['canDelete']=bool(u and (item['user_id']==u['id'] or u['sub'] in admins))
            item.pop('user_id'); items.append(item)
        return {'items':items,'next':items[-1]['cursor'] if len(rows)>20 else None}

    @app.post('/api/wishes',status_code=201)
    def add_wish(wish: Wish, request: Request):
        u=require_user(request)
        text=wish.text.strip()
        if not text: raise HTTPException(422,'请写下希望补充的内容')
        now=int(time.time()); wid=secrets.token_hex(16)
        with db() as conn:
            conn.execute('BEGIN IMMEDIATE')
            count=conn.execute('SELECT count(*) FROM wishes WHERE user_id=? AND created>?',(u['id'],now-60)).fetchone()[0]
            if count>=5: raise HTTPException(429,'愿望发送太频繁，请稍后再试')
            conn.execute('INSERT INTO wishes VALUES (?,?,?,?)',(wid,u['id'],text,now))
        return {'id':wid}

    @app.delete('/api/wishes/{wish_id}')
    def delete_wish(wish_id: str, request: Request):
        u=require_user(request)
        with db() as conn:
            row=conn.execute('SELECT user_id FROM wishes WHERE id=?',(wish_id,)).fetchone()
            if not row: raise HTTPException(404,'这条愿望已删除')
            if row['user_id']!=u['id'] and u['sub'] not in admins: raise HTTPException(403,'只能删除自己发表的愿望')
            conn.execute('DELETE FROM wishes WHERE id=?',(wish_id,))
        return {'ok':True}

    @app.get('/')
    def index(): return FileResponse(ROOT/'index.html',headers={'Cache-Control':'no-cache'})
    @app.get('/favicon.svg')
    def favicon(): return FileResponse(ROOT/'favicon.svg')
    @app.get('/deployment.json')
    def deployment():
        if not (ROOT/'deployment.json').exists(): raise HTTPException(404)
        return FileResponse(ROOT/'deployment.json')
    for directory in ('assets','content','chapters'):
        app.mount('/'+directory,StaticFiles(directory=ROOT/directory),name=directory)
    for filename in ('CONTRIBUTING.md','README.md','README.zh-CN.md','LICENSE'):
        def make_document(path):
            def document(): return FileResponse(path)
            return document
        app.add_api_route('/'+filename,make_document(ROOT/filename),methods=['GET'])
    app.state.db=db
    app.state.oauth=oauth
    return app

app=create_app()
