from pathlib import Path
import csv, json, math, re

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path('/mnt/data/bhadra-patch-src/data')
BH = ROOT / 'data/2083_84/bhadra'
SH = ROOT / 'data/2083_84/shrawan'
BH.mkdir(parents=True, exist_ok=True)
SH.mkdir(parents=True, exist_ok=True)


def read_csv(name):
    with open(SOURCE/name, encoding='utf-8-sig', newline='') as f:
        return list(csv.DictReader(f))

def f(v, default=0.0):
    if v in (None, ''): return default
    try: return float(v)
    except Exception: return default

def dump(path, obj):
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2), encoding='utf-8')

summary_rows = read_csv('nepal-trade-summary-bhadra-fy2083-84.csv')
sm = {r['Trade_Indicator']: r for r in summary_rows}

def row(name):
    r=sm[name]
    return f(r['FY_2082_83_First_Two_Months']), f(r['FY_2083_84_First_Two_Months']), f(r['Change_Percent'])

prev_imp, cur_imp, yoy_imp = row("Imports (Rs.in `000)")
prev_exp, cur_exp, yoy_exp = row("Exports (Rs.in `000)")
prev_def, cur_def, yoy_def = row("Trade Deficit (Rs.in `000)")
prev_trade, cur_trade, yoy_trade = row("Total  Foreign Trade (Rs.in `000)")
_, ratio, yoy_ratio = row("Imports/Exports Ratio")
_, exp_share, _ = row("Exports Share to Total Trade (%)")
_, imp_share, _ = row("Imports Share to Total Trade (%)")

SHRAWAN = {
    'imports_b':187.443622161632,
    'exports_b':38.704145615970,
    'deficit_b':148.739476545662,
    'total_trade_b':226.147767777602,
    'ratio':4.842985659,
    'import_share':82.885462,
    'export_share':17.114538,
    'yoy':{'imports':31.042188,'exports':61.722517,'deficit':24.877583,'total_trade':35.439634},
    'previous':{'imports_b':143.040668563311,'exports_b':23.932440802120,'deficit_b':119.108227761191,'total_trade_b':166.973109365431}
}
BHADRA_MONTHLY = {
    'imports_b':cur_imp/1_000_000 - SHRAWAN['imports_b'],
    'exports_b':cur_exp/1_000_000 - SHRAWAN['exports_b'],
    'deficit_b':cur_def/1_000_000 - SHRAWAN['deficit_b'],
    'total_trade_b':cur_trade/1_000_000 - SHRAWAN['total_trade_b'],
}
BHADRA_MONTHLY['ratio'] = BHADRA_MONTHLY['imports_b'] / BHADRA_MONTHLY['exports_b']
BHADRA_MONTHLY['mom'] = {
    'imports':(BHADRA_MONTHLY['imports_b']/SHRAWAN['imports_b']-1)*100,
    'exports':(BHADRA_MONTHLY['exports_b']/SHRAWAN['exports_b']-1)*100,
    'deficit':(BHADRA_MONTHLY['deficit_b']/SHRAWAN['deficit_b']-1)*100,
    'total_trade':(BHADRA_MONTHLY['total_trade_b']/SHRAWAN['total_trade_b']-1)*100,
}

summary = {
    'id':'2083_84_bhadra',
    'fiscalYear':'2083/84',
    'release':'Bhadra',
    'releaseOrder':2,
    'releaseType':'cumulative',
    'coverage':'Mid July 2026 to Mid September 2026',
    'updated':'2026-09-28',
    'source':{'name':'Department of Customs, Government of Nepal','url':'https://customs.gov.np/category/summary-of-business-revenue-2083-084/?page=1'},
    'cumulative':{
        'imports_b':cur_imp/1_000_000,
        'exports_b':cur_exp/1_000_000,
        'deficit_b':cur_def/1_000_000,
        'total_trade_b':cur_trade/1_000_000,
        'ratio':ratio,
        'import_share':imp_share,
        'export_share':exp_share,
        'yoy':{'imports':yoy_imp,'exports':yoy_exp,'deficit':yoy_def,'total_trade':yoy_trade,'ratio':yoy_ratio},
        'previous':{'imports_b':prev_imp/1_000_000,'exports_b':prev_exp/1_000_000,'deficit_b':prev_def/1_000_000,'total_trade_b':prev_trade/1_000_000}
    },
    'monthly':BHADRA_MONTHLY,
    'reportUrl':'https://tradepulsenepal.com/bhadra-2083-84-trade-report.html',
    'downloadUrl':'https://tradepulsenepal.com/nepal-trade-data-download.html'
}
dump(BH/'summary.json', summary)

