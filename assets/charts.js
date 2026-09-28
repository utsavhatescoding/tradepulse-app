import {num} from './format.js';

function niceMax(v){
  if(v<=0) return 1;
  const exp=Math.pow(10,Math.floor(Math.log10(v)));
  const n=v/exp;
  const nice=n<=1?1:n<=2?2:n<=5?5:10;
  return nice*exp;
}

export function lineChart({labels,series,height=280}){
  const width=900, pad={l:54,r:18,t:18,b:38};
  const vals=series.flatMap(s=>s.values.filter(Number.isFinite));
  const ymax=niceMax(Math.max(...vals,1)*1.05);
  const x=i=> labels.length===1 ? (pad.l+(width-pad.l-pad.r)/2) : pad.l+i*(width-pad.l-pad.r)/(labels.length-1);
  const y=v=>pad.t+(height-pad.t-pad.b)*(1-v/ymax);
  const ticks=4;
  const grid=Array.from({length:ticks+1},(_,i)=>{
    const val=ymax*(ticks-i)/ticks; const yy=pad.t+(height-pad.t-pad.b)*i/ticks;
    return `<line class="chart-grid-line" x1="${pad.l}" y1="${yy}" x2="${width-pad.r}" y2="${yy}"/><text class="chart-axis-label" x="${pad.l-10}" y="${yy+3}" text-anchor="end">${num(val,0)}</text>`;
  }).join('');
  const xlabels=labels.map((l,i)=>`<text class="chart-axis-label" x="${x(i)}" y="${height-12}" text-anchor="middle">${l}</text>`).join('');
  const lines=series.map(s=>{
    const path=s.values.map((v,i)=>`${i?'L':'M'} ${x(i)} ${y(v)}`).join(' ');
    const pts=s.values.map((v,i)=>`<circle class="chart-point ${s.key}" cx="${x(i)}" cy="${y(v)}" r="5"><title>${s.label} · ${labels[i]}: Rs ${num(v,2)}B</title></circle>`).join('');
    return `<path class="chart-line-${s.key}" d="${path}"/>${pts}`;
  }).join('');
  return `<div class="chart-wrap"><svg class="chart-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Trade trend chart">${grid}${xlabels}${lines}</svg></div><div class="chart-legend">${series.map(s=>`<span><i class="legend-dot ${s.key}"></i>${s.label}</span>`).join('')}</div>`;
}

export function horizontalBars(items,{labelKey='label',valueKey='value',maxItems=8,format=v=>v.toFixed(2)}={}){
  const use=items.slice(0,maxItems); const max=Math.max(...use.map(x=>Number(x[valueKey]||0)),1);
  return `<div class="bar-list">${use.map((x,i)=>{
    const w=Math.max(2,Number(x[valueKey]||0)/max*100);
    return `<div class="bar-item"><div class="bar-label"><span>${i+1}. ${x[labelKey]}</span><strong>${format(x[valueKey])}</strong></div><div class="bar-track"><div class="bar-fill" style="width:${w}%"></div></div></div>`;
  }).join('')}</div>`;
}
