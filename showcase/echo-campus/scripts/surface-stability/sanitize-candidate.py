"""Drop exactly zero-area faces and repair invalid normals, preserving positions."""
from pathlib import Path
import argparse,json,struct,hashlib
import numpy as np
P=argparse.ArgumentParser();P.add_argument('input');P.add_argument('output');A=P.parse_args();R=Path(__file__).parent;raw=(R/A.input).read_bytes();ln=struct.unpack_from('<I',raw,12)[0];D=json.loads(raw[20:20+ln]);blob=memoryview(raw)[28+ln:]
def read(i):
 ac=D['accessors'][i];bv=D['bufferViews'][ac['bufferView']];n={'SCALAR':1,'VEC3':3}[ac['type']];dt=np.dtype({5126:'<f4',5125:'<u4',5123:'<u2',5121:'u1'}[ac['componentType']]);return np.ndarray((ac['count'],n),dt,buffer=blob,offset=bv.get('byteOffset',0)+ac.get('byteOffset',0),strides=(bv.get('byteStride',dt.itemsize*n),dt.itemsize)).copy()
OUT={k:v for k,v in D.items()if k not in ['accessors','bufferViews','buffers']};OUT.update(accessors=[],bufferViews=[],buffers=[{'byteLength':0}]);out=bytearray();counts={'inputTriangles':0,'outputTriangles':0,'exactZeroAreaFacesRemoved':0,'normalsRepaired':0}
def acc(a,typ,component,target):
 while len(out)%4:out.append(0)
 vi=len(OUT['bufferViews']);OUT['bufferViews'].append({'buffer':0,'byteOffset':len(out),'byteLength':a.nbytes,'target':target});out.extend(a.tobytes());v={'bufferView':vi,'count':len(a),'type':typ,'componentType':component}
 if typ=='VEC3':v.update(min=a.min(0).tolist(),max=a.max(0).tolist())
 OUT['accessors'].append(v);return len(OUT['accessors'])-1
for m in OUT['meshes']:
 pp=[]
 for p in m['primitives']:
  attrs={k:read(i)for k,i in p['attributes'].items()};v=attrs['POSITION'];f=read(p['indices']).reshape(-1,3);t=v[f].astype(float);cross=np.cross(t[:,1]-t[:,0],t[:,2]-t[:,0]);keep=np.any(cross!=0,axis=1);counts['inputTriangles']+=len(f);counts['exactZeroAreaFacesRemoved']+=int((~keep).sum());f=f[keep];cross=cross[keep]
  if not len(f):continue
  counts['outputTriangles']+=len(f);n=attrs['NORMAL'];length=np.linalg.norm(n,axis=1);bad=(~np.isfinite(n).all(1))|(length<.98)|(length>1.02);counts['normalsRepaired']+=int(bad.sum())
  if bad.any():
   fallback=np.zeros_like(v,dtype=float)
   for corner in range(3):np.add.at(fallback,f[:,corner],cross)
   fl=np.linalg.norm(fallback,axis=1);nonzero=bad&(fl>0);n[nonzero]=fallback[nonzero]/fl[nonzero,None];n[bad&~nonzero]=[0,1,0]
  used,inv=np.unique(f,return_inverse=True);p['attributes']={k:acc(values[used].astype('<f4'),'VEC3',5126,34962)for k,values in attrs.items()};p['indices']=acc(inv.reshape(-1).astype('<u4'),'SCALAR',5125,34963);pp.append(p)
 m['primitives']=pp
OUT['buffers'][0]['byteLength']=len(out);j=json.dumps(OUT,separators=(',',':'),ensure_ascii=False).encode();j+=b' '*(-len(j)%4);data=struct.pack('<III',0x46546c67,2,28+len(j)+len(out))+struct.pack('<II',len(j),0x4e4f534a)+j+struct.pack('<II',len(out),0x004e4942)+out;(R/A.output).write_bytes(data)
report={'input':A.input,'output':A.output,'sha256':hashlib.sha256(data).hexdigest(),'rule':'Only exactly collinear/identical-vertex triangles removed, measured in float64 from float32 input. Positions unchanged. Invalid normals replaced with weighted adjacent face normal.',**counts};(R/(Path(A.output).stem+'.sanitize.json')).write_text(json.dumps(report,indent=2));print(json.dumps(report))
