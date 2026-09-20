"""Independent 3D broadphase overlap scan, with no plane/orientation buckets.

All nondegenerate triangle AABBs enter a 3D R-tree. Queries are conservatively
expanded by 2*tolerance: a projected overlap under the exact plane tolerance
is at most sqrt(3)*tolerance apart along its dominant projection axis.
Neither source/material boundaries nor normal-bin boundaries exclude pairs.
"""
from pathlib import Path
import argparse,json,struct,time,hashlib,pickle
import numpy as np
from shapely.geometry import Polygon
from shapely import polygons,intersection,area as polygon_area
from rtree import index

P=argparse.ArgumentParser();P.add_argument('file');P.add_argument('--distance',type=float,default=.003);P.add_argument('--min-area',type=float,default=.0001);P.add_argument('--batch',type=int,default=2048);P.add_argument('--start',type=int,default=0);P.add_argument('--end',type=int);P.add_argument('--prefix');P.add_argument('--resume',action='store_true');A=P.parse_args();R=Path(__file__).parent;started=time.time();raw=(R/A.file).read_bytes();ln=struct.unpack_from('<I',raw,12)[0];D=json.loads(raw[20:20+ln]);blob=memoryview(raw)[28+ln:]
def read(i):
 ac=D['accessors'][i];bv=D['bufferViews'][ac['bufferView']];n={'SCALAR':1,'VEC3':3}[ac['type']];dt=np.dtype({5126:'<f4',5125:'<u4',5123:'<u2',5121:'u1'}[ac['componentType']]);return np.ndarray((ac['count'],n),dt,buffer=blob,offset=bv.get('byteOffset',0)+ac.get('byteOffset',0),strides=(bv.get('byteStride',dt.itemsize*n),dt.itemsize))
ts=[];parts=[];starts=[0]
for mi,m in enumerate(D['meshes']):
 for pi,p in enumerate(m['primitives']):
  t=read(p['attributes']['POSITION'])[read(p['indices']).reshape(-1,3)];ts.append(t);parts.append({'mesh':mi,'primitive':pi,'source':m.get('extras',{}).get('sourceVenue'),'material':D['materials'][p['material']].get('name','')});starts.append(starts[-1]+len(t))
T=np.concatenate(ts);del ts
C=np.cross(T[:,1].astype(float)-T[:,0],T[:,2].astype(float)-T[:,0]);L=np.linalg.norm(C,axis=1);N=(C/np.maximum(L[:,None],1e-30)).astype('<f4');AREA=L*.5;del C,L
valid=np.flatnonzero(AREA>A.min_area);lo=T[valid].min(1).astype(float);hi=T[valid].max(1).astype(float)
prop=index.Property();prop.dimension=3
tree=index.Index(((int(tid),tuple(a)+tuple(b),None)for tid,a,b in zip(valid,lo,hi)),properties=prop) if len(valid) else index.Index(properties=prop)
print('Spatial index',len(valid),'/',len(T),'triangles',flush=True)
count=0;candidate_count=0;strict_count=0;total_area=0.;largest=[];all_pairs=[];next_time=time.time()+30;by_source={};prefix=A.prefix or Path(A.file).stem;checkpoint=R/(prefix+'.scan-checkpoint.pkl');next_checkpoint=time.time()+180;begin=A.start;end=min(A.end if A.end is not None else len(valid),len(valid));state_names=['count','candidate_count','strict_count','total_area','largest','all_pairs','by_source']
if A.resume and checkpoint.exists():
 state=pickle.loads(checkpoint.read_bytes());assert state['inputSha']==hashlib.sha256(raw).hexdigest();globals().update(state['state']);begin=state['next'];print('Resumed scan',begin,flush=True)
