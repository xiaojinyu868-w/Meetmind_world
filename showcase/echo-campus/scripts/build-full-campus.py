"""Assemble the visible source campus in its original engineering frame.

Requires numpy. Inputs are archive-verified SDK exports, not generated buildings.
The JSON selection file records component-level version choices. Original SKPs
and exported inputs remain untouched. Run with --help for paths.
"""
from pathlib import Path
import argparse, collections, hashlib, json, struct, time
import numpy as np

P = argparse.ArgumentParser()
P.add_argument('--source-dir', default='output/venue-models/ab')
P.add_argument('--output-dir', default='output/full-campus')
P.add_argument('--selection', default='output/full-campus/selection.json')
A = P.parse_args()
SRC, OUT = Path(A.source_dir), Path(A.output_dir)
OUT.mkdir(parents=True, exist_ok=True)
CFG = json.loads(Path(A.selection).read_text(encoding='utf8'))
ORIGIN = np.array([102.68817138671875, 0., -21.1610107421875])
START = time.time()
CAT = {x['output']: x for x in json.loads((SRC/'source-model-catalog.json').read_text(encoding='utf8'))['items']}
REPORT = {'schema':'echo-campus.full-campus-assembly.v1','origin':ORIGIN.tolist(), 'selection':CFG,
 'deduplication':{'method':'two independent uint64 fingerprints of sorted vertex hashes in original metre coordinates', 'quantizationMetres':0.001, 'geometryPositionsModified':False},'sources':[]}
DOC = {'asset':{'version':'2.0','generator':'Echo original-source campus assembly'},'scene':0,'scenes':[{'name':'Full campus in shared project coordinates','nodes':[0]}],
 'nodes':[{'name':'Complete source campus','children':[], 'extras':{'campusAssembly':True,'origin':ORIGIN.tolist()}}],
 'meshes':[],'materials':[],'buffers':[{'byteLength':0}],'bufferViews':[],'accessors':[]}
BLOB = bytearray()
SEEN = np.empty(0, dtype='V16')

def acc(arr, kind, ctype, target):
 while len(BLOB)%4: BLOB.append(0)
 offset=len(BLOB); BLOB.extend(arr.tobytes()); vi=len(DOC['bufferViews'])
 DOC['bufferViews'].append({'buffer':0,'byteOffset':offset,'byteLength':arr.nbytes,'target':target})
 row={'bufferView':vi,'componentType':ctype,'count':len(arr),'type':kind}
 if kind=='VEC3':row.update(min=arr.min(0).tolist(),max=arr.max(0).tolist())
 DOC['accessors'].append(row); return len(DOC['accessors'])-1

def point_hash(q, seed):
 q=q.astype(np.int64).view(np.uint64)
 with np.errstate(over='ignore'):
  return ((q[:,0]+np.uint64(0x9e3779b97f4a7c15+seed))*np.uint64(0xbf58476d1ce4e5b9)) ^ ((q[:,1]+np.uint64(0x94d049bb133111eb+seed))*np.uint64(0x369dea0f31a53f85)) ^ ((q[:,2]+np.uint64(0xd1b54a32d192ed03+seed))*np.uint64(0x94d049bb133111eb))

def tri_hash(v, f):
 out=np.empty(len(f),dtype=np.dtype([('a','<u8'),('b','<u8')])); q=np.rint(v*1000)
 for name,seed in [('a',0),('b',5743)]:
  hh=np.sort(point_hash(q,seed)[f],axis=1)
  with np.errstate(over='ignore'):out[name]=hh[:,0] ^ (hh[:,1]*np.uint64(0x9e3779b97f4a7c15)) ^ (hh[:,2]*np.uint64(0xbf58476d1ce4e5b9))
 return out.view('V16')

def bounds(v): return {'min':v.min(0).tolist(), 'max':v.max(0).tolist()}