dump(SH/'summary.json', {
    'id':'2083_84_shrawan','fiscalYear':'2083/84','release':'Shrawan','releaseOrder':1,'releaseType':'cumulative',
    'coverage':'Mid July 2026 to Mid August 2026','updated':'2026-09-05',
    'source':summary['source'], 'cumulative':SHRAWAN, 'monthly':{**{k:SHRAWAN[k] for k in ['imports_b','exports_b','deficit_b','total_trade_b','ratio']},'mom':None},
    'reportUrl':'https://tradepulsenepal.com/shrawan-2083-84-trade-report.html','downloadUrl':'https://tradepulsenepal.com/nepal-trade-data-download.html'
})

# Products
imports = []
for r in read_csv('nepal-import-products-bhadra-fy2083-84.csv'):
    imports.append({
        'hs':str(r['HSCode']).zfill(8), 'name':r['Description'], 'unit':r['Unit'], 'quantity':f(r['Quantity']),
        'value_b':f(r['Imports_Value_Rs_Billion']), 'value_000':f(r['Imports_Value_Rs_Thousands']), 'revenue_000':f(r['Imports_Revenue_Rs_Thousands']), 'direction':'import'
    })
exports=[]
for r in read_csv('nepal-export-products-bhadra-fy2083-84.csv'):
    exports.append({
        'hs':str(r['HSCode']).zfill(8), 'name':r['Description'], 'unit':r['Unit'], 'quantity':f(r['Quantity']),
        'value_b':f(r['Exports_Value_Rs_Billion']), 'value_000':f(r['Exports_Value_Rs_Thousands']), 'direction':'export'
    })
imports.sort(key=lambda x:x['value_b'], reverse=True)
exports.sort(key=lambda x:x['value_b'], reverse=True)
for i,x in enumerate(imports,1): x['rank']=i; x['share_pct']=x['value_b']/summary['cumulative']['imports_b']*100
for i,x in enumerate(exports,1): x['rank']=i; x['share_pct']=x['value_b']/summary['cumulative']['exports_b']*100
dump(BH/'products.json', {'imports':imports,'exports':exports})

# Countries
countries=[]
for r in read_csv('nepal-trade-by-country-bhadra-fy2083-84.csv'):
    imp=f(r['Imports_Value_Rs_Billion']); exp=f(r['Exports_Value_Rs_Billion']); bal=f(r['Trade_Balance_Rs_Billion'])
    countries.append({'country':r['Partner_Country'],'imports_b':imp,'exports_b':exp,'balance_b':bal,
                      'import_share_pct':imp/summary['cumulative']['imports_b']*100 if summary['cumulative']['imports_b'] else 0,
                      'export_share_pct':exp/summary['cumulative']['exports_b']*100 if summary['cumulative']['exports_b'] else 0})
countries.sort(key=lambda x:x['imports_b']+x['exports_b'],reverse=True)
for i,x in enumerate(countries,1): x['rank']=i
dump(BH/'countries.json', countries)

# Customs routes
routes=[]
for r in read_csv('nepal-trade-by-customs-office-bhadra-fy2083-84.csv'):
    routes.append({'office':r['Customs_Office'].title(),'imports_b':f(r['Imports_Value_Rs_Billion']),'exports_b':f(r['Exports_Value_Rs_Billion']),
                   'import_share_pct':f(r['Import_Share_Percent']),'export_share_pct':f(r['Export_Share_Percent'])})
routes.sort(key=lambda x:x['imports_b']+x['exports_b'], reverse=True)
for i,x in enumerate(routes,1): x['rank']=i
dump(BH/'routes.json', routes)

# HS chapters / sectors
sectors=[]
for r in read_csv('nepal-trade-by-hs-chapter-bhadra-fy2083-84.csv'):
    sectors.append({'chapter':str(r['HS_Chapter']).zfill(2),'name':r['Description'],'imports_b':f(r['Imports_Value_Rs_Billion']),
                    'exports_b':f(r['Exports_Value_Rs_Billion']),'balance_b':f(r['Trade_Balance_Rs_Billion']),'revenue_000':f(r['Imports_Revenue_Rs_Thousands'])})
