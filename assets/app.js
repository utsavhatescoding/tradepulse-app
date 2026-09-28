import {loadReleaseIndex,loadOverviewData,loadExploreData,loadSignals,loadTrends,loadProductPartners} from './data.js';
import {money,num,pct,ratio,signed,deltaClass,esc,truncate,compact} from './format.js';
import {lineChart,horizontalBars} from './charts.js';
import {answerQuestion,suggestedQuestions} from './ask.js';

const root=document.getElementById('view-root');
const fySelect=document.getElementById('fy-select');
const releaseSelect=document.getElementById('release-select');
const drawer=document.getElementById('detail-drawer');
const backdrop=document.getElementById('drawer-backdrop');
const drawerTitle=document.getElementById('drawer-title');
const drawerEyebrow=document.getElementById('drawer-eyebrow');
const drawerBody=document.getElementById('drawer-body');
const methodDialog=document.getElementById('methodology-dialog');

const state={
  index:null,
  fyId:'2083_84',
  releaseId:'bhadra',
  view:'overview',
  overviewChartMode:'monthly',
  exploreMode:'products',
  exploreDirection:'imports',
  exploreSort:'value',
  exploreSearch:'',
  explorePage:1,
  exploreRows:[],
  trendMode:'monthly',
  askHistory:[],
  context:null,
};

const viewLabels={overview:'Overview',explore:'Explore',trends:'Trends',intelligence:'Intelligence',ask:'Ask TradePulse'};

function currentFY(){return state.index.fiscalYears.find(x=>x.id===state.fyId)}
function currentRelease(){return currentFY()?.releases.find(x=>x.id===state.releaseId)}
function setLoading(){root.innerHTML=document.getElementById('loading-template').innerHTML}
function routeFromHash(){const v=location.hash.replace('#','').split('?')[0];return viewLabels[v]?v:'overview'}
function updateActiveNav(){document.querySelectorAll('[data-nav]').forEach(a=>a.classList.toggle('active',a.dataset.nav===state.view))}
function updateMethodPeriod(summary){
  const el=document.getElementById('method-period');
  if(el) el.textContent=`${summary.release} · FY ${summary.fiscalYear}`;
  const c=summary.cumulative||{};
  const set=(id,value)=>{const node=document.getElementById(id);if(node)node.textContent=value};
  set('ticker-period',`${summary.release} · FY ${summary.fiscalYear}`);
  set('ticker-imports',money(c.imports_b));
  set('ticker-exports',money(c.exports_b));
  set('ticker-deficit',money(c.deficit_b));
  set('ticker-ratio',ratio(c.ratio));
}

function renderDelta(value,{pressure=false,label='YoY'}={}){
  const cls=deltaClass(value,pressure);
  return `<span class="delta ${cls}">${signed(value)}</span><span>${label}</span>`;
}
function kpi(label,value,deltaHtml,foot=''){
  return `<article class="kpi-card"><div><div class="kpi-label">${esc(label)}</div><div class="kpi-value">${value}</div></div><div class="kpi-foot">${deltaHtml||''}${foot?`<span>${esc(foot)}</span>`:''}</div></article>`;
}
function pageHead(eyebrow,title,subtitle,summary,extra=''){
  return `<div class="page-head"><div><span class="eyebrow">${esc(eyebrow)}</span><h1>${title}</h1><p>${subtitle}</p></div><div class="page-meta"><span class="meta-chip"><strong>${esc(summary.release)}</strong> · FY ${esc(summary.fiscalYear)}</span><span class="meta-chip">Updated ${esc(summary.updated)}</span>${extra}</div></div>`;
}
function sliceTrends(trends,summary){
  const count=Math.max(1,Number(summary.releaseOrder||1));
  return {
    labels:trends.periods.slice(0,count),
    cumulative:Object.fromEntries(Object.entries(trends.cumulative).map(([k,v])=>[k,v.slice(0,count)])),
    monthly:Object.fromEntries(Object.entries(trends.monthly).map(([k,v])=>[k,v.slice(0,count)])),
    prior:Object.fromEntries(Object.entries(trends.priorYearCumulative).map(([k,v])=>[k,v.slice(0,count)])),
  }
}

