from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

import pytest
from fastapi.testclient import TestClient

from app import create_app


BASE='http://127.0.0.1:7860'


@pytest.fixture
def analytics_site(tmp_path,monkeypatch):
    monkeypatch.setenv('APP_BASE_URL',BASE)
    monkeypatch.delenv('OAUTH_CLIENT_ID',raising=False)
    monkeypatch.delenv('OAUTH_CLIENT_SECRET',raising=False)
    app=create_app(tmp_path)
    client=TestClient(app,base_url=BASE,headers={'origin':BASE})
    return app,client


def test_tracking_daily_pv_uv_and_summary(analytics_site):
    _,client=analytics_site
    visitor_a='visitor_aaaaaaaaaaaaaaaa'
    visitor_b='visitor_bbbbbbbbbbbbbbbb'
    for page,visitor in [('home',visitor_a),('home',visitor_a),('chapter-19',visitor_a),('home',visitor_b)]:
        assert client.post('/api/analytics/view',json={'page':page,'visitor':visitor}).status_code==204

    summary=client.get('/api/analytics/summary?days=7').json()
    assert summary['today']=={'pv':4,'uv':2}
    assert summary['totals']=={'pv':4,'uv':2}
    assert summary['range']['timezone']=='Asia/Shanghai'
    pages={item['page']:item for item in summary['pages']}
    assert pages['home']['pv']==3 and pages['home']['uv']==2 and pages['home']['share']==75.0
    assert pages['chapter-19']['pv']==1 and pages['chapter-19']['uv']==1
    assert sum(day['pv'] for day in summary['daily'])==4


def test_period_uv_deduplicates_the_same_visitor_across_days(analytics_site):
    app,client=analytics_site
    today=datetime.now(ZoneInfo('Asia/Shanghai')).date()
    yesterday=today-timedelta(days=1)
    with app.state.analytics_db() as db:
        for day in (yesterday.isoformat(),today.isoformat()):
            db.execute('INSERT INTO analytics_page_daily VALUES (?,?,?)',(day,'home',1))
            db.execute('INSERT INTO analytics_visitor_daily VALUES (?,?,?)',(day,'home','same-visitor'))
            db.execute('INSERT INTO analytics_visitor_daily VALUES (?,?,?)',(day,'__site__','same-visitor'))
    summary=client.get('/api/analytics/summary?days=2').json()
    assert summary['totals']=={'pv':2,'uv':1}
    assert [item['uv'] for item in summary['daily']]==[1,1]


def test_tracking_validates_origin_page_and_visitor(analytics_site):
    _,client=analytics_site
    body={'page':'home','visitor':'visitor_aaaaaaaaaaaaaaaa'}
    assert client.post('/api/analytics/view',json=body,headers={'origin':'https://evil.example'}).status_code==403
    assert client.post('/api/analytics/view',json={**body,'page':'unknown'}).status_code==422
    assert client.post('/api/analytics/view',json={**body,'visitor':'short'}).status_code==422


def test_analytics_range_and_page(analytics_site):
    _,client=analytics_site
    assert client.get('/analytics').status_code==200
    assert '<title>访问统计｜魔搭紫皮书</title>' in client.get('/analytics').text
    today=datetime.now(ZoneInfo('Asia/Shanghai')).date()
    start=(today-timedelta(days=6)).isoformat()
    response=client.get(f'/api/analytics/summary?start={start}&end={today.isoformat()}')
    assert response.status_code==200 and response.json()['range']['days']==7
    future=(today+timedelta(days=1)).isoformat()
    assert client.get(f'/api/analytics/summary?start={today.isoformat()}&end={future}').status_code==422


def test_analytics_uses_an_isolated_database(analytics_site):
    app,_=analytics_site
    with app.state.db() as db:
        tables={row['name'] for row in db.execute("SELECT name FROM sqlite_master WHERE type='table'")}
    assert 'analytics_page_daily' not in tables
    with app.state.analytics_db() as db:
        tables={row['name'] for row in db.execute("SELECT name FROM sqlite_master WHERE type='table'")}
        journal=db.execute('PRAGMA journal_mode').fetchone()[0]
    assert {'analytics_page_daily','analytics_visitor_daily'} <= tables
    assert journal=='delete'


def test_corrupted_analytics_database_is_quarantined_and_rebuilt(analytics_site,tmp_path):
    _,client=analytics_site
    (tmp_path/'analytics.sqlite3').write_bytes(b'corrupted analytics database')
    response=client.post('/api/analytics/view',json={'page':'home','visitor':'visitor_aaaaaaaaaaaaaaaa'})
    assert response.status_code==204
    assert client.get('/api/analytics/summary?days=1').json()['today']=={'pv':1,'uv':1}
    assert len(list(tmp_path.glob('analytics.corrupt-*.sqlite3')))==1
