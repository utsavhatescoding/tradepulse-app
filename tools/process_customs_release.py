#!/usr/bin/env python3
"""Convert one standard Department of Customs workbook into TradePulse web JSON.

No third-party Python packages are required. The parser reads XLSX XML directly.
Designed for the current 10-sheet Customs workbook structure used by TradePulse.
"""
from __future__ import annotations
import argparse, json, math, re, zipfile
from collections import defaultdict
from pathlib import Path
from xml.etree import ElementTree as ET

NS={"a":"http://schemas.openxmlformats.org/spreadsheetml/2006/main","r":"http://schemas.openxmlformats.org/officeDocument/2006/relationships"}

class XlsxReader:
    def __init__(self,path:Path):
        self.z=zipfile.ZipFile(path)
        self.shared=[]
        if "xl/sharedStrings.xml" in self.z.namelist():
            root=ET.fromstring(self.z.read("xl/sharedStrings.xml"))
            for si in root.findall("a:si",NS):
                self.shared.append("".join((t.text or "") for t in si.iter("{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t")))
        wb=ET.fromstring(self.z.read("xl/workbook.xml")); rels=ET.fromstring(self.z.read("xl/_rels/workbook.xml.rels"))
        relmap={e.attrib["Id"]:e.attrib["Target"] for e in rels}
        self.sheets={}
        for sh in wb.find("a:sheets",NS):
            rid=sh.attrib["{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"]
            self.sheets[sh.attrib["name"]]="xl/"+relmap[rid].lstrip("/")
    @staticmethod
    def colnum(s):
        n=0
        for ch in s:n=n*26+ord(ch)-64
        return n
    def value(self,c):
        t=c.attrib.get("t"); v=c.find("a:v",NS)
        if t=="s" and v is not None:return self.shared[int(v.text)]
        if t=="inlineStr":
            node=c.find("a:is",NS)
            return "".join((x.text or "") for x in node.iter("{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t")) if node is not None else None
        if v is None:return None
        s=v.text
        try:return float(s)
        except:return s
    def rows(self,sheet):
        if sheet not in self.sheets: raise KeyError(f"Missing sheet: {sheet}")
        root=ET.fromstring(self.z.read(self.sheets[sheet])); out=[]
        for row in root.findall(".//a:sheetData/a:row",NS):
            vals={}
            for c in row.findall("a:c",NS):
                m=re.match(r"([A-Z]+)(\d+)",c.attrib["r"]); vals[self.colnum(m.group(1))]=self.value(c)
            if vals: out.append((int(row.attrib["r"]),[vals.get(i) for i in range(1,max(vals)+1)]))
        return out
    def table(self,sheet,header_row=3):
        rows=self.rows(sheet); hdr=next(a for r,a in rows if r==header_row); data=[]
        for r,a in rows:
            if r<=header_row:continue
            a=a+[None]*(len(hdr)-len(a)); a=a[:len(hdr)]
            if all(x is None or str(x).strip()=="" for x in a):continue
            if any(str(x).strip().lower()=="total" for x in a[:2] if x is not None):continue
            data.append(dict(zip(hdr,a)))
        return data

def clean_text(v):
    return re.sub(r'\s+', ' ', str(v or '')).strip()

def f(v):
    try:return float(v or 0)
    except:return 0.0

def hs(v,n=8):
    s=str(v or "").strip(); s=s[:-2] if re.fullmatch(r"\d+\.0",s) else s
    return s.zfill(n)

def dump(p,obj):p.write_text(json.dumps(obj,ensure_ascii=False,indent=2),encoding="utf-8")
def fy_display(fy):return fy.replace("_","/")

def detect_direction_columns(rows,current_fy):
    if not rows:raise ValueError("Trade direction table is empty")
    hdr=list(rows[0].keys()); cur=[h for h in hdr if isinstance(h,str) and f"FY {current_fy}" in h]
    prev=[h for h in hdr if isinstance(h,str) and h.startswith("FY ") and h not in cur]
    if not cur:raise ValueError(f"Could not detect current FY column for {current_fy}")
    return (prev[0] if prev else None),cur[0]