sectors.sort(key=lambda x:x['imports_b']+x['exports_b'], reverse=True)
for i,x in enumerate(sectors,1): x['rank']=i
dump(BH/'sectors.json', sectors)

# Partners by product, split to lazy-load files
for direction, filename in [('import','nepal-import-product-partners-bhadra-fy2083-84.csv'),('export','nepal-export-product-partners-bhadra-fy2083-84.csv')]:
    rows=[]
    for r in read_csv(filename):
        value_key = 'Imports_Value_Rs_Billion' if direction=='import' else 'Exports_Value_Rs_Billion'
        rows.append({'hs':str(r['HSCode']).zfill(8),'name':r['Description'],'country':r['Partner_Country'],'unit':r['Unit'],'quantity':f(r['Quantity']),'value_b':f(r[value_key])})
    dump(BH/f'{direction}_product_partners.json', rows)

# Trend data
trends = {
    'fiscalYear':'2083/84',
    'periods':['Shrawan','Bhadra'],
    'cumulative':{
        'imports':[SHRAWAN['imports_b'], summary['cumulative']['imports_b']],
        'exports':[SHRAWAN['exports_b'], summary['cumulative']['exports_b']],
        'deficit':[SHRAWAN['deficit_b'], summary['cumulative']['deficit_b']],
        'total_trade':[SHRAWAN['total_trade_b'], summary['cumulative']['total_trade_b']],
    },
    'monthly':{
        'imports':[SHRAWAN['imports_b'], BHADRA_MONTHLY['imports_b']],
        'exports':[SHRAWAN['exports_b'], BHADRA_MONTHLY['exports_b']],
        'deficit':[SHRAWAN['deficit_b'], BHADRA_MONTHLY['deficit_b']],
        'total_trade':[SHRAWAN['total_trade_b'], BHADRA_MONTHLY['total_trade_b']],
    },
    'priorYearCumulative':{
        'imports':[SHRAWAN['previous']['imports_b'], prev_imp/1_000_000],
        'exports':[SHRAWAN['previous']['exports_b'], prev_exp/1_000_000],
        'deficit':[SHRAWAN['previous']['deficit_b'], prev_def/1_000_000],
        'total_trade':[SHRAWAN['previous']['total_trade_b'], prev_trade/1_000_000]
    }
}
dump(ROOT/'data/2083_84/trends.json', trends)

# Explicit intelligence signals
rasuwa_shrawan=5.68; rasuwa_bhadra=2.24; mustang_shrawan=.59; mustang_bhadra=7.74
signals=[
  {'id':'route-shift','type':'route','severity':'high','eyebrow':'Route shift','title':'Rasuwa fell as Mustang surged','metric':'Mustang 13.1×','detail':f'Bhadra-only imports through Rasuwa fell about {(rasuwa_bhadra/rasuwa_shrawan-1)*100:.1f}%, while Mustang rose from Rs {mustang_shrawan:.2f}B to Rs {mustang_bhadra:.2f}B.','evidence':['Rasuwa · Shrawan Rs 5.68B','Rasuwa · Bhadra Rs 2.24B','Mustang · Shrawan Rs 0.59B','Mustang · Bhadra Rs 7.74B'],'link':'https://tradepulsenepal.com/bhadra-2083-84-trade-report.html'},
  {'id':'export-concentration','type':'product','severity':'medium','eyebrow':'Export concentration','title':'Processed soybean oil drives nearly half of exports','metric':f"{exports[0]['share_pct']:.1f}%",'detail':f"{exports[0]['name']} contributed Rs {exports[0]['value_b']:.2f}B, about {exports[0]['share_pct']:.1f}% of cumulative exports through Bhadra.",'evidence':[f"Exports Rs {summary['cumulative']['exports_b']:.2f}B",f"Top product Rs {exports[0]['value_b']:.2f}B"],'link':'https://tradepulsenepal.com/bhadra-2083-84-trade-report.html'},
  {'id':'monthly-pressure','type':'balance','severity':'medium','eyebrow':'Monthly pressure','title':'Bhadra became more import-heavy','metric':f"Deficit +{BHADRA_MONTHLY['mom']['deficit']:.1f}%",'detail':f"Bhadra-only imports rose {BHADRA_MONTHLY['mom']['imports']:.1f}% from Shrawan while exports changed {BHADRA_MONTHLY['mom']['exports']:.1f}%, widening the monthly deficit to Rs {BHADRA_MONTHLY['deficit_b']:.2f}B.",'evidence':[f"Bhadra imports Rs {BHADRA_MONTHLY['imports_b']:.2f}B",f"Bhadra exports Rs {BHADRA_MONTHLY['exports_b']:.2f}B"],'link':'https://tradepulsenepal.com/bhadra-2083-84-trade-report.html'},
  {'id':'india-concentration','type':'country','severity':'info','eyebrow':'Partner concentration','title':'India remains Nepal’s dominant trade partner','metric':'85% of exports','detail':'India accounts for roughly 55% of cumulative imports and 85% of cumulative exports through Bhadra.','evidence':[],'link':'https://tradepulsenepal.com/bhadra-2083-84-trade-report.html'}
]
dump(BH/'signals.json', signals)

