"""Source-preserving, audited offline cleanup. Never deploys or touches source."""
from pathlib import Path
import argparse,concurrent.futures,json,subprocess,sys,shutil,struct,hashlib,math
P=argparse.ArgumentParser();P.add_argument('--input',required=True,type=Path);P.add_argument('--output',required=True,type=Path);P.add_argument('--node',default='node');P.add_argument('--jobs',type=int,default=2);P.add_argument('--iterations',type=int,default=5);P.add_argument('--distance',type=float,default=.003);P.add_argument('--min-area',type=float,default=.0001);P.add_argument('--scan-only',action='store_true');P.add_argument('--units',required=True,choices=['metres'],help='Explicit source-unit declaration; no scaling is applied');A=P.parse_args();HERE=Path(__file__).resolve().parent;OUT=A.output.resolve();INPUT=A.input.resolve();
if not INPUT.is_file() or INPUT.suffix.lower()!='.glb':P.error('Input must be an existing GLB file')
if A.jobs<1 or A.iterations<0:P.error('jobs must be positive and iterations nonnegative')
if not math.isfinite(A.distance) or not 0<A.distance<=.003:P.error('distance must be positive and no larger than the reviewed 0.003 metre scope')
if not math.isfinite(A.min_area) or not 0<A.min_area<=.0001:P.error('min-area must be positive and no larger than 0.0001 square metre')
OUT.mkdir(parents=True,exist_ok=True)
if any(OUT.iterdir()):raise SystemExit('Output directory must be empty; a previous run is never overwritten.')
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
# The Python workers use their own file location as an isolated run root.
for name in ['clean-surfaces.py','sanitize-candidate.py','scan-spatial.py','merge-scans.py','validate-candidate.py','validate-input.py']:shutil.copy2(HERE/name,OUT/name)
# Resolve installed Node dependencies from the release directory, regardless
# of output location. No temporary node_modules installation is needed.
for name in ['decode.mjs','compress-lossless.mjs']:
 text=(HERE/name).read_text(encoding='utf8')
 for package,entry in [('@gltf-transform/core','dist/index.js'),('@gltf-transform/extensions','dist/index.js'),('@gltf-transform/functions','dist/index.js'),('meshoptimizer','index.js'),('draco3dgltf','draco3dgltf.js')]:
  location=HERE/'node_modules'/package/entry
  if not location.is_file():raise SystemExit(f'Missing dependency {package}; run npm install in {HERE}')
  text=text.replace("'"+package+"'","'"+location.as_uri()+"'")
 (OUT/name).write_text(text,encoding='utf8')
def run(args,log):
 print('Running',log,flush=True)
 with (OUT/(log+'.log')).open('w',encoding='utf8')as f:subprocess.run(args,check=True,cwd=OUT,stdout=f,stderr=subprocess.STDOUT)
def py(name,*args):return[sys.executable,str(OUT/name),*map(str,args)]
def scan(file,prefix):
 # Partition the valid triangle index range conservatively using total count.
 raw=(OUT/file).read_bytes();ln=struct.unpack_from('<I',raw,12)[0];d=json.loads(raw[20:20+ln]);total=sum(d['accessors'][p['indices']]['count']//3 for m in d['meshes']for p in m['primitives']);width=math.ceil(total/A.jobs);parts=[];tasks=[]
 # Worker end is clamped to valid count. Empty trailing partitions are safe
 # and omitted during merge to keep coverage ranges contiguous.
 with concurrent.futures.ThreadPoolExecutor(max_workers=A.jobs)as pool:
  for j in range(A.jobs):
   part=f'{prefix}-part{j}';parts.append(part);tasks.append(pool.submit(run,py('scan-spatial.py',file,'--prefix',part,'--start',j*width,'--end',(j+1)*width,'--distance',A.distance,'--min-area',A.min_area),part))
  for t in tasks:t.result()
 reports=[json.loads((OUT/(p+'.spatial-residual.json')).read_text(encoding='utf8'))for p in parts];parts=[p for p,r in zip(parts,reports)if r['validTriangleRange'][0]<r['validTriangleRange'][1]] or [parts[0]]
 run(py('merge-scans.py','--prefix',prefix,*parts),prefix+'-merge');return json.loads((OUT/(prefix+'.spatial-residual.json')).read_text(encoding='utf8'))
run(py('validate-input.py',str(INPUT),'--compressed-source'),'source-scope-validation')
run([A.node,str(OUT/'decode.mjs'),str(INPUT),str(OUT/'campus-decoded.glb')],'decode')
run(py('validate-input.py','campus-decoded.glb'),'input-scope-validation')
history=[];current='campus-decoded.glb'
if not A.scan_only:
 run(py('clean-surfaces.py','--source',current,'--prefix','pass0','--distance',A.distance),'pass0-clean')
 run(py('sanitize-candidate.py','pass0.glb','pass0-clean.glb'),'pass0-sanitize');current='pass0-clean.glb'
for iteration in range(A.iterations+1):
 prefix=f'audit{iteration}';report=scan(current,prefix);history.append({'file':current,'sha256':sha(OUT/current),'scan':prefix+'.spatial-residual.json','pairs':report['residualOverlapPairs'],'projectedOverlapArea':report['summedProjectedOverlapArea']})
 if report['residualOverlapPairs']==0:break
 if A.scan_only or iteration==A.iterations:break
 name=f'pass{iteration+1}';run(py('clean-surfaces.py','--source',current,'--prefix',name,'--residual-pairs',prefix+'.residual-pairs.npz','--distance',A.distance),name+'-clean');run(py('sanitize-candidate.py',name+'.glb',name+'-clean.glb'),name+'-sanitize');current=name+'-clean.glb'
accepted=history[-1]['pairs']==0
summary={'schema':'echo-campus.surface-cleanup-release.v1','input':str(INPUT),'inputSha256':sha(INPUT),'decodedSha256':sha(OUT/'campus-decoded.glb'),'candidate':current,'candidateSha256':sha(OUT/current),'acceptedWithinAuditScope':accepted,'scope':{'maximumSymmetricPlaneDistanceMetres':A.distance,'minimumProjectedOverlapSquareMetres':A.min_area,'normalDotMinimum':.99995,'units':A.units,'attributes':['POSITION','NORMAL']},'iterations':history,'deploymentPerformed':False}
run(py('validate-candidate.py',current),'readback')
readback=json.loads((OUT/(Path(current).stem+'.readback.json')).read_text(encoding='utf8'))
if any(readback['after'][key] for key in ['invalidIndices','invalidAttributes','badNormals','zeroAreaTriangles']):raise SystemExit('Readback quality gate failed; no accepted delivery produced')
summary['readbackAudit']=Path(current).stem+'.readback.json'
if accepted and not A.scan_only:
 run([A.node,str(OUT/'compress-lossless.mjs'),current,'venue-campus-clean.glb','--optimize'],'meshopt')
 summary['compressionAudit']='venue-campus-clean.audit.json';summary['delivery']='venue-campus-clean.glb'
(OUT/'release-summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps(summary,ensure_ascii=False,indent=2))
if not accepted:raise SystemExit('Residual overlaps remain. Candidate and complete audits are preserved, but no accepted delivery was produced.')