def signal_route_changes(current_month,previous_month):
    pm={x['office']:x for x in previous_month}; changes=[]
    for x in current_month:
        p=pm.get(x['office']);
        if not p:continue
        delta=x['imports_b']-p['imports_b']; pctchg=(delta/p['imports_b']*100) if p['imports_b'] else None
        changes.append((delta,pctchg,x,p))
    if not changes:return []
    pct_candidates=[z for z in changes if z[1] is not None and z[3]['imports_b']>=0.1]
    biggest_up=max(pct_candidates or changes,key=lambda z:(z[1] if z[1] is not None else -1e99)); biggest_down=min(pct_candidates or changes,key=lambda z:(z[1] if z[1] is not None else 1e99)); out=[]
    for direction,z in [('increase',biggest_up),('decrease',biggest_down)]:
        delta,pctchg,x,p=z
        if abs(delta)<.05:continue
        metric=(f"{pctchg:+.1f}%" if pctchg is not None and abs(pctchg)<999 else f"Rs {delta:+.2f}B")
        out.append({'id':f'route-{direction}','type':'route','severity':'high' if abs(delta)>2 else 'medium','eyebrow':'Route shift','title':f"{x['office']} recorded the largest route {direction}",'metric':metric,'detail':f"Single-month imports through {x['office']} moved from Rs {p['imports_b']:.2f}B in the previous month to Rs {x['imports_b']:.2f}B in the current month.",'evidence':[f"Previous month Rs {p['imports_b']:.2f}B",f"Current month Rs {x['imports_b']:.2f}B"]})
    return out

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('--input',required=True,type=Path); ap.add_argument('--output',required=True,type=Path)
    ap.add_argument('--fy',required=True,help='e.g. 2083_84'); ap.add_argument('--release',required=True,help='machine id, e.g. bhadra')
    ap.add_argument('--label',required=True,help='display label, e.g. Bhadra'); ap.add_argument('--order',required=True,type=int)
    ap.add_argument('--coverage',required=True); ap.add_argument('--updated',required=True)
    ap.add_argument('--previous-dir',type=Path); ap.add_argument('--report-url',default='https://tradepulsenepal.com/')
    args=ap.parse_args(); args.output.mkdir(parents=True,exist_ok=True)
    book=XlsxReader(args.input); fy=fy_display(args.fy)
    td=book.table('1_Trade_Direction'); prev_col,cur_col=detect_direction_columns(td,fy)
    tmap={str(r.get('Trade.Indicators','')).strip():r for r in td}
    def tv(name,col):return f(tmap[name][col])
    imports=tv("Imports (Rs.in `000)",cur_col)/1e6; exports=tv("Exports (Rs.in `000)",cur_col)/1e6; deficit=tv("Trade Deficit (Rs.in `000)",cur_col)/1e6; total=tv("Total  Foreign Trade (Rs.in `000)",cur_col)/1e6
    ratio=tv('Imports/Exports Ratio',cur_col); exp_share=tv('Exports Share to Total Trade (%)',cur_col); imp_share=tv('Imports Share to Total Trade (%)',cur_col)
    def change(name):
        r=tmap[name]; key=next((k for k in r if isinstance(k,str) and 'Change' in k),None); return f(r.get(key,0))
    previous={}
    if prev_col: previous={'imports_b':tv("Imports (Rs.in `000)",prev_col)/1e6,'exports_b':tv("Exports (Rs.in `000)",prev_col)/1e6,'deficit_b':tv("Trade Deficit (Rs.in `000)",prev_col)/1e6,'total_trade_b':tv("Total  Foreign Trade (Rs.in `000)",prev_col)/1e6}
    monthly={'imports_b':imports,'exports_b':exports,'deficit_b':deficit,'total_trade_b':total,'ratio':ratio,'mom':None}
    prev_summary=None
    if args.previous_dir and (args.previous_dir/'summary.json').exists():
        prev_summary=json.loads((args.previous_dir/'summary.json').read_text()); pc=prev_summary['cumulative']
        monthly={'imports_b':imports-pc['imports_b'],'exports_b':exports-pc['exports_b'],'deficit_b':deficit-pc['deficit_b'],'total_trade_b':total-pc['total_trade_b']}
        monthly['ratio']=monthly['imports_b']/monthly['exports_b'] if monthly['exports_b'] else 0
        monthly['mom']={k:(monthly[k+'_b']/pc[k+'_b']-1)*100 for k in ('imports','exports','deficit','total_trade') if pc.get(k+'_b')}
    summary={'id':f'{args.fy}_{args.release}','fiscalYear':fy,'release':args.label,'releaseOrder':args.order,'releaseType':'cumulative','coverage':args.coverage,'updated':args.updated,'source':{'name':'Department of Customs, Government of Nepal','url':'https://customs.gov.np/'},'cumulative':{'imports_b':imports,'exports_b':exports,'deficit_b':deficit,'total_trade_b':total,'ratio':ratio,'import_share':imp_share,'export_share':exp_share,'yoy':{'imports':change("Imports (Rs.in `000)"),'exports':change("Exports (Rs.in `000)"),'deficit':change("Trade Deficit (Rs.in `000)"),'total_trade':change("Total  Foreign Trade (Rs.in `000)"),'ratio':change('Imports/Exports Ratio')},'previous':previous},'monthly':monthly,'reportUrl':args.report_url,'downloadUrl':'https://tradepulsenepal.com/nepal-trade-data-download.html'}
    dump(args.output/'summary.json',summary)

    imp=[]
    for r in book.table('5_Imports_By_Commodity'):
        x={'hs':hs(r.get('HSCode')),'name':clean_text(r.get('Description','')),'unit':r.get('Unit',''),'quantity':f(r.get('Quantity')),'value_b':f(r.get('Imports_Value'))/1e6,'value_000':f(r.get('Imports_Value')),'revenue_000':f(r.get('Imports_Revenue')),'direction':'import'};imp.append(x)
    exp=[]
    for r in book.table('7_Exports_By_Commodity'):
        x={'hs':hs(r.get('HSCode')),'name':clean_text(r.get('Description','')),'unit':r.get('Unit',''),'quantity':f(r.get('Quantity')),'value_b':f(r.get('Exports_Value'))/1e6,'value_000':f(r.get('Exports_Value')),'direction':'export'};exp.append(x)
    imp.sort(key=lambda x:x['value_b'],reverse=True);exp.sort(key=lambda x:x['value_b'],reverse=True)
    for rows,totalv in ((imp,imports),(exp,exports)):
        for i,x in enumerate(rows,1):x['rank']=i;x['share_pct']=x['value_b']/totalv*100 if totalv else 0
    dump(args.output/'products.json',{'imports':imp,'exports':exp})

    countries=[]
    for r in book.table('3_Trade_Balance_Country'):
        iv=f(r.get('Imports_Value'))/1e6;ev=f(r.get('Exports_Value'))/1e6;bv=f(r.get('Trade_Balance'))/1e6
        countries.append({'country':clean_text(r.get('Partner Countries','')),'imports_b':iv,'exports_b':ev,'balance_b':bv,'import_share_pct':iv/imports*100 if imports else 0,'export_share_pct':ev/exports*100 if exports else 0})
    countries.sort(key=lambda x:x['imports_b']+x['exports_b'],reverse=True)
    for i,x in enumerate(countries,1):x['rank']=i
    dump(args.output/'countries.json',countries)

    routes=[]
    for r in book.table('9_Customswise_Trade'):
        routes.append({'office':clean_text(r.get('Customs','')).title(),'imports_b':f(r.get('Imports_Value'))/1e6,'exports_b':f(r.get('Exports_Value'))/1e6,'import_share_pct':f(r.get('Import_Share')),'export_share_pct':f(r.get('Export_Share'))})
    routes.sort(key=lambda x:x['imports_b']+x['exports_b'],reverse=True)
    for i,x in enumerate(routes,1):x['rank']=i
    dump(args.output/'routes.json',routes)
    # Store derived single-month route values so future releases can compare route movement correctly.
    if args.previous_dir and (args.previous_dir/'routes.json').exists():
        prev_routes=json.loads((args.previous_dir/'routes.json').read_text())
        pm={x['office']:x for x in prev_routes}; monthly_routes=[]
        for x in routes:
            p=pm.get(x['office'],{'imports_b':0,'exports_b':0})
            monthly_routes.append({**x,'imports_b':x['imports_b']-p['imports_b'],'exports_b':x['exports_b']-p['exports_b']})
    else:
        monthly_routes=[dict(x) for x in routes]
    monthly_routes.sort(key=lambda x:x['imports_b']+x['exports_b'],reverse=True)
    for i,x in enumerate(monthly_routes,1):x['rank']=i
    dump(args.output/'monthly_routes.json',monthly_routes)

    sectors=[]
    for r in book.table('2_Trade_Balance_Chapter'):
        sectors.append({'chapter':hs(r.get('Chapter'),2),'name':clean_text(r.get('Description','')),'imports_b':f(r.get('Imports_Value'))/1e6,'exports_b':f(r.get('Exports_Value'))/1e6,'balance_b':f(r.get('Trade_Balance'))/1e6,'revenue_000':f(r.get('Imports_Revenue'))})
    sectors.sort(key=lambda x:x['imports_b']+x['exports_b'],reverse=True)
    for i,x in enumerate(sectors,1):x['rank']=i
    dump(args.output/'sectors.json',sectors)

    for direction,sheet in [('import','4_Imports_By_Commodity_Partner'),('export','6_Exports_By_Commodity_Partner')]:
        rows=[];vk='Imports_Value' if direction=='import' else 'Exports_Value'
        for r in book.table(sheet):rows.append({'hs':hs(r.get('HSCode')),'name':clean_text(r.get('Description','')),'country':clean_text(r.get('Partner Countries','')),'unit':r.get('Unit',''),'quantity':f(r.get('Quantity')),'value_b':f(r.get(vk))/1e6})
        dump(args.output/f'{direction}_product_partners.json',rows)

    signals=[]
    if exp:
        signals.append({'id':'export-concentration','type':'product','severity':'high' if exp[0]['share_pct']>35 else 'medium','eyebrow':'Export concentration','title':f"{exp[0]['name']} leads the export mix",'metric':f"{exp[0]['share_pct']:.1f}%",'detail':f"The leading export product contributed Rs {exp[0]['value_b']:.2f}B, about {exp[0]['share_pct']:.1f}% of cumulative exports.",'evidence':[f"Top export Rs {exp[0]['value_b']:.2f}B",f"Total exports Rs {exports:.2f}B"],'link':args.report_url})
    if countries:
        india=next((x for x in countries if x['country'].lower()=='india'),countries[0]);signals.append({'id':'partner-concentration','type':'country','severity':'medium','eyebrow':'Partner concentration','title':f"{india['country']} dominates the partner mix",'metric':f"{india['export_share_pct']:.1f}% exports",'detail':f"{india['country']} accounts for {india['import_share_pct']:.1f}% of imports and {india['export_share_pct']:.1f}% of exports.",'evidence':[],'link':args.report_url})
    if prev_summary and args.previous_dir and (args.previous_dir/'monthly_routes.json').exists():
        previous_monthly_routes=json.loads((args.previous_dir/'monthly_routes.json').read_text())
        signals=signal_route_changes(monthly_routes,previous_monthly_routes)+signals
    signals.append({'id':'trade-balance','type':'balance','severity':'info','eyebrow':'Trade balance','title':'Imports remain larger than exports','metric':f'{ratio:.2f}×','detail':f'Imports are Rs {imports:.2f}B versus Rs {exports:.2f}B of exports in the cumulative release.','evidence':[],'link':args.report_url})
    dump(args.output/'signals.json',signals[:5])
    print(f"Processed {args.label} FY {fy}: {len(imp)} imports, {len(exp)} exports, {len(countries)} countries, {len(routes)} routes")

if __name__=='__main__':main()
