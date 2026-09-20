"""All-orientation, source-preserving triangle coverage cleanup candidate.

Spatial plane buckets only propose candidates. Every subtraction requires a
normal and point-to-plane check. Geometry is only removed where covered by an
earlier triangle; the remaining polygon is retriangulated and vertex normals
are barycentrically interpolated. Originals stay untouched.
"""
from pathlib import Path
import argparse,collections,json,struct,time,hashlib,pickle
import numpy as np
from shapely.geometry import Polygon
from shapely.strtree import STRtree
from shapely import union_all,constrained_delaunay_triangles

P=argparse.ArgumentParser();P.add_argument('--source',default='campus-decoded.glb');P.add_argument('--pass-index',type=int,default=0);P.add_argument('--distance',type=float,default=.003);P.add_argument('--prefix',default='candidate');P.add_argument('--resume',action='store_true');P.add_argument('--start-group',type=int,default=0);P.add_argument('--end-group',type=int);P.add_argument('--state-only',action='store_true');P.add_argument('--merge-states',nargs='*');P.add_argument('--residual-pairs');A=P.parse_args()
R=Path(__file__).parent;started=time.time();raw=(R/A.source).read_bytes();l=struct.unpack_from('<I',raw,12)[0];D=json.loads(raw[20:20+l]);blob=memoryview(raw)[28+l:]
assert not D.get('textures') and not D.get('images') and not D.get('extensionsUsed'), 'This source-preserving cleaner requires decoded untextured campus geometry'
assert not any(any(k in node for k in ['matrix','translation','rotation','scale'])for node in D['nodes']), 'Transforms must be baked before cleanup'
def read(i):
 ac=D['accessors'][i];bv=D['bufferViews'][ac['bufferView']];n={'SCALAR':1,'VEC3':3,'VEC2':2,'VEC4':4}[ac['type']];dt=np.dtype({5126:'<f4',5125:'<u4',5123:'<u2',5121:'u1'}[ac['componentType']]);return np.ndarray((ac['count'],n),dt,buffer=blob,offset=bv.get('byteOffset',0)+ac.get('byteOffset',0),strides=(bv.get('byteStride',dt.itemsize*n),dt.itemsize))
parts=[];alltri=[];allnormal=[];allarea=[];allkey=[];part_starts=[0];material_priority=[]
for mi,m in enumerate(D['meshes']):
 for pi,p in enumerate(m['primitives']):
  attrs={k:read(i).copy()for k,i in p['attributes'].items()};f=read(p['indices']).reshape(-1,3).copy();t=attrs['POSITION'][f].astype(np.float64);cross=np.cross(t[:,1]-t[:,0],t[:,2]-t[:,0]);length=np.linalg.norm(cross,axis=1);n=cross/np.maximum(length[:,None],1e-30);dominant=np.argmax(abs(n),axis=1);sign=np.sign(n[np.arange(len(n)),dominant]);n*=sign[:,None];distance=np.sum(n*t.mean(1),axis=1)
  # Shift bins between passes: avoids placing a coplanar pair permanently on
  # opposite quantization boundaries. Every match still needs exact geometry.
  shift=(A.pass_index%2)*.5;normal_step=.005;distance_step=.03
  key=np.concatenate([np.floor(n/normal_step+shift),np.floor(distance[:,None]/distance_step+shift)],axis=1).astype('<i4')
  alltri.append(t.astype('<f4'));allnormal.append(n.astype('<f4'));allarea.append((length*.5).astype('<f4'));allkey.append(key)
  mat=D['materials'][p['material']];name=mat.get('name','').lower();priority=2 if any(s in name for s in ['beton','concrete','plaster','original default']) else 0 if any(s in name for s in ['glass','metal','steel','alum','stone','silver','marble']) else 1
  material_priority.extend([priority]*len(f));parts.append({'mesh':mi,'primitive':pi,'material':p['material'],'attributes':attrs,'faces':f,'source':m.get('extras',{}).get('sourceVenue','unknown'),'name':mat.get('name','')});part_starts.append(part_starts[-1]+len(f))
