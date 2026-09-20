"""Independent readback checks for candidate geometry before browser QA."""
from pathlib import Path
import json,struct,numpy as np,hashlib,argparse
P=argparse.ArgumentParser();P.add_argument('candidate');A=P.parse_args();R=Path(__file__).parent
def inspect(path):
 raw=path.read_bytes();ln=struct.unpack_from('<I',raw,12)[0];d=json.loads(raw[20:20+ln]);blob=memoryview(raw)[28+ln:]
 def a(i):
  ac=d['accessors'][i];bv=d['bufferViews'][ac['bufferView']];n={'SCALAR':1,'VEC3':3,'VEC2':2,'VEC4':4}[ac['type']];dt=np.dtype({5126:'<f4',5125:'<u4',5123:'<u2',5121:'u1'}[ac['componentType']]);return np.ndarray((ac['count'],n),dt,buffer=blob,offset=bv.get('byteOffset',0)+ac.get('byteOffset',0),strides=(bv.get('byteStride',dt.itemsize*n),dt.itemsize))
 result={'file':path.name,'sha256':hashlib.sha256(raw).hexdigest(),'triangles':0,'invalidIndices':0,'invalidAttributes':0,'badNormals':0,'zeroAreaTriangles':0,'emptyMeshes':[],'regions':{}}
 for mi,m in enumerate(d['meshes']):
  if not m['primitives']:result['emptyMeshes'].append(mi)
  for p in m['primitives']:
   v=a(p['attributes']['POSITION']);n=a(p['attributes']['NORMAL']);f=a(p['indices']).reshape(-1,3);result['triangles']+=len(f);result['invalidIndices']+=int((f>=len(v)).sum());result['invalidAttributes']+=int((~np.isfinite(v)).sum()+(~np.isfinite(n)).sum());norm=np.linalg.norm(n,axis=1);result['badNormals']+=int(((norm<.98)|(norm>1.02)).sum());t=v[f];area=np.linalg.norm(np.cross(t[:,1]-t[:,0],t[:,2]-t[:,0]),axis=1);result['zeroAreaTriangles']+=int((area==0).sum())
   sid=m.get('extras',{}).get('sourceVenue','unknown');r=result['regions'].setdefault(sid,{'triangles':0,'min':[float('inf')]*3,'max':[float('-inf')]*3,'materials':set(),'highCells':set()});r['triangles']+=len(f);r['min']=np.minimum(r['min'],v.min(0)).tolist();r['max']=np.maximum(r['max'],v.max(0)).tolist();r['materials'].add(d['materials'][p['material']]['name']);high=v[v[:,1]>20];r['highCells'].update(map(tuple,np.floor(high[:,[0,2]]/10).astype(int)))
 for r in result['regions'].values():r['materials']=sorted(r['materials']);r['highCells']=[list(map(int,x))for x in sorted(r['highCells'])]
 return result
before=inspect(R/'campus-decoded.glb');after=inspect(R/A.candidate);deltas=[]
for sid,r in before['regions'].items():
 end=after['regions'].get(sid)
 if not end:raise RuntimeError('Lost region '+sid)
 delta=max(abs(np.array(r['min'])-end['min']).max(),abs(np.array(r['max'])-end['max']).max());deltas.append({'source':sid,'boundsDelta':float(delta),'missingMaterials':sorted(set(r['materials'])-set(end['materials']))})
report={'before':before,'after':after,'regionChanges':deltas};(R/(Path(A.candidate).stem+'.readback.json')).write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8');print(json.dumps({'after':{k:v for k,v in after.items()if k!='regions'},'regionChanges':deltas},ensure_ascii=False,indent=2))
assert after['invalidIndices']==0 and after['invalidAttributes']==0
