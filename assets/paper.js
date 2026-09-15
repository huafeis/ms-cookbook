(() => {
  'use strict';
  const data = window.BOOK_DATA;
  const chapters = new Map(data.chapters.map(c => [c.id, c]));
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const shortTitle = title => title.replace(/^第[^　\s]+章[　\s]*/, '');
  const partNames = data.parts.map(p => p.shortTitle || p.title);
  $$('.book-counts').forEach(el => { el.textContent = `${data.parts.length} 篇主题 · ${data.chapterCount} 个章节 · ${data.imageCount} 张图`; });
  $('.banner-counts').textContent = `${data.parts.length} 篇主题 · ${data.chapterCount} 个章节`;
  $('#sourceStatus').textContent = `${data.sourceUpdated} 内容快照 · ${data.readyCount} 章可读 · ${data.chapterCount-data.readyCount} 章待补充`;
  $('#sourceLink').href = data.sourceUrl;
  const projectLinks = '<a href="https://github.com/modelscope/ms-cookbook" target="_blank" rel="noopener noreferrer">GitHub ↗</a><a href="https://modelscope.cn/spotlight" target="_blank" rel="noopener noreferrer">魔搭开发者实践 ↗</a><a href="#contribute">社区共建</a><a href="https://github.com/NovaWang97/dada-illustrations" target="_blank" rel="noopener noreferrer">搭搭素材 · Dada ↗</a>';
  $$('.project-links').forEach(el=>{el.innerHTML=projectLinks;});
  $$('.quiet-footer').forEach(el=>{el.insertAdjacentHTML('beforeend',`<div class="project-links">${projectLinks}</div>`);});
  const arrow = '<img class="arrow" src="assets/home/arrow.svg" alt="">';
  const artSource = art => art==='dada'?'assets/dada/dada.webp':`assets/paper/${art}.webp`;
  const paths = {
    beginner: {name:'从零开始',title:'从零开始，跑通第一个模型',art:'seedling',desc:'适合刚接触开源模型的读者。从理解模型，到选择任务，再到看到第一个结果。',brief:'建立基础认知，快速上手实践。',steps:'认识 → 选型 → 运行',link:'开始这条路径',chapters:[1,5,7],labels:['建立基础认知','找到业务任务','跑通第一个示例'],notes:['理解开源模型与使用边界','明确输入、输出与评估方式','完成一次模型运行']},
    model: {name:'深入模型',title:'深入模型，把通用能力变成场景能力',art:'mountain',desc:'适合已经跑通过模型的开发者。从业务数据准备开始，完成轻量微调，并用评测检验模型效果。',brief:'掌握核心技术，提升实践能力。',steps:'数据 → 微调 → 评测',link:'探索核心内容',chapters:[12,13,15],labels:['准备训练数据','完成轻量微调','验证模型效果'],notes:['将业务知识整理成训练样本','用 ms-swift 完成模型训练','比较基线与微调后的表现']},
    application: {name:'走向应用',title:'带着真实任务，探索模型的应用方式',art:'cubes',desc:'从企业知识问答到 MCP 与 Skill。结合任务选择章节，理解模型与工具怎样协同工作。',brief:'将模型能力转化为实际价值。',steps:'知识问答 → 工具 → Agent',link:'查看应用实践',chapters:[19,25,26],labels:['知识问答','连接工具','封装能力'],notes:['结合知识库生成有依据的回答','通过 MCP 连接外部工具','用 Skill 组织可复用的任务方法']},
    aigc: {name:'AIGC 创作',title:'从生成到定制，探索 AIGC 创作',art:'dada',desc:'面向创作者与 AIGC 实践者。从开源生成模型的案例出发，学习图像 LoRA 定制、商品营销图创作，再补充生成模型的理论知识。',brief:'理解生成能力，跑通创作流程。',steps:'案例 → 定制 → 图像创作',link:'开始 AIGC 创作',chapters:[20,21,22,24],labels:['认识生成能力','定制图像 LoRA','创作商品营销图','补充理论基础'],notes:['通过现有案例了解开源模型的创作能力','使用 DiffSynth 训练图像 LoRA','完成图像生成与修改流程','理解 AIGC 相关理论知识']}
  };
  const scenes = [
    {id:16,title:'AI 健身教练',desc:'识别人体关键点，对比跟练动作与示范。',type:'视觉',art:'photo'},
    {id:17,title:'智能客服质检',desc:'从通话转写到服务过程分析。',type:'语音分析',art:'documents'},
    {id:18,title:'能听也能说的语音助手',desc:'串联语音识别、模型问答与语音合成。',type:'语音',art:'voice'},
    {id:19,title:'企业知识问答助手',desc:'结合知识库，让回答有据可查。',type:'RAG',art:'documents'},
    {id:22,title:'商品营销图',desc:'从图像生成到修改，完成商品视觉创作。',type:'AIGC',art:'campaign'}
  ];
  let currentChapter = null;
  let currentView = '';
  let headingObserver;
  let searchTimer;
  const searchIndex = new Map(data.chapters.map(c => {
    const holder = document.createElement('div'); holder.innerHTML = c.html;
    return [c.id, (c.title+' '+c.headings.map(h=>h.text).join(' ')+' '+holder.textContent).toLowerCase()];
  }));

  $('#homePaths').innerHTML = Object.entries(paths).map(([key,p]) => `<article><a class="path-art-link" href="#paths/${key}" aria-label="${p.name}"><img src="${artSource(p.art)}" alt="" width="400" height="250"></a><h3>${p.name}</h3><p class="path-brief">${p.brief}</p><p>${p.steps}</p><a class="text-link" href="#paths/${key}">${p.link} ${arrow}</a></article>`).join('');
  $('#sceneGrid').innerHTML = scenes.map(s=>`<article class="scene"><a class="scene-art" href="#chapter-${s.id}" aria-label="${s.title}"><img src="assets/paper/${s.art}.webp" alt="" width="320" height="260" loading="lazy"></a><div class="scene-copy"><h2><a href="#chapter-${s.id}">${s.title}</a></h2><p>${s.desc}</p><div class="scene-meta"><span>第 ${s.id} 章 · ${s.type}</span><a class="text-link" href="#chapter-${s.id}">${chapters.get('chapter-'+s.id).status==='pending'?'查看章节':'阅读实践'} ${arrow}</a></div></div></article>`).join('');

  function highlighted(text,query) {
    if (!query) return esc(text);
    const index = text.toLowerCase().indexOf(query.toLowerCase());
    if (index<0) return esc(text);
    return esc(text.slice(0,index))+'<mark>'+esc(text.slice(index,index+query.length))+'</mark>'+esc(text.slice(index+query.length));
  }
  function renderIndex() {
    const query = $('#chapterSearch').value.trim();
    const q = query.toLowerCase();
    let count = 0;
    $('#bookIndex').innerHTML = data.parts.map((part,i)=> {
      const ids = part.chapters.filter(id=>!q || searchIndex.get(id).includes(q) || partNames[i].toLowerCase().includes(q));
      count += ids.length;
      if (!ids.length) return '';
      return `<section class="index-part"><div class="part-badge"><small>PART</small><span>${String(i+1).padStart(2,'0')}</span></div><div><h2>${partNames[i]}</h2><nav aria-label="${partNames[i]}">${ids.map(id=>{
        const c=chapters.get(id);
        const heading=q ? c.headings.find(h=>h.text.toLowerCase().includes(q)) : null;
        return `<a href="#${id}"><span class="chapter-index">${String(c.number).padStart(2,'0')}</span><span>${highlighted(shortTitle(c.title),query)}${c.status==='pending'?'<small class="pending-badge">待补充</small>':''}${heading ? `<small class="search-context">${highlighted(heading.text,query)}</small>`:''}</span>${arrow}</a>`;
      }).join('')}</nav></div></section>`;
    }).join('');
    $('#searchStatus').hidden = !query;
    $('#searchStatus').textContent = `“${query}”相关章节：${count} 个`;
    $('#emptySearch').hidden = count>0;
  }
  $('#chapterSearch').addEventListener('input',()=>{clearTimeout(searchTimer);searchTimer=setTimeout(renderIndex,100);});
  $('#clearSearch').addEventListener('click',()=>{$('#chapterSearch').value='';renderIndex();$('#chapterSearch').focus();});

  function buildChapterNav() {
    const markup = data.parts.map((p,i)=>`<details data-part="${i}"><summary><span class="part-index">${String(i+1).padStart(2,'0')}</span><span>${partNames[i]}</span></summary><div class="chapter-list">${p.chapters.map(id=>{const c=chapters.get(id);return `<a href="#${id}" data-chapter="${id}"><span>${String(c.number).padStart(2,'0')}</span>${esc(shortTitle(c.title))}</a>`;}).join('')}</div></details>`).join('');
    $('#chapterNav').innerHTML = markup; $('#mobileChapterNav').innerHTML = markup;
  }
  function renderPath(key) {
    const p=paths[key] || paths.beginner;
    const selected = paths[key] ? key : 'beginner';
    $$('.path-tabs button').forEach(b=>{const on=b.dataset.path===selected;b.setAttribute('aria-selected',String(on));b.tabIndex=on?0:-1;});
    $('#pathPanel').setAttribute('aria-labelledby','tab-'+selected);
    $('#pathArt').src=artSource(p.art); $('#pathArt').alt=p.art==='dada'?'搭搭 · AIGC 创作':p.name+'插画';
    $('#aigcContributions').hidden=selected!=='aigc';
    $('#pathTitle').textContent=p.title; $('#pathDescription').textContent=p.desc;
    $('#pathStart').href='#chapter-'+p.chapters[0];
    $('#pathStations').style.setProperty('--stations',p.chapters.length);
    $('#pathStations').innerHTML=p.chapters.map((n,i)=>`<li><span class="station-number">${String(i+1).padStart(2,'0')}</span><h3>${p.labels[i]}</h3><small>第 ${n} 章</small><p class="station-title">${esc(shortTitle(chapters.get('chapter-'+n).title))}</p><p>${p.notes[i]}</p><a class="text-link" href="#chapter-${n}">阅读章节 ${arrow}</a></li>`).join('');
  }
  $$('.path-tabs button').forEach((b,i)=> {
    b.addEventListener('click',()=>{location.hash='paths/'+b.dataset.path;});
    b.addEventListener('keydown',e=> {
      if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;
      e.preventDefault();const list=$$('.path-tabs button');
      const next=e.key==='Home'?0:e.key==='End'?list.length-1:(i+(e.key==='ArrowRight'?1:-1)+list.length)%list.length;
      list[next].focus();list[next].click();
    });
  });
  function setPager(node,chapter) {
    node.classList.toggle('disabled',!chapter);
    node.setAttribute('aria-disabled',String(!chapter));
    if(chapter){node.href='#'+chapter.id;node.removeAttribute('tabindex');const text=node.querySelector('span');if(text)text.textContent=shortTitle(chapter.title);}
    else {node.removeAttribute('href');node.tabIndex=-1;}
  }
  function closeDialogs() {$$('dialog[open]').forEach(d=>d.close());document.body.classList.remove('modal-open');}
  function openDialog(id) {
    closeDialogs();$(id).showModal();document.body.classList.add('modal-open');
    if(id==='#tocDialog')requestAnimationFrame(()=>{
      const active=$('#mobileToc [aria-current="location"]')||$('#mobileToc a');
      if(active){active.focus({preventScroll:true});active.scrollIntoView({block:'nearest',behavior:'instant'});}
    });
  }
  $$('[data-close]').forEach(b=>b.addEventListener('click',()=>$('#'+b.dataset.close).close()));
  $$('dialog').forEach(d=>{
    d.addEventListener('close',()=>document.body.classList.toggle('modal-open',!!$('dialog[open]')));
    d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}});
  });
  $('#menuButton').addEventListener('click',()=>openDialog('#siteMenu'));
  $('#tocButton').addEventListener('click',()=>openDialog('#tocDialog'));
  $('#backTop').addEventListener('click',e=>{e.preventDefault();window.scrollTo({top:0,behavior:'smooth'});});

  function renderChapter(chapter) {
    currentChapter=chapter;
    const index=data.chapters.indexOf(chapter);
    const partIndex=data.parts.findIndex(p=>p.chapters.includes(chapter.id));
    $('#partLabel').textContent=`第${['一','二','三','四','五','六','七','八'][partIndex]}篇 / ${partNames[partIndex]}`;
    $('#chapterTitle').textContent=shortTitle(chapter.title);
    $('#chapterNumber').textContent='第 '+chapter.number+' 章';
    $('#readTime').textContent=chapter.status==='pending'?'正文待补充':'阅读约 '+chapter.minutes+' 分钟';
    $('#chapterSource').href=chapter.sourceUrl;
    $('#chapterEdit').href=chapter.editUrl;
    $('#articleBody').innerHTML=chapter.html;
    $$('#articleBody .arithmatex').forEach(el=>{
      const text=el.textContent, display=el.classList.contains('display-math');
      const formula=text.slice(2,-2);
      if(window.katex)window.katex.render(formula,el,{displayMode:display,throwOnError:false,strict:'ignore',trust:false});
    });
    document.title=chapter.title+'｜魔搭紫皮书';
    const prev=data.chapters[index-1],next=data.chapters[index+1];
    setPager($('#previousChapter'),prev);setPager($('#nextChapter'),next);
    setPager($('#mobilePrevious'),prev);setPager($('#mobileNext'),next);
    const toc=chapter.headings.filter(h=>h.text.trim()).map(h=>`<a href="#${chapter.id}/${h.id}" data-heading="${h.id}" data-level="${h.level}">${esc(h.text)}</a>`).join('');
    $('#localToc').innerHTML=toc || '<p class="toc-empty">本章暂无小节目录</p>';$('#mobileToc').innerHTML=toc || '<p class="toc-empty">本章暂无小节目录</p>';
    $$('.chapter-nav details').forEach(d=>{d.open=Number(d.dataset.part)===partIndex;});
    $$('[data-chapter]').forEach(a=>{const active=a.dataset.chapter===chapter.id;a.classList.toggle('active',active);if(active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
    $$('#articleBody img').forEach(img=> {
      img.tabIndex=0;img.setAttribute('role','button');img.setAttribute('aria-label','放大查看图片');
      const show=()=>{$('#viewerImage').src=img.src;$('#viewerImage').alt=img.alt;openDialog('#imageViewer');};
      img.addEventListener('click',show);img.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();show();}});
    });
    $$('#articleBody pre').forEach(pre=>{
      const code=pre.querySelector('code')?.textContent||pre.textContent;
      const button=document.createElement('button');button.className='copy-code';button.textContent='复制';button.setAttribute('aria-label','复制代码');
      button.addEventListener('click',async()=>{
        try{await navigator.clipboard.writeText(code);button.textContent='已复制';}
        catch{const range=document.createRange();range.selectNodeContents(pre.querySelector('code')||pre);getSelection().removeAllRanges();getSelection().addRange(range);button.textContent='已选中，请复制';}
        setTimeout(()=>button.textContent='复制',2000);
      });pre.append(button);
    });
    if(headingObserver)headingObserver.disconnect();
    headingObserver=new IntersectionObserver(updateActiveHeading,{rootMargin:'-12% 0px -65% 0px',threshold:0});
    chapter.headings.filter(h=>h.text.trim()).forEach(h=>{const target=document.getElementById(h.id);if(target)headingObserver.observe(target);});
  }
  function updateActiveHeading() {
    if(currentView!=='reader'||!currentChapter)return;
    const headings=currentChapter.headings.filter(h=>h.text.trim());
    let active=headings[0]?.id;
    for(const h of headings){const el=document.getElementById(h.id);if(el&&el.getBoundingClientRect().top<=window.innerHeight*.24)active=h.id;}
    $$('[data-heading]').forEach(a=>{const on=a.dataset.heading===active;a.classList.toggle('active',on);if(on)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');});
  }
  function updateProgress() {
    if(currentView!=='reader')return;
    const article=$('#article'),total=Math.max(1,article.offsetHeight-window.innerHeight);
    $('#readingProgress').style.width=Math.max(0,Math.min(100,-article.getBoundingClientRect().top/total*100))+'%';
    updateActiveHeading();
  }
  function route() {
    const [name='home',sub='']=location.hash.slice(1).split('/');
    const chapter=chapters.get(name);
    const view=chapter?'reader':['contents','paths','practice','contribute'].includes(name)?name:'home';
    const samePath=currentView==='paths'&&view==='paths';
    closeDialogs();
    $$('[data-page]').forEach(p=>p.hidden=p.dataset.page!==view);
    document.body.dataset.view=view;
    $$('.desktop-nav [data-route]').forEach(a=>{if(a.dataset.route===view)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
    $('#headerAction').textContent=view==='reader'?'返回首页':'开始阅读';$('#headerAction').href=view==='reader'?'#home':'#chapter-1';
    $('#mobileChapterNav').hidden=view!=='reader';
    if(view==='reader') {
      if(currentChapter?.id!==chapter.id||currentView!=='reader')renderChapter(chapter);
    } else {
      if(headingObserver)headingObserver.disconnect();
      document.title=({home:'让开源模型，从知识走向实践',contents:'全书目录',paths:'阅读路径',practice:'场景实践',contribute:'社区共建'}[view])+'｜魔搭紫皮书';
      if(view==='contents')renderIndex();if(view==='paths')renderPath(sub);
    }
    currentView=view;
    requestAnimationFrame(()=>{
      if(view==='reader'&&sub){const target=document.getElementById(sub);if(target){target.scrollIntoView({block:'start',behavior:'instant'});target.tabIndex=-1;target.focus({preventScroll:true});}}
      else if(!samePath)window.scrollTo({top:0,behavior:'instant'});
      updateProgress();
    });
  }
  document.addEventListener('click',e=>{
    const a=e.target.closest('a[href^="#"]');
    if(a&&a.getAttribute('href')===location.hash&&a.id!=='backTop'){e.preventDefault();route();}
  });
  window.addEventListener('hashchange',route);
  window.addEventListener('scroll',updateProgress,{passive:true});
  window.addEventListener('resize',updateProgress);
  buildChapterNav();renderIndex();route();
})();