print('Loaded',part_starts[-1],'triangles',flush=True)
T=np.concatenate(alltri);N=np.concatenate(allnormal);AREA=np.concatenate(allarea);KEY=np.concatenate(allkey);PRIORITY=np.array(material_priority,dtype=np.uint8);del alltri,allnormal,allarea,allkey,material_priority
valid=AREA>1e-12;degenerate=int((~valid).sum());ids=np.flatnonzero(valid)
keyview=np.ascontiguousarray(KEY).view('V16').ravel();order=ids[np.argsort(keyview[ids],kind='stable')];breaks=np.r_[0,np.flatnonzero(keyview[order][1:]!=keyview[order][:-1])+1,len(order)];del KEY,keyview
if A.residual_pairs:
 pairfile=np.load(R/A.residual_pairs);assert str(pairfile['inputSha'])==hashlib.sha256(raw).hexdigest();pairs=pairfile['pairs'];parent={}
 def find(x):
  parent.setdefault(x,x)
  while parent[x]!=x:parent[x]=parent[parent[x]];x=parent[x]
  return x
 for left,right in pairs:
  left,right=find(int(left)),find(int(right))
  if left!=right:parent[right]=left
 components=collections.defaultdict(list)
 for i in list(parent):components[find(i)].append(i)
 groups=sorted(components.values(),key=lambda g:min(g));order=np.array([i for g in groups for i in g],dtype=np.int64);breaks=np.r_[0,np.cumsum([len(g)for g in groups])];print('Residual connected components',len(groups),'triangles',len(order),flush=True)
 component_diagnostics=[]
 for component_index,g in enumerate(groups):
  gn=N[g].astype(float);anchor=gn[0];dot=np.abs(gn@anchor);projection=np.max(np.min(abs(gn),axis=0));component_diagnostics.append({'component':component_index,'triangles':len(g),'minimumNormalDotToAnchor':float(dot.min()),'bestMinimumProjectionFactor':float(projection)})
 (R/(A.prefix+'.components.json')).write_text(json.dumps({'inputSha':hashlib.sha256(raw).hexdigest(),'count':len(groups),'largest':sorted(component_diagnostics,key=lambda x:-x['triangles'])[:100],'minimumProjectionFactor':min([x['bestMinimumProjectionFactor']for x in component_diagnostics],default=1.)},indent=2))
print('Groups',len(breaks)-1,'degenerate',degenerate,flush=True)
removed=np.zeros(len(T),dtype=bool);removed[~valid]=True;replacements={};audit=[];count_changed=0;removed_area=0.;coverage_loss=0.;coverage_gain=0.;candidate_pairs=0;strict_pairs=0;retriangulation_loss=0.;retriangulation_gain=0.;retriangulation_max_loss=0.;retriangulation_max_gain=0.;next_progress=time.time()+30
numerical_skips=[];start_group=A.start_group;checkpoint=R/(A.prefix+'.checkpoint.pkl');next_checkpoint=time.time()+180
state_names=['removed','replacements','audit','count_changed','removed_area','coverage_loss','coverage_gain','candidate_pairs','strict_pairs','retriangulation_loss','retriangulation_gain','retriangulation_max_loss','retriangulation_max_gain','numerical_skips']
if A.resume and checkpoint.exists():
 state=pickle.loads(checkpoint.read_bytes());assert state['inputSha']==hashlib.sha256(raw).hexdigest();globals().update(state['state']);start_group=state['nextGroup'];print('Resumed',start_group,flush=True)
if A.merge_states:
 for filename in A.merge_states:
  state=pickle.loads((R/filename).read_bytes());assert state['inputSha']==hashlib.sha256(raw).hexdigest()
  for key,value in state['state'].items():
   if key=='removed':removed|=value
   elif key=='replacements':replacements.update(value)
   elif key in ['audit','numerical_skips']:globals()[key].extend(value)
   elif key.startswith('retriangulation_max'):globals()[key]=max(globals()[key],value)
   else:globals()[key]+=value
 start_group=len(breaks)-1
