#!/usr/bin/env python3
from pathlib import Path
import json, sys, math
ROOT=Path(__file__).resolve().parents[1]
errors=[]
def load(p):
    try:return json.loads(p.read_text())
    except Exception as e:errors.append(f'{p}: {e}');return None
idx=load(ROOT/'data/releases.json')
if idx:
  for fy in idx['fiscalYears']:
    for rel in fy['releases']:
      base=ROOT/'data'/fy['id']/rel['id'];s=load(base/'summary.json');p=load(base/'products.json');c=load(base/'countries.json');r=load(base/'routes.json');sec=load(base/'sectors.json');sig=load(base/'signals.json')
      if not all((s,p,c,r,sec,sig)):continue
      C=s['cumulative'];tol=.02
      if abs((C['imports_b']-C['exports_b'])-C['deficit_b'])>tol:errors.append(f"{rel['label']}: imports-exports != deficit")
      if abs((C['imports_b']+C['exports_b'])-C['total_trade_b'])>tol:errors.append(f"{rel['label']}: imports+exports != total trade")
      if p['imports'] and abs(sum(x['value_b'] for x in p['imports'])-C['imports_b'])>.05:errors.append(f"{rel['label']}: import products do not reconcile")
      if p['exports'] and abs(sum(x['value_b'] for x in p['exports'])-C['exports_b'])>.05:errors.append(f"{rel['label']}: export products do not reconcile")
      if c and abs(sum(x['imports_b'] for x in c)-C['imports_b'])>.05:errors.append(f"{rel['label']}: country imports do not reconcile")
      if c and abs(sum(x['exports_b'] for x in c)-C['exports_b'])>.05:errors.append(f"{rel['label']}: country exports do not reconcile")
      for x in p['imports'][:20]+p['exports'][:20]:
        if not x.get('hs') or len(str(x['hs']))<2:errors.append(f"{rel['label']}: bad HS code")
if errors:
  print('VALIDATION FAILED');print('\n'.join(' - '+e for e in errors));sys.exit(1)
print('VALIDATION PASSED')