async function renderOverview(){
  setLoading();
  const data=await loadOverviewData(state.fyId,state.releaseId); state.context=data; updateMethodPeriod(data.summary);
  const {summary,products,countries,routes,signals,trends}=data; const c=summary.cumulative;
  const sliced=sliceTrends(trends,summary); const mode=state.overviewChartMode; const chartData=sliced[mode];
  const monthlyFoot=summary.monthly?.mom && summary.releaseOrder>1 ? `${signed(summary.monthly.mom.imports)} vs prior month` : `Share ${pct(c.import_share,1)}`;
  const topCountries=[...countries].sort((a,b)=>(b.imports_b+b.exports_b)-(a.imports_b+a.exports_b)).slice(0,3);
  const topRoutes=[...routes].sort((a,b)=>(b.imports_b+b.exports_b)-(a.imports_b+a.exports_b)).slice(0,3);
  root.innerHTML=`
    ${pageHead('Nepal Trade Pulse','Nepal trade, made legible.','Imports, exports, products, partner countries and customs routes — built from Department of Customs releases.',summary,`<a class="meta-chip" href="${summary.reportUrl}" target="_blank" rel="noopener">Open report ↗</a>`)}
    <section class="kpi-grid">
      ${kpi('Total imports',money(c.imports_b),renderDelta(c.yoy.imports),monthlyFoot)}
      ${kpi('Total exports',money(c.exports_b),renderDelta(c.yoy.exports),summary.monthly?.mom&&summary.releaseOrder>1?`${signed(summary.monthly.mom.exports)} vs prior month`:`Share ${pct(c.export_share,1)}`)}
      ${kpi('Trade deficit',money(c.deficit_b),renderDelta(c.yoy.deficit,{pressure:true}),summary.monthly?.mom&&summary.releaseOrder>1?`${signed(summary.monthly.mom.deficit)} vs prior month`:'' )}
      ${kpi('Import / export',ratio(c.ratio),renderDelta(c.yoy.ratio||0),`Imports are ${pct(c.import_share,1)} of trade`)}
    </section>
    <section class="overview-grid">
      <article class="panel chart-panel">
        <div class="panel-head"><div><div class="panel-title">Trade movement</div><div class="panel-subtitle">${mode==='monthly'?'Single-month values derived from cumulative releases':'Official cumulative fiscal-year values'} · Rs billion</div></div><div class="chart-toolbar"><button class="seg-btn ${mode==='monthly'?'active':''}" data-overview-chart="monthly">Monthly</button><button class="seg-btn ${mode==='cumulative'?'active':''}" data-overview-chart="cumulative">Cumulative</button></div></div>
        <div class="panel-body" id="overview-chart">${lineChart({labels:sliced.labels,series:[{key:'import',label:'Imports',values:chartData.imports},{key:'export',label:'Exports',values:chartData.exports},{key:'deficit',label:'Deficit',values:chartData.deficit}]})}</div>
      </article>
      <article class="panel">
        <div class="panel-head"><div><div class="panel-title">What changed</div><div class="panel-subtitle">Clear signals, with evidence behind each one.</div></div><a class="text-link" href="#intelligence">All signals →</a></div>
        <div class="panel-body"><div class="signal-list">${signals.slice(0,3).map((s,i)=>`<div class="signal-mini" data-signal-index="${i}"><div class="signal-top"><span class="eyebrow">${esc(s.eyebrow)}</span><span class="signal-metric">${esc(s.metric)}</span></div><h3>${esc(s.title)}</h3><p>${esc(truncate(s.detail,120))}</p></div>`).join('')}</div></div>
      </article>
    </section>
    <section class="section-grid">
      <article class="panel list-panel"><div class="panel-head"><div><div class="panel-title">Leading imports</div><div class="panel-subtitle">Largest product lines in the selected release.</div></div><a class="text-link" href="#explore" data-explore-jump="products-imports">Explore all →</a></div><div class="panel-body"><ol class="rank-list">${products.imports.slice(0,6).map((x,i)=>rankRow(x,i,'import')).join('')}</ol></div></article>
      <article class="panel list-panel"><div class="panel-head"><div><div class="panel-title">Leading exports</div><div class="panel-subtitle">Largest export product lines in the selected release.</div></div><a class="text-link" href="#explore" data-explore-jump="products-exports">Explore all →</a></div><div class="panel-body"><ol class="rank-list">${products.exports.slice(0,6).map((x,i)=>rankRow(x,i,'export')).join('')}</ol></div></article>
    </section>
    <section class="section-grid">
      <article class="panel"><div class="panel-head"><div><div class="panel-title">Partner concentration</div><div class="panel-subtitle">Largest partners by total merchandise trade.</div></div></div><div class="panel-body"><div class="stat-strip">${topCountries.map(x=>`<div class="stat-box"><span>${esc(x.country)}</span><strong>${money(x.imports_b+x.exports_b)}</strong><small>Imports ${pct(x.import_share_pct)} · Exports ${pct(x.export_share_pct)}</small></div>`).join('')}</div></div></article>
      <article class="panel"><div class="panel-head"><div><div class="panel-title">Customs concentration</div><div class="panel-subtitle">Largest routes by import + export value.</div></div></div><div class="panel-body"><div class="stat-strip">${topRoutes.map(x=>`<div class="stat-box"><span>${esc(x.office)}</span><strong>${money(x.imports_b+x.exports_b)}</strong><small>Import share ${pct(x.import_share_pct)}</small></div>`).join('')}</div></div></article>
    </section>`;

  document.querySelectorAll('[data-overview-chart]').forEach(btn=>btn.addEventListener('click',()=>{state.overviewChartMode=btn.dataset.overviewChart;renderOverview()}));
  document.querySelectorAll('[data-signal-index]').forEach(el=>el.addEventListener('click',()=>openSignalDrawer(signals[Number(el.dataset.signalIndex)])));
  document.querySelectorAll('.rank-row[data-direction]').forEach(el=>el.addEventListener('click',()=>openProductFromContext(el.dataset.direction,Number(el.dataset.index),products)));
  document.querySelectorAll('[data-explore-jump]').forEach(a=>a.addEventListener('click',()=>{const [_,dir]=a.dataset.exploreJump.split('-');state.exploreMode='products';state.exploreDirection=dir;state.explorePage=1;}));
}