# Release index
index={
  'defaultFiscalYear':'2083/84','defaultRelease':'Bhadra','fiscalYears':[
    {'id':'2083_84','label':'2083/84','releases':[
      {'id':'shrawan','label':'Shrawan','order':1,'path':'data/2083_84/shrawan/summary.json'},
      {'id':'bhadra','label':'Bhadra','order':2,'path':'data/2083_84/bhadra/summary.json'}
    ]}
  ]
}
dump(ROOT/'data/releases.json', index)

print('Seed data generated')
print('imports',len(imports),'exports',len(exports),'countries',len(countries),'routes',len(routes),'sectors',len(sectors))

# Full Shrawan detail resources from the archived V4 data pack.
SH_SOURCE = Path('/mnt/data/shrawan-v4/TradePulse_Nepal_SEO_V4_Production/data')

def sh_csv(name):
    with open(SH_SOURCE/name, encoding='utf-8-sig', newline='') as f:
        return list(csv.DictReader(f))

sh_imports=[]
for r in sh_csv('nepal-import-products-shrawan-fy2083-84.csv'):
    sh_imports.append({'hs':str(r['HSCode']).zfill(8),'name':r['Description'],'unit':r['Unit'],'quantity':f(r['Quantity']),
                       'value_b':f(r['Imports_Value_Rs_Billion']),'value_000':f(r['Imports_Value_Rs_Thousands']),'revenue_000':f(r['Imports_Revenue_Rs_Thousands']),'direction':'import'})
sh_exports=[]
for r in sh_csv('nepal-export-products-shrawan-fy2083-84.csv'):
    sh_exports.append({'hs':str(r['HSCode']).zfill(8),'name':r['Description'],'unit':r['Unit'],'quantity':f(r['Quantity']),
                       'value_b':f(r['Exports_Value_Rs_Billion']),'value_000':f(r['Exports_Value_Rs_Thousands']),'direction':'export'})
sh_imports.sort(key=lambda x:x['value_b'],reverse=True); sh_exports.sort(key=lambda x:x['value_b'],reverse=True)
for i,x in enumerate(sh_imports,1): x['rank']=i; x['share_pct']=x['value_b']/SHRAWAN['imports_b']*100
for i,x in enumerate(sh_exports,1): x['rank']=i; x['share_pct']=x['value_b']/SHRAWAN['exports_b']*100
dump(SH/'products.json',{'imports':sh_imports,'exports':sh_exports})

sh_countries=[]
for r in sh_csv('nepal-trade-by-country-shrawan-fy2083-84.csv'):
    imp=f(r['Imports_Value_Rs_Billion']); exp=f(r['Exports_Value_Rs_Billion']); bal=f(r['Trade_Balance_Rs_Billion'])
    sh_countries.append({'country':r['Partner_Country'],'imports_b':imp,'exports_b':exp,'balance_b':bal,
                         'import_share_pct':imp/SHRAWAN['imports_b']*100 if SHRAWAN['imports_b'] else 0,
                         'export_share_pct':exp/SHRAWAN['exports_b']*100 if SHRAWAN['exports_b'] else 0})
sh_countries.sort(key=lambda x:x['imports_b']+x['exports_b'],reverse=True)
for i,x in enumerate(sh_countries,1): x['rank']=i
dump(SH/'countries.json',sh_countries)

