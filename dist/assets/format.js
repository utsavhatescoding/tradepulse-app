export const money = (v, digits=2) => `Rs ${Number(v||0).toLocaleString('en-US',{minimumFractionDigits:digits,maximumFractionDigits:digits})}B`;
export const num = (v,digits=2) => Number(v||0).toLocaleString('en-US',{minimumFractionDigits:digits,maximumFractionDigits:digits});
export const pct = (v,digits=1) => `${Number(v||0).toFixed(digits)}%`;
export const ratio = (v,digits=2) => `${Number(v||0).toFixed(digits)}×`;
export const compact = (v) => {
  const n=Number(v||0);
  if(Math.abs(n)>=1_000_000_000) return `${(n/1_000_000_000).toFixed(1)}B`;
  if(Math.abs(n)>=1_000_000) return `${(n/1_000_000).toFixed(1)}M`;
  if(Math.abs(n)>=1_000) return `${(n/1_000).toFixed(1)}K`;
  return n.toLocaleString('en-US',{maximumFractionDigits:2});
};
export const signed = (v,digits=1) => `${Number(v)>0?'+':''}${Number(v||0).toFixed(digits)}%`;
export const deltaClass = (v, pressure=false) => pressure ? (Number(v)>0?'pressure':'up') : (Number(v)>0?'up':Number(v)<0?'down':'neutral');
export const esc = (s='') => String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
export function truncate(s,n=84){ s=String(s||''); return s.length>n?`${s.slice(0,n-1)}…`:s; }