function rankRow(x,i,direction){
  return `<li class="rank-row" data-direction="${direction}" data-index="${i}"><span class="rank-num">${String(i+1).padStart(2,'0')}</span><div><div class="rank-name">${esc(x.name)}</div><div class="rank-meta">HS ${esc(x.hs)} · ${pct(x.share_pct)} share</div></div><div><div class="rank-value">${money(x.value_b)}</div><div class="rank-share">${direction==='import'?'import':'export'} value</div></div></li>`
}

async function renderExplore(){
  setLoading();
  const summary=await (await loadOverviewData(state.fyId,state.releaseId)).summary; updateMethodPeriod(summary);
  const mode=state.exploreMode; const data=await loadExploreData(state.fyId,state.releaseId,mode);
  let direction=state.exploreDirection;
  let rows=[];
  if(mode==='products') rows=[...(data[direction]||[])]; else rows=[...data];
  const q=state.exploreSearch.trim().toLowerCase();
  if(q){
    rows=rows.filter(x=>{
      if(mode==='products') return x.name.toLowerCase().includes(q)||x.hs.includes(q);
      if(mode==='countries') return x.country.toLowerCase().includes(q);
      if(mode==='routes') return x.office.toLowerCase().includes(q);
      if(mode==='sectors') return x.name.toLowerCase().includes(q)||x.chapter.includes(q);
      return true;
    });
  }
  const sort=state.exploreSort;
  rows.sort((a,b)=>{
    if(mode==='products'){
      if(sort==='share') return b.share_pct-a.share_pct;
      if(sort==='hs') return String(a.hs).localeCompare(String(b.hs));
      return b.value_b-a.value_b;
    }
    if(mode==='countries'){
      if(sort==='exports') return b.exports_b-a.exports_b;
      if(sort==='balance') return b.balance_b-a.balance_b;
      if(sort==='imports') return b.imports_b-a.imports_b;
      return (b.imports_b+b.exports_b)-(a.imports_b+a.exports_b);
    }
    if(mode==='routes'){
      if(sort==='exports') return b.exports_b-a.exports_b;
      if(sort==='share') return b.import_share_pct-a.import_share_pct;
      return b.imports_b-a.imports_b;
    }
    if(mode==='sectors'){
      if(sort==='exports') return b.exports_b-a.exports_b;
      if(sort==='balance') return b.balance_b-a.balance_b;
      return b.imports_b-a.imports_b;
    }
    return 0;
  });
  state.exploreRows=rows;
  const pageSize=25,totalPages=Math.max(1,Math.ceil(rows.length/pageSize)); state.explorePage=Math.min(state.explorePage,totalPages);
  const start=(state.explorePage-1)*pageSize,pageRows=rows.slice(start,start+pageSize);
  const modeLabel={products:'Products',countries:'Countries',routes:'Customs routes',sectors:'HS sectors'}[mode];
  root.innerHTML=`${pageHead('Explore',`Explore ${modeLabel.toLowerCase()}.`,`Search and rank the selected Customs release without wading through a spreadsheet.`,summary)}
  <section class="explore-shell">
    <aside class="explore-side">
      ${exploreSideButton('products','Products')}${exploreSideButton('countries','Countries')}${exploreSideButton('routes','Customs routes')}${exploreSideButton('sectors','HS sectors')}
    </aside>
    <div class="explore-main">
      <div class="toolbar">
        <div class="search-box"><input id="explore-search" value="${esc(state.exploreSearch)}" placeholder="${mode==='products'?'Search product or HS code…':'Search '+modeLabel.toLowerCase()+'…'}" /></div>
        <div class="filter-group">
          ${mode==='products'?`<select id="direction-select" class="filter-select"><option value="imports" ${direction==='imports'?'selected':''}>Imports</option><option value="exports" ${direction==='exports'?'selected':''}>Exports</option></select>`:''}
          <select id="sort-select" class="filter-select">${sortOptions(mode,sort)}</select>
        </div>
      </div>
      <div class="data-table-wrap">
        ${renderExploreTable(mode,pageRows,start)}
        <div class="table-footer"><span>${rows.length.toLocaleString()} results · showing ${rows.length?start+1:0}–${Math.min(start+pageSize,rows.length)}</span><div class="pagination"><button id="prev-page" ${state.explorePage<=1?'disabled':''}>Previous</button><button id="next-page" ${state.explorePage>=totalPages?'disabled':''}>Next</button></div></div>
      </div>
    </div>
  </section>`;
  document.querySelectorAll('[data-explore-mode]').forEach(b=>b.addEventListener('click',()=>{state.exploreMode=b.dataset.exploreMode;state.explorePage=1;state.exploreSearch='';state.exploreSort='value';renderExplore()}));
  document.getElementById('explore-search').addEventListener('input',e=>{state.exploreSearch=e.target.value;state.explorePage=1;debounceRenderExplore()});
  const ds=document.getElementById('direction-select');if(ds)ds.addEventListener('change',e=>{state.exploreDirection=e.target.value;state.explorePage=1;renderExplore()});
  document.getElementById('sort-select').addEventListener('change',e=>{state.exploreSort=e.target.value;state.explorePage=1;renderExplore()});
  document.getElementById('prev-page').addEventListener('click',()=>{state.explorePage--;renderExplore()}); document.getElementById('next-page').addEventListener('click',()=>{state.explorePage++;renderExplore()});
  document.querySelectorAll('[data-row-index]').forEach(tr=>tr.addEventListener('click',()=>openExploreDetail(mode,rows[Number(tr.dataset.rowIndex)],direction)));
}
let exploreTimer; function debounceRenderExplore(){clearTimeout(exploreTimer);exploreTimer=setTimeout(renderExplore,180)}
function exploreSideButton(id,label){return `<button data-explore-mode="${id}" class="${state.exploreMode===id?'active':''}"><span>${label}</span><span>›</span></button>`}
function sortOptions(mode,sort){
  const opts=mode==='products'?[['value','Largest value'],['share','Largest share'],['hs','HS code']]:mode==='countries'?[['value','Largest total trade'],['imports','Largest imports'],['exports','Largest exports'],['balance','Trade balance']]:mode==='routes'?[['imports','Largest imports'],['exports','Largest exports'],['share','Import share']]:[['imports','Largest imports'],['exports','Largest exports'],['balance','Trade balance']];
  return opts.map(([v,l])=>`<option value="${v}" ${sort===v?'selected':''}>${l}</option>`).join('')
}
function renderExploreTable(mode,rows,start){
  if(!rows.length)return `<div class="empty-state"><strong>No matching records</strong><p>Try a broader search.</p></div>`;
  if(mode==='products')return `<table class="data-table"><thead><tr><th>#</th><th>Product</th><th>HS code</th><th class="num">Value</th><th class="num">Share</th></tr></thead><tbody>${rows.map((x,i)=>`<tr data-row-index="${start+i}"><td class="table-rank">${start+i+1}</td><td><strong>${esc(truncate(x.name,92))}</strong><span class="table-sub">${esc(x.unit||'Unit not reported')}</span></td><td>${esc(x.hs)}</td><td class="num"><strong>${money(x.value_b)}</strong></td><td class="num">${pct(x.share_pct)}</td></tr>`).join('')}</tbody></table>`;
  if(mode==='countries')return `<table class="data-table"><thead><tr><th>#</th><th>Partner country</th><th class="num">Imports</th><th class="num">Exports</th><th class="num">Balance</th></tr></thead><tbody>${rows.map((x,i)=>`<tr data-row-index="${start+i}"><td class="table-rank">${start+i+1}</td><td><strong>${esc(x.country)}</strong><span class="table-sub">Import share ${pct(x.import_share_pct)} · Export share ${pct(x.export_share_pct)}</span></td><td class="num">${money(x.imports_b)}</td><td class="num">${money(x.exports_b)}</td><td class="num">${money(x.balance_b)}</td></tr>`).join('')}</tbody></table>`;
  if(mode==='routes')return `<table class="data-table"><thead><tr><th>#</th><th>Customs office</th><th class="num">Imports</th><th class="num">Exports</th><th class="num">Import share</th></tr></thead><tbody>${rows.map((x,i)=>`<tr data-row-index="${start+i}"><td class="table-rank">${start+i+1}</td><td><strong>${esc(x.office)}</strong></td><td class="num">${money(x.imports_b)}</td><td class="num">${money(x.exports_b)}</td><td class="num">${pct(x.import_share_pct)}</td></tr>`).join('')}</tbody></table>`;
  return `<table class="data-table"><thead><tr><th>#</th><th>HS chapter</th><th>Sector</th><th class="num">Imports</th><th class="num">Exports</th><th class="num">Balance</th></tr></thead><tbody>${rows.map((x,i)=>`<tr data-row-index="${start+i}"><td class="table-rank">${start+i+1}</td><td>${esc(x.chapter)}</td><td><strong>${esc(truncate(x.name,100))}</strong></td><td class="num">${money(x.imports_b)}</td><td class="num">${money(x.exports_b)}</td><td class="num">${money(x.balance_b)}</td></tr>`).join('')}</tbody></table>`;
}

