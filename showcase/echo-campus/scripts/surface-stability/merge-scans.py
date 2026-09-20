"""Combine complete, disjoint scanner partitions and preserve every pair."""
from pathlib import Path
import argparse,json,collections,numpy as np
P=argparse.ArgumentParser();P.add_argument('--prefix',required=True);P.add_argument('parts',nargs='+');A=P.parse_args();R=Path(__file__).parent;reports=[json.loads((R/(p+'.spatial-residual.json')).read_text(encoding='utf8'))for p in A.parts];pairs=[np.load(R/(p+'.residual-pairs.npz'))for p in A.parts];sha=reports[0]['sha256'];assert all(r['sha256']==sha for r in reports);ranges=sorted(r['validTriangleRange']for r in reports);assert ranges[0][0]==0 and ranges[-1][1]==reports[0]['trianglesAboveMinimumArea'];assert all(a[1]==b[0]for a,b in zip(ranges,ranges[1:]));pp=np.concatenate([p['pairs']for p in pairs]);unique=np.unique(pp,axis=0);assert len(pp)==len(unique),'Partitions should never double count pairs';np.savez_compressed(R/(A.prefix+'.residual-pairs.npz'),pairs=pp,inputSha=sha);r=dict(reports[0]);r['validTriangleRange']=[ranges[0][0],ranges[-1][1]];r['partitions']=A.parts
for key in ['broadphasePairs','strictPlanePairs','residualOverlapPairs','summedProjectedOverlapArea','seconds']:r[key]=sum(x[key]for x in reports)
c=collections.Counter()
for rep in reports:c.update(rep['bySourcePair'])
r['bySourcePair']=dict(c);r['largest']=sorted([x for rep in reports for x in rep['largest']],key=lambda x:-x['projectedArea'])[:1000];(R/(A.prefix+'.spatial-residual.json')).write_text(json.dumps(r,ensure_ascii=False,indent=2),encoding='utf8');print(json.dumps({k:v for k,v in r.items()if k!='largest'}))