for choice in CFG['sources']:
 sid=choice['id']; p=SRC/(sid+'.glb'); raw=p.read_bytes(); sha=hashlib.sha256(raw).hexdigest()
 assert sha==CAT[p.name]['outputSha256'], f'Unverified source {sid}'
 length=struct.unpack_from('<I',raw,12)[0]; source=json.loads(raw[20:20+length]); binary=memoryview(raw)[28+length:]
 row={'id':sid,'sourceFile':CAT[p.name]['source'],'sourceSha256':CAT[p.name]['sourceSha256'],'inputGLBSha256':sha,'inputTriangles':0,
      'skippedNodes':[],'removedEntourageTriangles':0,'removedUndergroundReferenceTriangles':0,'removedInsideHubVersionTriangles':0,'removedReplacedBridgeTriangles':0,'removedDuplicateTriangles':0,'outputTriangles':0,'materials':[]}
 groups=collections.defaultdict(list); originals={}; selected=set(choice.get('includeNodes',[])); skipped=set(choice.get('skipNodes',[])); entourage_nodes=set(); foliage_meshes=set()
 if choice.get('entourage'):
  ent=json.loads((OUT/choice['entourage']).read_text(encoding='utf8'))
  row['entourageManifestSha256']=hashlib.sha256((OUT/choice['entourage']).read_bytes()).hexdigest()
  for item in ent['groups']:
   for box in item.get('boxes',[]):
    if 'node' in box:entourage_nodes.add(box['node'])
   if item.get('category')=='foliage':foliage_meshes.update(item.get('sourceMeshIds',[]))
 row['auditedEntourageNodes']=sorted(entourage_nodes);row['auditedFoliageMeshIds']=sorted(foliage_meshes)
 def read(i):
  a=source['accessors'][i];view=source['bufferViews'][a['bufferView']];size={'SCALAR':1,'VEC3':3}[a['type']]
  return np.frombuffer(binary,dtype={5126:'<f4',5125:'<u4',5123:'<u2'}[a['componentType']],count=a['count']*size,offset=view.get('byteOffset',0)+a.get('byteOffset',0)).reshape(-1,size)
 cache={}
 def mesh(i):
  if i not in cache:cache[i]=[(read(pr['attributes']['POSITION']),read(pr['attributes']['NORMAL']),read(pr['indices']).reshape(-1,3),pr['material']) for pr in source['meshes'][i]['primitives']]
  return cache[i]
 def count_subtree(i):
  nd=source['nodes'][i];n=sum(len(f)for v,n,f,m in mesh(nd['mesh'])) if 'mesh'in nd else 0
  return n+sum(count_subtree(c)for c in nd.get('children',[]))
 def walk(i,parent,active=False,in_c_tower_bridge=False):
  nd=source['nodes'][i];world=parent@np.array(nd.get('matrix',np.eye(4).ravel(order='F'))).reshape(4,4,order='F')
  active=active or not selected or i in selected
  in_c_tower_bridge=in_c_tower_bridge or (sid=='venue-c-commercial-20230518' and i==1)
  if i in skipped:
   row['skippedNodes'].append({'node':i,'triangles':count_subtree(i),'reason':choice.get('skipReason','Source component version replacement')});return
  if active and 'mesh'in nd:
   mi=nd['mesh']
   if i in entourage_nodes or mi in foliage_meshes:row['removedEntourageTriangles']+=sum(len(f)for v,n,f,m in mesh(mi))
   else:
    normal_matrix=np.linalg.pinv(world[:3,:3]); mirrored=np.linalg.det(world[:3,:3])<0
    for v,n,f,matid in mesh(mi):
     row['inputTriangles']+=len(f);vv=v.astype(np.float64)@world[:3,:3].T+world[:3,3]
     f=f[:,[0,2,1]] if mirrored else f.copy()
     tri=vv[f]; keep=tri[:,:,1].max(1)>=-100
     row['removedUndergroundReferenceTriangles']+=int((~keep).sum())
     if in_c_tower_bridge:
      x0,x1,z0,z1=choice['towerBridgeSelection']['keepAnyIntersectingTriangleXZ']
      intersects=(tri[:,:,0].max(1)>=x0)&(tri[:,:,0].min(1)<=x1)&(tri[:,:,2].max(1)>=z0)&(tri[:,:,2].min(1)<=z1)
      row['removedReplacedBridgeTriangles']+=int((~intersects&keep).sum());keep &= intersects
     if choice.get('excludeHubInterior'):
      hub=CFG['hubBounds'];inside=(tri[:,:,0].min(1)>=hub['minX'])&(tri[:,:,0].max(1)<=hub['maxX'])&(tri[:,:,2].min(1)>=hub['minZ'])&(tri[:,:,2].max(1)<=hub['maxZ'])
      row['removedInsideHubVersionTriangles']+=int((inside&keep).sum());keep &= ~inside
     f=f[keep]
     if not len(f):continue
     nn=n.astype(np.float64)@normal_matrix;nn/=np.maximum(np.linalg.norm(nn,axis=1,keepdims=True),1e-10)
     mat=source['materials'][matid];originals[matid]=mat
     groups[matid].append((vv,nn.astype('<f4'),f,mi))
  for child in nd.get('children',[]):walk(child,world,active,in_c_tower_bridge)
 for root in source['scenes'][0]['nodes']:walk(root,np.eye(4))
 print(sid, 'collected',row['inputTriangles'],'triangles',len(groups),'materials',flush=True)
 # Sort once per source, not once per material. Dual hash fingerprints use
 # fixed-width bytes for efficient collision-resistant identity comparison.
 packed_groups=[]; all_hashes=[]; group_offsets=[0]
 for matid,parts in groups.items():
  vs=[];ns=[];fs=[];offset=0
  for v,n,f,mi in parts:vs.append(v);ns.append(n);fs.append(f+offset);offset+=len(v)
  v=np.concatenate(vs);n=np.concatenate(ns);f=np.concatenate(fs);th=tri_hash(v,f)
  packed_groups.append((matid,v,n,f,sorted(set(x[3]for x in parts))))
  all_hashes.append(th);group_offsets.append(group_offsets[-1]+len(f))
 del groups
 all_hashes=np.concatenate(all_hashes);unique,first=np.unique(all_hashes,return_index=True);nonduplicate=~np.isin(unique,SEEN,assume_unique=True)
 accepted=np.zeros(len(all_hashes),dtype=bool);accepted[first[nonduplicate]]=True;SEEN=np.union1d(SEEN,unique[nonduplicate])
 del all_hashes,unique,first,nonduplicate
 node_index=len(DOC['nodes']); DOC['nodes'].append({'name':sid,'children':[],'extras':{'sourceVenue':sid,'sourceFile':row['sourceFile']}});DOC['nodes'][0]['children'].append(node_index)
 source_mins=[];source_maxs=[];core_points=[]
 for gi,(matid,v,n,f,source_mesh_ids) in enumerate(packed_groups):
  keep=accepted[group_offsets[gi]:group_offsets[gi+1]]
  row['removedDuplicateTriangles']+=int((~keep).sum());f=f[keep]
  if not len(f):continue
  used,inv=np.unique(f,return_inverse=True);v=v[used];n=n[used];f=inv.reshape(-1,3).astype('<u4');v=(v-ORIGIN).astype('<f4')
  material=json.loads(json.dumps(originals[matid]));pbr=material['pbrMetallicRoughness'];rgb=np.array(pbr['baseColorFactor'][:3]);alpha=pbr['baseColorFactor'][3]
  if alpha<.99:rgb=np.array([.32,.43,.45])
  rgb=np.where(rgb<=.04045,rgb/12.92,((rgb+.055)/1.055)**2.4)
  pbr.update(baseColorFactor=[*rgb.tolist(),1.],metallicFactor=.15 if alpha<.99 else .03,roughnessFactor=.35 if alpha<.99 else .76)
  material.pop('alphaMode',None);material.pop('alphaCutoff',None);material['extras']={'sourceVenue':sid,'sourceMaterial':originals[matid]['name']}
  material_index=len(DOC['materials']);DOC['materials'].append(material)
  pos=acc(v,'VEC3',5126,34962);norm=acc(n,'VEC3',5126,34962);idx=acc(f.ravel(),'SCALAR',5125,34963)
  mi=len(DOC['meshes']);DOC['meshes'].append({'name':material['name'],'extras':{'sourceVenue':sid,'sourceMeshIds':source_mesh_ids},'primitives':[{'attributes':{'POSITION':pos,'NORMAL':norm},'indices':idx,'material':material_index}]})
  child=len(DOC['nodes']);DOC['nodes'].append({'name':material['name'],'mesh':mi,'extras':{'sourceVenue':sid}});DOC['nodes'][node_index]['children'].append(child)
  row['outputTriangles']+=len(f);row['materials'].append({'name':material['name'],'triangles':len(f),'bounds':bounds(v)})
  source_mins.append(v.min(0));source_maxs.append(v.max(0));high=v[v[:,1]>20]
  if len(high):core_points.extend([high.min(0),high.max(0)])
  del v,n,f,used,inv
 row['bounds']={'min':np.array(source_mins).min(0).tolist(),'max':np.array(source_maxs).max(0).tolist()}
 row['above20mBounds']=bounds(np.array(core_points)) if core_points else None
 REPORT['sources'].append(row)
 print(sid,'output',row['outputTriangles'],'duplicates',row['removedDuplicateTriangles'],'bounds',row['above20mBounds'],flush=True)
 del packed_groups,accepted,raw,binary,source,cache

DOC['buffers'][0]['byteLength']=len(BLOB);j=json.dumps(DOC,separators=(',',':')).encode();j+=b' '*(-len(j)%4)
output=struct.pack('<III',0x46546c67,2,28+len(j)+len(BLOB))+struct.pack('<II',len(j),0x4e4f534a)+j+struct.pack('<II',len(BLOB),0x004e4942)+BLOB
path=OUT/'venue-campus-uncompressed.glb';path.write_bytes(output)
REPORT['output']={'file':path.name,'bytes':len(output),'sha256':hashlib.sha256(output).hexdigest(),'triangles':sum(x['outputTriangles']for x in REPORT['sources']),'primitiveCount':len(DOC['meshes'])}
REPORT['elapsedSeconds']=time.time()-START
(OUT/'venue-campus.assembly.audit.json').write_text(json.dumps(REPORT,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps(REPORT['output']),flush=True)