for start in range(begin,end,A.batch):
 stop=min(start+A.batch,end);ids=valid[start:stop];candidate_ids,counts=tree.intersection_v(lo[start:stop]-A.distance*2,hi[start:stop]+A.distance*2);left=np.repeat(ids,counts.astype(np.int64));right=candidate_ids.astype(np.int64);once=right>left;left=left[once];right=right[once];candidate_count+=len(left)
 for chunk in range(0,len(left),50000):
  ai=left[chunk:chunk+50000];bi=right[chunk:chunk+50000];aa=T[ai].astype(float);bb=T[bi].astype(float);na=N[ai].astype(float);nb=N[bi].astype(float);ga=np.max(abs(np.einsum('ijk,ik->ij',bb-aa[:,0,None,:],na)),axis=1);gb=np.max(abs(np.einsum('ijk,ik->ij',aa-bb[:,0,None,:],nb)),axis=1);ok=(abs(np.sum(na*nb,axis=1))>=.99995)&(ga<=A.distance)&(gb<=A.distance);ai=ai[ok];bi=bi[ok];aa=aa[ok];bb=bb[ok];na=na[ok];gap=np.maximum(ga,gb)[ok];strict_count+=len(ai)
  if not len(ai):continue
  dom=np.argmax(abs(na),axis=1)
  for axis in range(3):
   take=np.flatnonzero(dom==axis)
   if not len(take):continue
   axes=[i for i in range(3)if i!=axis];ap=polygons(aa[take][:,:,axes]);bp=polygons(bb[take][:,:,axes]);areas=polygon_area(intersection(ap,bp));good=areas>A.min_area
   for pos,ar in zip(take[good],areas[good]):
    tid=int(ai[pos]);other=int(bi[pos]);pa=int(np.searchsorted(starts,tid,side='right')-1);pb=int(np.searchsorted(starts,other,side='right')-1);key=' | '.join(sorted([parts[pa]['source']or'unknown',parts[pb]['source']or'unknown']));by_source[key]=by_source.get(key,0)+1
    hit={'triangles':[tid,other],'a':parts[pa],'b':parts[pb],'projectedArea':float(ar),'maxSymmetricPlaneGap':float(gap[pos]),'bounds':[np.minimum(T[tid].min(0),T[other].min(0)).tolist(),np.maximum(T[tid].max(0),T[other].max(0)).tolist()]};count+=1;total_area+=ar;largest.append(hit);all_pairs.append((tid,other))
    if len(largest)>2000:largest=sorted(largest,key=lambda x:-x['projectedArea'])[:1000]
 if time.time()>next_time:print('Spatial scan',start,'/',len(valid),'pairs',count,'area',round(total_area,3),flush=True);next_time=time.time()+30
 if time.time()>next_checkpoint:
  state={'inputSha':hashlib.sha256(raw).hexdigest(),'next':stop,'state':{k:globals()[k]for k in state_names}};temp=checkpoint.with_suffix('.tmp');temp.write_bytes(pickle.dumps(state,protocol=5));temp.replace(checkpoint);next_checkpoint=time.time()+180;print('Scan checkpoint',stop,flush=True)
np.savez_compressed(R/(prefix+'.residual-pairs.npz'),pairs=np.array(all_pairs,dtype='<u4').reshape(-1,2),inputSha=hashlib.sha256(raw).hexdigest())
report={'file':A.file,'sha256':hashlib.sha256(raw).hexdigest(),'method':'Complete 3D expanded-AABB broadphase over all triangles above minimum area, no orientation/plane buckets; exact unoriented normal and symmetric vertex-plane tolerance; projected Shapely intersection. Pair IDs scanned once.','planeToleranceMetres':A.distance,'minimumProjectedOverlapAreaSquareMetres':A.min_area,'triangles':len(T),'trianglesAboveMinimumArea':len(valid),'validTriangleRange':[A.start,end],'zeroAreaTriangles':int((AREA==0).sum()),'broadphasePairs':candidate_count,'strictPlanePairs':strict_count,'residualOverlapPairs':count,'summedProjectedOverlapArea':total_area,'bySourcePair':by_source,'largest':sorted(largest,key=lambda x:-x['projectedArea'])[:1000],'seconds':time.time()-started};(R/(prefix+'.spatial-residual.json')).write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8');print(json.dumps({k:v for k,v in report.items()if k!='largest'}),flush=True)