for gi in range(start_group,min(A.end_group if A.end_group is not None else len(breaks)-1,len(breaks)-1)):
 if time.time()>next_checkpoint:
  state={'inputSha':hashlib.sha256(raw).hexdigest(),'nextGroup':gi,'state':{k:globals()[k]for k in state_names}};temporary=checkpoint.with_suffix('.tmp');temporary.write_bytes(pickle.dumps(state,protocol=5));temporary.replace(checkpoint);next_checkpoint=time.time()+180;print('Checkpoint',gi,flush=True)
 group=order[breaks[gi]:breaks[gi+1]]
 if len(group)<2:continue
 # The independent scanner uses the smaller original triangle ID's dominant
 # projection. Keep that orientation stable during residual cleanup; choosing
 # the numerically 'best' component axis can miss very thin 45-degree layers
 # that overlap in one projection while separated in the tied axis.
 residual_anchor=int(np.min(group))
 # Larger stable surfaces are retained first within the material priority.
 group=group[np.lexsort((group,-AREA[group],PRIORITY[group]))]
 dominant=int(np.argmax(abs(N[residual_anchor])))if A.residual_pairs else int(np.argmax(abs(N[group[0]])));axes=[i for i in range(3)if i!=dominant]
 if np.min(abs(N[group,dominant]))<.25:
  numerical_skips.append({'group':gi,'reason':'Connected component spans incompatible projection orientations; originals retained','triangles':len(group)});continue
 polys=[Polygon(T[i][:,axes])for i in group];tree=STRtree(polys);accepted={}
 for rank,tid in enumerate(group):
  poly=polys[rank]
  if poly.area<1e-12:continue
  earlier=tree.query(poly);earlier=earlier[earlier<rank]
  if not len(earlier):continue
  candidate_pairs+=len(earlier);blockers=[];verified=[]
  a=T[tid].astype(float);na=N[tid].astype(float)
  # Reject non-coplanar bounding-box neighbors in batches before GEOS work.
  # This is the same symmetric plane predicate as the scalar safety check.
  others=group[earlier];nn=N[others].astype(float);tt=T[others].astype(float)
  match=(abs(nn@na)>=.99995)&(np.max(abs((tt-a[0])@na),axis=1)<=A.distance)&(np.max(abs(np.einsum('ijk,ik->ij',a[None,:,:]-tt[:,0,None,:],nn)),axis=1)<=A.distance)
  earlier=earlier[match]
  for j in earlier:
   other=group[j];other_poly=accepted.get(int(j),polys[j])
   if other_poly.is_empty:continue
   # The identical symmetric plane predicate was already evaluated in the
   # vectorized match array above; do not repeat it inside the GEOS loop.
   # Only retained coverage may block; otherwise a chain of separated thin
   # planes could erase geometry beyond the bounded coplanarity tolerance.
   intersection=poly.intersection(other_poly)
   if intersection.area<=max(1e-10,poly.area*1e-10):continue
   blockers.append(other_poly);verified.append(int(other));strict_pairs+=1
  if not blockers:continue
  cover=union_all(blockers);cut=poly.difference(cover)
  diff=poly.area-cut.area
  if diff<=max(1e-9,poly.area*1e-9):continue
  # Equality is verified in projected area before geometry is changed.
  rebuilt=union_all([cut,poly.intersection(cover)]);loss=poly.difference(rebuilt).area;gain=rebuilt.difference(poly).area
  if loss>max(1e-7,poly.area*1e-8)or gain>max(1e-7,poly.area*1e-8):
   numerical_skips.append({'triangle':int(tid),'reason':'GEOS identity instability; original retained','loss':loss,'gain':gain});continue
  coverage_loss+=loss;coverage_gain+=gain;removed_area+=diff/max(abs(na[dominant]),1e-10);count_changed+=1;removed[tid]=True;accepted[int(rank)]=cut
  if not cut.is_empty and cut.area>1e-10:
   chunks=[]
   geometries=[cut]if cut.geom_type=='Polygon'else list(cut.geoms)
   for geom in geometries:
    if geom.geom_type!='Polygon' or geom.area<=1e-10:continue
    for tri in constrained_delaunay_triangles(geom).geoms:
     if tri.area<=1e-12:continue
     xy=np.array(tri.exterior.coords)[:3];basis=np.column_stack([a[1,axes]-a[0,axes],a[2,axes]-a[0,axes]]);uv=np.linalg.solve(basis,(xy-a[0,axes]).T).T;bary=np.column_stack([1-uv.sum(1),uv]);xyz=bary@a
     if np.dot(np.cross(xyz[1]-xyz[0],xyz[2]-xyz[0]),np.cross(a[1]-a[0],a[2]-a[0]))<0:xyz=xyz[[0,2,1]];bary=bary[[0,2,1]]
     chunks.append((xyz.astype('<f4'),bary.astype(float)))
   if not chunks:
    numerical_skips.append({'triangle':int(tid),'reason':'Nonempty unique coverage could not be triangulated; original retained','area':float(cut.area)});removed[tid]=False;accepted.pop(int(rank),None);count_changed-=1;removed_area-=diff/max(abs(na[dominant]),1e-10);continue
   if chunks:
    actual=union_all([Polygon(xyz[:,axes])for xyz,bary in chunks]);tri_loss=cut.difference(actual).area;tri_gain=actual.difference(cut).area;retriangulation_loss+=tri_loss;retriangulation_gain+=tri_gain;retriangulation_max_loss=max(retriangulation_max_loss,tri_loss);retriangulation_max_gain=max(retriangulation_max_gain,tri_gain)
    # Float32 positions at campus coordinates have micrometre-scale edge
    # noise. Surface loss/gain must remain beneath that measured perimeter
    # envelope, not merely satisfy the exact double-precision identity.
    threshold=max(1e-7,cut.length*.00015)
    if tri_loss>threshold or tri_gain>threshold:
     numerical_skips.append({'triangle':int(tid),'reason':'Float32 retriangulation outside coverage envelope; original retained','loss':tri_loss,'gain':tri_gain});removed[tid]=False;accepted.pop(int(rank),None);count_changed-=1;removed_area-=diff/max(abs(na[dominant]),1e-10);continue
    replacements[int(tid)]=chunks
  if len(audit)<20000:audit.append({'triangle':int(tid),'part':int(np.searchsorted(part_starts,tid,side='right')-1),'blockers':verified[:12],'sourceArea':float(AREA[tid]),'removedArea':float(diff/max(abs(na[dominant]),1e-10)),'replacementTriangles':len(replacements.get(int(tid),[])),'bounds':[a.min(0).tolist(),a.max(0).tolist()]})
 if time.time()>next_progress:print('Progress',gi,'/',len(breaks)-1,'changed',count_changed,'area',round(removed_area,1),flush=True);next_progress=time.time()+30

