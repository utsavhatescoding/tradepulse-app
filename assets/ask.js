import {money,pct,ratio,esc} from './format.js';

function findCountry(countries,name){
  const q=name.toLowerCase();
  return countries.find(x=>x.country.toLowerCase()===q) || countries.find(x=>x.country.toLowerCase().includes(q));
}

function findRoute(routes,name){
  const q=name.toLowerCase();
  return routes.find(x=>x.office.toLowerCase()===q) || routes.find(x=>x.office.toLowerCase().includes(q));
}

function topRows(rows,n=5){return rows.slice(0,n)}

export function suggestedQuestions(summary){
  return [
    `What changed in ${summary.release}?`,
    'What are Nepal\'s top imports?',
    'What are Nepal\'s top exports?',
    'How dependent are exports on India?',
    'What happened to Rasuwa and Mustang?',
    'What is the trade deficit?'
  ];
}

export function answerQuestion(question,ctx){
  const q=question.trim().toLowerCase();
  const {summary,products,countries,routes,signals}=ctx;
  const c=summary.cumulative;
  if(!q) return 'Ask me about products, partner countries, customs routes, the trade deficit, or what changed in the latest release.';

  if(q.includes('what changed') || q.includes('latest month') || q.includes('bhadra')){
    if(summary.release.toLowerCase()==='bhadra'){
      const m=summary.monthly;
      return `Bhadra was more import-heavy than Shrawan. Imports were ${money(m.imports_b)} for the month, while exports were ${money(m.exports_b)}. That pushed the Bhadra-only trade deficit to ${money(m.deficit_b)}. The sharpest route signal was a fall in Rasuwa alongside a large rise through Mustang.`;
    }
    return `${summary.release} recorded ${money(c.imports_b)} of imports and ${money(c.exports_b)} of exports, leaving a trade deficit of ${money(c.deficit_b)}. The strongest export concentration is in ${products.exports[0]?.name || 'the leading export product'}.`;
  }

  if(q.includes('top import') || q.includes('importing most') || q.includes('largest import')){
    const rows=topRows(products.imports,5);
    return `The five largest import product lines in ${summary.release} are ${rows.map((x,i)=>`${i+1}) ${x.name} (${money(x.value_b)})`).join(', ')}.`;
  }

  if(q.includes('top export') || q.includes('exporting most') || q.includes('largest export')){
    const rows=topRows(products.exports,5);
    return `The five largest export product lines in ${summary.release} are ${rows.map((x,i)=>`${i+1}) ${x.name} (${money(x.value_b)})`).join(', ')}. The top item alone accounts for about ${pct(rows[0]?.share_pct || 0)} of exports.`;
  }

  if(q.includes('deficit') || q.includes('trade gap')){
    return `Nepal's merchandise trade deficit through ${summary.release} is ${money(c.deficit_b)}. Imports are ${money(c.imports_b)} versus ${money(c.exports_b)} of exports, an import/export ratio of ${ratio(c.ratio)}. The deficit is ${pct(c.yoy.deficit)} above the comparable period last year.`;
  }

  if(q.includes('india')){
    const x=findCountry(countries,'India');
    if(x) return `India accounts for about ${pct(x.import_share_pct)} of Nepal's imports and ${pct(x.export_share_pct)} of exports in the selected release. Trade with India is ${money(x.imports_b)} of imports and ${money(x.exports_b)} of exports.`;
  }

  if(q.includes('china')){
    const x=findCountry(countries,'China');
    if(x) return `China supplied ${money(x.imports_b)} of imports in the selected release, while Nepal exported ${money(x.exports_b)} to China. That leaves a bilateral merchandise balance of ${money(x.balance_b)}.`;
  }

  if(q.includes('rasuwa') || q.includes('mustang') || q.includes('route')){
    if(summary.release.toLowerCase()==='bhadra'){
      return `The standout route movement is between Rasuwa and Mustang. Bhadra-only imports through Rasuwa fell from about Rs 5.68B in Shrawan to Rs 2.24B, while Mustang rose from about Rs 0.59B to Rs 7.74B. The Customs data shows the route shift; it does not, by itself, establish the cause.`;
    }
    const top=routes[0];
    return `The leading customs route in ${summary.release} is ${top.office}, handling ${money(top.imports_b)} of imports and ${money(top.exports_b)} of exports.`;
  }

  if(q.includes('country') || q.includes('partner')){
    const topImp=[...countries].sort((a,b)=>b.imports_b-a.imports_b).slice(0,5);
    const topExp=[...countries].sort((a,b)=>b.exports_b-a.exports_b).slice(0,5);
    return `Top import partners are ${topImp.map(x=>`${x.country} (${money(x.imports_b)})`).join(', ')}. Top export destinations are ${topExp.map(x=>`${x.country} (${money(x.exports_b)})`).join(', ')}.`;
  }

  for(const x of countries.slice(0,30)){
    if(q.includes(x.country.toLowerCase())) return `${x.country}: imports ${money(x.imports_b)}, exports ${money(x.exports_b)}, and a merchandise balance of ${money(x.balance_b)} in ${summary.release}.`;
  }
  for(const x of routes){
    if(q.includes(x.office.toLowerCase())) return `${x.office} handled ${money(x.imports_b)} of imports and ${money(x.exports_b)} of exports in ${summary.release}. Its import share was ${pct(x.import_share_pct)}.`;
  }

  if(q.includes('risk') || q.includes('vulnerab')){
    const s=signals.find(x=>x.severity==='high') || signals[0];
    return `One of the clearest concentration signals is: ${s.title}. ${s.detail} This is a descriptive data signal, not a forecast.`;
  }

  if(q.includes('opportun') || q.includes('business')){
    const imp=products.imports.slice(0,3).map(x=>x.name).join(', ');
    return `A practical way to use this release is to investigate large and fast-moving markets rather than treat them as automatic opportunities. Current high-value import lines include ${imp}. TradePulse can show the value, partner countries and route concentration behind each product.`;
  }

  return `I can answer this from the TradePulse dataset if you ask about a product, country, customs route, imports, exports, the trade deficit, or what changed in ${summary.release}. Try “top exports”, “India”, “Rasuwa”, or “trade deficit”.`;
}
