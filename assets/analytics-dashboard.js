(() => {
  'use strict';
  const $=selector=>document.querySelector(selector);
  const number=new Intl.NumberFormat('zh-CN');

  async function request(path,options={}) {
    const headers={'Content-Type':'application/json',...options.headers};
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),10000);
    let response;
    try {
      response=await fetch(path,{credentials:'same-origin',...options,headers,signal:controller.signal});
    } catch(error) {
      if(error.name==='AbortError')throw new Error('统计服务响应超时，请稍后刷新');
      throw error;
    } finally {
      clearTimeout(timeout);
    }
    let data={};try{data=await response.json();}catch{/* Preserve the status-based error below. */}
    if(!response.ok) {
      const error=new Error(typeof data.detail==='string'?data.detail:'请求暂时无法完成');error.status=response.status;throw error;
    }
    return data;
  }

  function comparison(current,previous) {
    if(previous===null||previous===undefined)return '暂无完整的上一周期数据';
    if(previous===0)return current===0?'与上一周期持平':'上一周期为 0';
    const change=Math.round((current-previous)*1000/previous)/10;
    return `较上一周期 ${change>0?'+':''}${change}%`;
  }

  function svgElement(tag,attributes={},text='') {
    const node=document.createElementNS('http://www.w3.org/2000/svg',tag);
    for(const [key,value] of Object.entries(attributes))node.setAttribute(key,value);
    if(text)node.textContent=text;return node;
  }

  function renderChart(rows) {
    const svg=$('#trendChart');svg.replaceChildren();
    const width=800,height=280,left=54,right=22,top=18,bottom=42;
    const plotWidth=width-left-right,plotHeight=height-top-bottom;
    const maximum=Math.max(1,...rows.flatMap(row=>[row.pv,row.uv]));
    for(let i=0;i<=4;i++) {
      const y=top+plotHeight*i/4,value=Math.round(maximum*(4-i)/4);
      svg.append(svgElement('line',{x1:left,y1:y,x2:width-right,y2:y,class:'chart-grid'}));
      svg.append(svgElement('text',{x:left-9,y:y+4,'text-anchor':'end',class:'chart-axis'},number.format(value)));
    }
    const x=index=>left+(rows.length===1?plotWidth/2:plotWidth*index/(rows.length-1));
    const y=value=>top+plotHeight-(value/maximum)*plotHeight;
    const points=key=>rows.map((row,index)=>`${x(index)},${y(row[key])}`).join(' ');
    svg.append(svgElement('polyline',{points:points('pv'),class:'chart-pv'}));
    svg.append(svgElement('polyline',{points:points('uv'),class:'chart-uv'}));
    if(rows.length<=14)for(const [key,cls] of [['pv','chart-pv-point'],['uv','chart-uv-point']])rows.forEach((row,index)=>svg.append(svgElement('circle',{cx:x(index),cy:y(row[key]),r:3.5,class:cls})));
    const step=Math.max(1,Math.ceil(rows.length/7));
    rows.forEach((row,index)=>{
      if(index%step&&index!==rows.length-1)return;
      svg.append(svgElement('text',{x:x(index),y:height-16,'text-anchor':'middle',class:'chart-axis'},row.day.slice(5).replace('-','/')));
    });
  }

  function renderPages(pages) {
    const body=$('#pagesBody');body.replaceChildren();$('#emptyPages').hidden=pages.length>0;
    for(const page of pages) {
      const row=document.createElement('tr');
      const title=document.createElement('td');title.textContent=page.title;
      const key=document.createElement('small');key.className='page-key';key.textContent=page.page;title.append(key);
      const pv=document.createElement('td');pv.textContent=number.format(page.pv);
      const uv=document.createElement('td');uv.textContent=number.format(page.uv);
      const share=document.createElement('td');share.textContent=page.share.toFixed(1)+'%';
      row.append(title,pv,uv,share);body.append(row);
    }
  }

  function rangeLabel(data) {
    if(data.range.days===1)return '今天';
    if(data.range.end===todayInShanghai())return `近 ${data.range.days} 天`;
    return `${data.range.start} 至 ${data.range.end}`;
  }

  function todayInShanghai() {
    const parts=new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
    const value=type=>parts.find(part=>part.type===type).value;
    return `${value('year')}-${value('month')}-${value('day')}`;
  }

  function render(data) {
    const label=rangeLabel(data);
    $('#todayPv').textContent=number.format(data.today.pv);$('#todayUv').textContent=number.format(data.today.uv);
    $('#rangePvLabel').textContent=label+' PV';$('#rangeUvLabel').textContent=label+' UV';
    $('#rangePv').textContent=number.format(data.totals.pv);$('#rangeUv').textContent=number.format(data.totals.uv);
    $('#rangePvCompare').textContent=comparison(data.totals.pv,data.previous?.pv);
    $('#rangeUvCompare').textContent=comparison(data.totals.uv,data.previous?.uv);
    $('#trendRange').textContent=`${data.range.start} 至 ${data.range.end}`;
    $('#updatedAt').textContent=`更新于 ${data.updatedAt.replace('T',' ')} · ${data.range.timezone}`;
    $('#rangeStart').value=data.range.start;$('#rangeEnd').value=data.range.end;
    renderChart(data.daily);renderPages(data.pages);
  }

  async function loadSummary(query='days=7') {
    $('#dashboardStatus').textContent='';
    try {
      const data=await request('/api/analytics/summary?'+query);
      render(data);
    } catch(error) {
      $('#dashboardStatus').textContent=error.message;
    }
  }

  $('.range-buttons').addEventListener('click',event=>{
    const button=event.target.closest('[data-days]');if(!button)return;
    document.querySelectorAll('[data-days]').forEach(item=>item.classList.toggle('active',item===button));loadSummary('days='+button.dataset.days);
  });
  $('#applyRange').addEventListener('click',()=>{
    const start=$('#rangeStart').value,end=$('#rangeEnd').value;
    if(!start||!end){$('#dashboardStatus').textContent='请选择完整的开始和结束日期';return;}
    document.querySelectorAll('[data-days]').forEach(item=>item.classList.remove('active'));
    loadSummary('start='+encodeURIComponent(start)+'&end='+encodeURIComponent(end));
  });
  const today=todayInShanghai();
  for(const input of [$('#rangeStart'),$('#rangeEnd')])input.max=today;
  loadSummary();
})();