sh_routes=[]
for r in sh_csv('nepal-trade-by-customs-office-shrawan-fy2083-84.csv'):
    sh_routes.append({'office':r['Customs_Office'].title(),'imports_b':f(r['Imports_Value_Rs_Billion']),'exports_b':f(r['Exports_Value_Rs_Billion']),
                      'import_share_pct':f(r['Import_Share_Percent']),'export_share_pct':f(r['Export_Share_Percent'])})
sh_routes.sort(key=lambda x:x['imports_b']+x['exports_b'],reverse=True)
for i,x in enumerate(sh_routes,1): x['rank']=i
dump(SH/'routes.json',sh_routes)

sh_sectors=[]
for r in sh_csv('nepal-trade-by-hs-chapter-shrawan-fy2083-84.csv'):
    sh_sectors.append({'chapter':str(r['HS_Chapter']).zfill(2),'name':r['Description'],'imports_b':f(r['Imports_Value_Rs_Billion']),
                       'exports_b':f(r['Exports_Value_Rs_Billion']),'balance_b':f(r['Trade_Balance_Rs_Billion']),'revenue_000':f(r['Imports_Revenue_Rs_Thousands'])})
sh_sectors.sort(key=lambda x:x['imports_b']+x['exports_b'],reverse=True)
for i,x in enumerate(sh_sectors,1): x['rank']=i
dump(SH/'sectors.json',sh_sectors)

for direction, filename in [('import','nepal-import-product-partners-shrawan-fy2083-84.csv'),('export','nepal-export-product-partners-shrawan-fy2083-84.csv')]:
    rows=[]
    for r in sh_csv(filename):
        value_key='Imports_Value_Rs_Billion' if direction=='import' else 'Exports_Value_Rs_Billion'
        rows.append({'hs':str(r['HSCode']).zfill(8),'name':r['Description'],'country':r['Partner_Country'],'unit':r['Unit'],'quantity':f(r['Quantity']),'value_b':f(r[value_key])})
    dump(SH/f'{direction}_product_partners.json',rows)

india=next((x for x in sh_countries if x['country'].lower()=='india'),None)
birgunj=next((x for x in sh_routes if x['office'].lower()=='birgunj'),None)
sh_signals=[
 {'id':'export-concentration','type':'product','severity':'high','eyebrow':'Export concentration','title':'Soybean oil dominates the export mix','metric':f"{sh_exports[0]['share_pct']:.1f}%",'detail':f"{sh_exports[0]['name']} accounted for about {sh_exports[0]['share_pct']:.1f}% of Shrawan exports.",'evidence':[f"Top export Rs {sh_exports[0]['value_b']:.2f}B",f"Total exports Rs {SHRAWAN['exports_b']:.2f}B"],'link':'https://tradepulsenepal.com/shrawan-2083-84-trade-report.html'},
 {'id':'india-concentration','type':'country','severity':'medium','eyebrow':'Partner concentration','title':'India dominates Nepal’s export destination mix','metric':f"{india['export_share_pct']:.1f}%" if india else '—','detail':f"India received about {india['export_share_pct']:.1f}% of Shrawan exports and supplied {india['import_share_pct']:.1f}% of imports." if india else 'India is the leading partner.','evidence':[],'link':'https://tradepulsenepal.com/shrawan-2083-84-trade-report.html'},
 {'id':'route-concentration','type':'route','severity':'medium','eyebrow':'Route concentration','title':'Birgunj handles about half of imports','metric':f"{birgunj['import_share_pct']:.1f}%" if birgunj else '—','detail':f"Birgunj Customs handled Rs {birgunj['imports_b']:.2f}B of imports in Shrawan." if birgunj else 'Birgunj is the leading route.','evidence':[],'link':'https://tradepulsenepal.com/shrawan-2083-84-trade-report.html'},
 {'id':'imbalance','type':'balance','severity':'info','eyebrow':'Trade balance','title':'Imports remain far larger than exports','metric':f"{SHRAWAN['ratio']:.2f}×",'detail':f"Nepal imported Rs {SHRAWAN['imports_b']:.2f}B against Rs {SHRAWAN['exports_b']:.2f}B of exports in Shrawan.",'evidence':[],'link':'https://tradepulsenepal.com/shrawan-2083-84-trade-report.html'}
]
dump(SH/'signals.json',sh_signals)

print('Shrawan detail generated',len(sh_imports),len(sh_exports),len(sh_countries),len(sh_routes),len(sh_sectors))