async function renderTrends(){
  setLoading(); const [overview,trends]=await Promise.all([loadOverviewData(state.fyId,state.releaseId),loadTrends(state.fyId)]); const summary=overview.summary; updateMethodPeriod(summary);
  const sliced=sliceTrends(trends,summary); const mode=state.trendMode; const d=sliced[mode]; const m=summary.monthly; const mom=m?.mom;
  root.innerHTML=`${pageHead('Trends','Follow the release, month by month.','Switch between official cumulative values and TradePulse-derived single-month movement.',summary)}
  <div class="trend-controls"><div class="control-card"><button data-trend-mode="monthly" class="${mode==='monthly'?'active':''}">Monthly movement</button><button data-trend-mode="cumulative" class="${mode==='cumulative'?'active':''}">Cumulative</button></div><span class="meta-chip">Rs billion · ${sliced.labels.length} release${sliced.labels.length===1?'':'s'}</span></div>
  ${summary.releaseOrder>1&&mom?`<section class="kpi-grid">${kpi(`${summary.release} imports`,money(m.imports_b),renderDelta(mom.imports,{label:'MoM'}))}${kpi(`${summary.release} exports`,money(m.exports_b),renderDelta(mom.exports,{label:'MoM'}))}${kpi(`${summary.release} deficit`,money(m.deficit_b),renderDelta(mom.deficit,{pressure:true,label:'MoM'}))}${kpi(`${summary.release} total trade`,money(m.total_trade_b),renderDelta(mom.total_trade,{label:'MoM'}))}</section>`:''}
  <section class="trend-layout">
    <article class="panel chart-panel"><div class="panel-head"><div><div class="panel-title">${mode==='monthly'?'Single-month trade movement':'Cumulative fiscal-year trade'}</div><div class="panel-subtitle">Imports, exports and trade deficit</div></div></div><div class="panel-body">${lineChart({labels:sliced.labels,series:[{key:'import',label:'Imports',values:d.imports},{key:'export',label:'Exports',values:d.exports},{key:'deficit',label:'Deficit',values:d.deficit}],height:310})}</div></article>
    <article class="panel"><div class="panel-head"><div><div class="panel-title">Release table</div><div class="panel-subtitle">${mode==='monthly'?'Derived month values':'Official cumulative values'}</div></div></div><div class="panel-body"><table class="trend-table">${sliced.labels.map((label,i)=>`<tr><td><strong>${esc(label)}</strong><br><span>Imports</span></td><td>${money(d.imports[i])}</td></tr><tr><td><span>Exports</span></td><td>${money(d.exports[i])}</td></tr><tr><td><span>Deficit</span></td><td>${money(d.deficit[i])}</td></tr>`).join('')}</table></div></article>
  </section>
  <section class="section-grid"><article class="panel"><div class="panel-head"><div><div class="panel-title">How to read this</div><div class="panel-subtitle">Cumulative release logic</div></div></div><div class="panel-body"><p class="detail-copy">The Department of Customs workbook grows through the fiscal year. TradePulse keeps that official cumulative series intact. The “Monthly movement” view subtracts the previous cumulative release so Shrawan and Bhadra can be compared as individual months.</p></div></article><article class="panel"><div class="panel-head"><div><div class="panel-title">Comparable prior year</div><div class="panel-subtitle">Cumulative values for the same release window</div></div></div><div class="panel-body">${horizontalBars(sliced.labels.map((l,i)=>({label:`${l} imports · prior FY`,value:sliced.prior.imports[i]})),{format:v=>money(v)})}</div></article></section>`;
  document.querySelectorAll('[data-trend-mode]').forEach(b=>b.addEventListener('click',()=>{state.trendMode=b.dataset.trendMode;renderTrends()}));
}