if A.state_only:
 state={'inputSha':hashlib.sha256(raw).hexdigest(),'nextGroup':A.end_group,'state':{k:globals()[k]for k in state_names}};(R/(A.prefix+'.state.pkl')).write_bytes(pickle.dumps(state,protocol=5));print('PARTITION COMPLETE',A.prefix,'changed',count_changed,flush=True);raise SystemExit(0)

OUT={'asset':D['asset'],'scene':D['scene'],'scenes':D['scenes'],'nodes':D['nodes'],'meshes':[],'materials':D['materials'],'buffers':[{'byteLength':0}],'bufferViews':[],'accessors':[]};output=bytearray()
def acc(a,typ,ctype,target):
 while len(output)%4:output.append(0)
 vi=len(OUT['bufferViews']);OUT['bufferViews'].append({'buffer':0,'byteOffset':len(output),'byteLength':a.nbytes,'target':target});output.extend(a.tobytes());ac={'bufferView':vi,'componentType':ctype,'count':len(a),'type':typ}
 if typ=='VEC3':ac.update(min=a.min(0).tolist(),max=a.max(0).tolist())
 OUT['accessors'].append(ac);return len(OUT['accessors'])-1
for m in D['meshes']:
 mo={k:v for k,v in m.items()if k!='primitives'};mo['primitives']=[];OUT['meshes'].append(mo)
