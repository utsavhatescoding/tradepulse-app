const cache = new Map();

export async function loadJSON(path){
  if(cache.has(path)) return cache.get(path);
  const p = fetch(path, {cache:'no-cache'}).then(async r=>{
    if(!r.ok) throw new Error(`Failed to load ${path}: ${r.status}`);
    return r.json();
  });
  cache.set(path,p);
  return p;
}

export async function loadReleaseIndex(){
  return loadJSON('data/releases.json');
}

export function releaseBase(fyId, releaseId){
  return `data/${fyId}/${releaseId}`;
}

export async function loadSummary(fyId, releaseId){
  return loadJSON(`${releaseBase(fyId,releaseId)}/summary.json`);
}

export async function loadOverviewData(fyId, releaseId){
  const base = releaseBase(fyId, releaseId);
  const [summary, products, countries, routes, signals, trends] = await Promise.all([
    loadJSON(`${base}/summary.json`),
    loadJSON(`${base}/products.json`),
    loadJSON(`${base}/countries.json`),
    loadJSON(`${base}/routes.json`),
    loadJSON(`${base}/signals.json`),
    loadJSON(`data/${fyId}/trends.json`)
  ]);
  return {summary,products,countries,routes,signals,trends};
}

export async function loadExploreData(fyId, releaseId, mode){
  const base = releaseBase(fyId, releaseId);
  if(mode==='products') return loadJSON(`${base}/products.json`);
  if(mode==='countries') return loadJSON(`${base}/countries.json`);
  if(mode==='routes') return loadJSON(`${base}/routes.json`);
  if(mode==='sectors') return loadJSON(`${base}/sectors.json`);
  throw new Error(`Unknown explore mode: ${mode}`);
}

export async function loadSignals(fyId, releaseId){
  return loadJSON(`${releaseBase(fyId,releaseId)}/signals.json`);
}

export async function loadTrends(fyId){
  return loadJSON(`data/${fyId}/trends.json`);
}

export async function loadProductPartners(fyId, releaseId, direction){
  return loadJSON(`${releaseBase(fyId,releaseId)}/${direction}_product_partners.json`);
}