async function renderIntelligence(){
  setLoading(); const [summary,signals]=await Promise.all([(await loadOverviewData(state.fyId,state.releaseId)).summary,loadSignals(state.fyId,state.releaseId)]); updateMethodPeriod(summary);
  const high=signals.filter(x=>x.severity==='high').length, medium=signals.filter(x=>x.severity==='medium').length;
  root.innerHTML=`<section class="intel-hero"><div><span class="eyebrow">TradePulse Intelligence</span><h1>Signals worth investigating.</h1><p>These are transparent descriptive signals calculated from the selected Customs release. They point to concentration, route changes and unusual movement — not forecasts.</p></div><div class="intel-summary"><div><span>Release</span><strong>${esc(summary.release)}</strong></div><div><span>High signals</span><strong>${high}</strong></div><div><span>Watch</span><strong>${medium}</strong></div></div></section>
  <section class="signal-grid">${signals.map((s,i)=>`<article class="signal-card"><div class="signal-card-head"><span class="eyebrow">${esc(s.eyebrow)}</span><span class="severity ${esc(s.severity)}">${esc(s.severity)}</span></div><h2>${esc(s.title)}</h2><p>${esc(s.detail)}</p><div class="signal-number">${esc(s.metric)}</div>${s.evidence?.length?`<div class="evidence-row">${s.evidence.map(x=>`<span class="evidence-chip">${esc(x)}</span>`).join('')}</div>`:''}<button class="text-link" style="margin-top:14px;text-align:left" data-intel-index="${i}">View evidence →</button></article>`).join('')}</section>`;
  document.querySelectorAll('[data-intel-index]').forEach(b=>b.addEventListener('click',()=>openSignalDrawer(signals[Number(b.dataset.intelIndex)])));
}