totals=collections.defaultdict(lambda:{'inputTriangles':0,'outputTriangles':0,'modifiedTriangles':0,'removedDegenerate':0});output_triangles=0;max_bound_delta=0.
for part_index,part in enumerate(parts):
 begin,end=part_starts[part_index:part_index+2];keep=~removed[begin:end];f=part['faces'];attrs=part['attributes'];selected=f[keep];out_attrs={k:[v]for k,v in attrs.items()};out_indices=[selected];offset=len(attrs['POSITION'])
 for global_id in sorted(i for i in replacements if begin<=i<end):
  oldface=f[global_id-begin]
  for xyz,bary in replacements[global_id]:
   for name,values in attrs.items():
    values=xyz if name=='POSITION'else bary@values[oldface]
    if name=='NORMAL':values=values/np.maximum(np.linalg.norm(values,axis=1,keepdims=True),1e-12)
    out_attrs[name].append(values.astype('<f4'))
   out_indices.append(np.array([[offset,offset+1,offset+2]],dtype='<u4'));offset+=3
 ff=np.concatenate(out_indices)if out_indices else np.empty((0,3),dtype='<u4')
 if not len(ff):continue
 used,inv=np.unique(ff,return_inverse=True);ff=inv.reshape(-1).astype('<u4');aa={k:np.concatenate(v)[used]for k,v in out_attrs.items()};pr={'attributes':{},'material':part['material'],'mode':4}
 for name,values in aa.items():pr['attributes'][name]=acc(values.astype('<f4'),'VEC'+str(values.shape[1]),5126,34962)
 pr['indices']=acc(ff,'SCALAR',5125,34963);OUT['meshes'][part['mesh']]['primitives'].append(pr);output_triangles+=len(ff)//3
 s=totals[part['source']];s['inputTriangles']+=len(f);s['outputTriangles']+=len(ff)//3;s['modifiedTriangles']+=int(removed[begin:end].sum());s['removedDegenerate']+=int((~valid[begin:end]).sum())
 # Bounds can change for a fully occluded component, but globally covered
 # architecture remains checked via planar coverage, not arbitrary deletion.
OUT['buffers'][0]['byteLength']=len(output);j=json.dumps(OUT,separators=(',',':'),ensure_ascii=False).encode();j+=b' '*(-len(j)%4);data=struct.pack('<III',0x46546c67,2,28+len(j)+len(output))+struct.pack('<II',len(j),0x4e4f534a)+j+struct.pack('<II',len(output),0x004e4942)+output
dest=R/(A.prefix+'.glb');dest.write_bytes(data)
report={'schema':'echo-campus.surface-cleanup.v1','input':{'file':A.source,'sha256':hashlib.sha256(raw).hexdigest(),'triangles':len(T)},'output':{'file':dest.name,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest(),'triangles':output_triangles},'settings':{'planeToleranceMetres':A.distance,'normalDotMinimum':.99995,'normalBucketStep':.005,'distanceBucketStep':.03,'passIndex':A.pass_index,'allOrientations':True,'positionMovedExceptFloatRoundoff':False},'zeroAreaTrianglesRemoved':degenerate,'modifiedTriangles':count_changed,'candidatePairs':candidate_pairs,'strictOverlapPairs':strict_pairs,'duplicateSurfaceAreaRemoved':removed_area,'projectedCoverageLoss':coverage_loss,'projectedCoverageGain':coverage_gain,'actualFloat32Retriangulation':{'totalProjectedLoss':retriangulation_loss,'totalProjectedGain':retriangulation_gain,'maxPolygonLoss':retriangulation_max_loss,'maxPolygonGain':retriangulation_max_gain},'perSource':dict(totals),'modifications':audit,'modificationLogTruncated':count_changed>len(audit),'seconds':time.time()-started}
report['numericalSkips']=numerical_skips
(R/(A.prefix+'.audit.json')).write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8');print(json.dumps({k:v for k,v in report.items()if k not in ['modifications','perSource']}),flush=True)