async function renderAsk(){
  setLoading(); const ctx=await loadOverviewData(state.fyId,state.releaseId); state.context=ctx; updateMethodPeriod(ctx.summary);
  if(!state.askHistory.length) state.askHistory=[{role:'assistant',text:`Ask me about ${ctx.summary.release} trade data — products, countries, customs routes, the trade deficit, or what changed.`}];
  const suggestions=suggestedQuestions(ctx.summary);
  root.innerHTML=`${pageHead('Ask TradePulse','Ask TradePulse.','Direct answers grounded in the selected Customs release.',ctx.summary)}
  <section class="ask-shell"><article class="panel chat-panel"><div class="chat-header"><div><h2>TradePulse Analyst</h2><p>Rule-based · grounded in the selected release</p></div><span class="chat-status"><i></i> Ready</span></div><div class="chat-messages" id="chat-messages">${state.askHistory.map(m=>`<div class="message ${m.role}"><div class="message-meta">${m.role==='assistant'?'TradePulse':'You'}</div>${esc(m.text)}</div>`).join('')}</div><form class="chat-composer" id="ask-form"><div class="composer-row"><textarea id="ask-input" rows="1" placeholder="Ask about a product, country, route or trade movement…"></textarea><button class="ask-button" type="submit">Ask</button></div></form></article><aside class="panel suggestion-box"><h3>Try these</h3><p>Good questions for the current release.</p><div class="suggestion-list">${suggestions.map(q=>`<button class="suggestion" data-question="${esc(q)}">${esc(q)}</button>`).join('')}</div><div class="ask-note">This version is intentionally deterministic. It answers from TradePulse's processed data and avoids inventing explanations that are not in the dataset.</div></aside></section>`;
  document.getElementById('ask-form').addEventListener('submit',e=>{e.preventDefault();const input=document.getElementById('ask-input');const q=input.value.trim();if(!q)return;state.askHistory.push({role:'user',text:q});state.askHistory.push({role:'assistant',text:answerQuestion(q,ctx)});renderAsk()});
  document.querySelectorAll('[data-question]').forEach(b=>b.addEventListener('click',()=>{const q=b.dataset.question;state.askHistory.push({role:'user',text:q});state.askHistory.push({role:'assistant',text:answerQuestion(q,ctx)});renderAsk()}));
  setTimeout(()=>{const el=document.getElementById('chat-messages');if(el)el.scrollTop=el.scrollHeight},0)
}

async function renderCurrent(){
  state.view=routeFromHash(); updateActiveNav(); document.title=`${viewLabels[state.view]} | TradePulse Nepal`;
  try{
    if(state.view==='overview') await renderOverview();
    else if(state.view==='explore') await renderExplore();
    else if(state.view==='trends') await renderTrends();
    else if(state.view==='intelligence') await renderIntelligence();
    else if(state.view==='ask') await renderAsk();
  }catch(err){console.error(err);root.innerHTML=`<div class="empty-state"><strong>Could not load this view.</strong><p>${esc(err.message||'Unknown error')}</p></div>`}
}

function openDrawer(eyebrow,title,body){drawerEyebrow.textContent=eyebrow;drawerTitle.textContent=title;drawerBody.innerHTML=body;drawer.classList.add('open');drawer.setAttribute('aria-hidden','false');backdrop.hidden=false;document.body.style.overflow='hidden'}
function closeDrawer(){drawer.classList.remove('open');drawer.setAttribute('aria-hidden','true');backdrop.hidden=true;document.body.style.overflow=''}
function openSignalDrawer(s){openDrawer(s.eyebrow,s.title,`<div class="detail-kpis"><div class="detail-kpi"><span>Signal</span><strong>${esc(s.metric)}</strong></div><div class="detail-kpi"><span>Level</span><strong>${esc(s.severity)}</strong></div></div><div class="detail-section"><h3>What the data shows</h3><p class="detail-copy">${esc(s.detail)}</p></div>${s.evidence?.length?`<div class="detail-section"><h3>Evidence</h3><div class="partner-list">${s.evidence.map(x=>`<div class="partner-row"><strong>${esc(x)}</strong></div>`).join('')}</div></div>`:''}<div class="detail-section"><p class="detail-copy">TradePulse treats this as a descriptive signal. External events or causes should be verified separately.</p>${s.link?`<a class="text-link" href="${s.link}" target="_blank" rel="noopener">Open related report ↗</a>`:''}</div>`)}
function openProductFromContext(direction,index,products){const rows=products[direction==='import'?'imports':'exports'];openProductDrawer(rows[index],direction)}
async function openProductDrawer(x,direction){
  openDrawer(`${direction==='import'?'Import':'Export'} product · HS ${x.hs}`,x.name,`<div class="detail-kpis"><div class="detail-kpi"><span>Value</span><strong>${money(x.value_b)}</strong></div><div class="detail-kpi"><span>Share</span><strong>${pct(x.share_pct)}</strong></div><div class="detail-kpi"><span>Rank</span><strong>#${x.rank}</strong></div><div class="detail-kpi"><span>Quantity</span><strong>${compact(x.quantity)} ${esc(x.unit||'')}</strong></div></div><div class="detail-section"><h3>Partner countries</h3><p class="detail-copy">Loading partner detail…</p></div>`);
  try{
    const rows=await loadProductPartners(state.fyId,state.releaseId,direction); const partners=rows.filter(r=>r.hs===x.hs).sort((a,b)=>b.value_b-a.value_b); const total=partners.reduce((s,r)=>s+r.value_b,0)||x.value_b||1;
    drawerBody.querySelector('.detail-section').innerHTML=`<h3>Partner countries</h3>${partners.length?`<div class="partner-list">${partners.slice(0,12).map(p=>`<div class="partner-row"><div><strong>${esc(p.country)}</strong><div class="share-track"><div class="share-fill" style="width:${Math.max(1,p.value_b/total*100)}%"></div></div></div><div class="partner-value">${money(p.value_b)}<br><span>${pct(p.value_b/total*100)}</span></div></div>`).join('')}</div>`:`<p class="detail-copy">No partner rows were found for this product.</p>`}`;
  }catch(e){drawerBody.querySelector('.detail-section').innerHTML=`<h3>Partner countries</h3><p class="detail-copy">Partner detail could not be loaded.</p>`}
}
async function openExploreDetail(mode,x,direction){
  if(mode==='products') return openProductDrawer(x,direction==='imports'?'import':'export');
  if(mode==='countries'){
    openDrawer('Partner country',x.country,`<div class="detail-kpis"><div class="detail-kpi"><span>Imports</span><strong>${money(x.imports_b)}</strong></div><div class="detail-kpi"><span>Exports</span><strong>${money(x.exports_b)}</strong></div><div class="detail-kpi"><span>Import share</span><strong>${pct(x.import_share_pct)}</strong></div><div class="detail-kpi"><span>Export share</span><strong>${pct(x.export_share_pct)}</strong></div></div><div class="detail-section"><h3>Trade balance</h3><p class="detail-copy">The merchandise trade balance with ${esc(x.country)} is ${money(x.balance_b)} in the selected release.</p></div><div class="detail-section" id="country-products"><h3>Leading products</h3><p class="detail-copy">Loading product detail…</p></div>`);
    try{const [im,ex]=await Promise.all([loadProductPartners(state.fyId,state.releaseId,'import'),loadProductPartners(state.fyId,state.releaseId,'export')]); const aggregate=(rows)=>{const m=new Map();rows.filter(r=>r.country===x.country).forEach(r=>m.set(r.name,(m.get(r.name)||0)+r.value_b));return [...m.entries()].map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value).slice(0,6)};const ir=aggregate(im),er=aggregate(ex);const target=document.getElementById('country-products');if(target)target.innerHTML=`<h3>Leading products</h3><p class="detail-copy"><strong>Imports:</strong> ${ir.map(z=>`${esc(z.name)} (${money(z.value)})`).join(' · ')||'None'}</p><p class="detail-copy"><strong>Exports:</strong> ${er.map(z=>`${esc(z.name)} (${money(z.value)})`).join(' · ')||'None'}</p>`}catch(e){}
    return;
  }
  if(mode==='routes')return openDrawer('Customs route',x.office,`<div class="detail-kpis"><div class="detail-kpi"><span>Imports</span><strong>${money(x.imports_b)}</strong></div><div class="detail-kpi"><span>Exports</span><strong>${money(x.exports_b)}</strong></div><div class="detail-kpi"><span>Import share</span><strong>${pct(x.import_share_pct)}</strong></div><div class="detail-kpi"><span>Export share</span><strong>${pct(x.export_share_pct)}</strong></div></div><div class="detail-section"><p class="detail-copy">This view shows the value cleared through the selected Customs office in the release. Product-by-route detail is not included in the current public source tables used by TradePulse.</p></div>`);
  return openDrawer(`HS chapter ${x.chapter}`,x.name,`<div class="detail-kpis"><div class="detail-kpi"><span>Imports</span><strong>${money(x.imports_b)}</strong></div><div class="detail-kpi"><span>Exports</span><strong>${money(x.exports_b)}</strong></div><div class="detail-kpi"><span>Balance</span><strong>${money(x.balance_b)}</strong></div><div class="detail-kpi"><span>Import revenue</span><strong>Rs ${num(x.revenue_000/1_000_000,2)}B</strong></div></div>`)
}

function populateSelectors(){
  fySelect.innerHTML=state.index.fiscalYears.map(x=>`<option value="${x.id}" ${x.id===state.fyId?'selected':''}>${esc(x.label)}</option>`).join('');
  const fy=currentFY();releaseSelect.innerHTML=fy.releases.map(x=>`<option value="${x.id}" ${x.id===state.releaseId?'selected':''}>${esc(x.label)}</option>`).join('');
}

async function init(){
  state.index=await loadReleaseIndex(); const defaultFY=state.index.fiscalYears.find(x=>x.label===state.index.defaultFiscalYear)||state.index.fiscalYears[0];state.fyId=defaultFY.id; const defaultRel=defaultFY.releases.find(x=>x.label===state.index.defaultRelease)||defaultFY.releases[defaultFY.releases.length-1];state.releaseId=defaultRel.id; populateSelectors(); state.view=routeFromHash();
  fySelect.addEventListener('change',()=>{state.fyId=fySelect.value;const fy=currentFY();state.releaseId=fy.releases[fy.releases.length-1].id;state.askHistory=[];populateSelectors();renderCurrent()});
  releaseSelect.addEventListener('change',()=>{state.releaseId=releaseSelect.value;state.askHistory=[];state.explorePage=1;renderCurrent()});
  window.addEventListener('hashchange',renderCurrent);
  document.getElementById('drawer-close').addEventListener('click',closeDrawer);backdrop.addEventListener('click',closeDrawer);document.addEventListener('keydown',e=>{if(e.key==='Escape')closeDrawer()});
  document.getElementById('open-methodology').addEventListener('click',()=>methodDialog.showModal());document.getElementById('close-methodology').addEventListener('click',()=>methodDialog.close());
  await renderCurrent();
}
init();
