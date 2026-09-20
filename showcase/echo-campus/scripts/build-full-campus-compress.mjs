/** Compress the assembled campus without moving any source region. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
const ROOT=path.dirname(fileURLToPath(import.meta.url));
const TOOLS=process.env.ECHO_GLTF_TOOLS || path.join(ROOT,'tools/node_modules');
const imp=relative=>import(pathToFileURL(path.join(TOOLS,relative)).href);
const {NodeIO}=await imp('@gltf-transform/core/dist/index.js');
const {ALL_EXTENSIONS}=await imp('@gltf-transform/extensions/dist/index.js');
const {weldPrimitive,simplifyPrimitive,compactPrimitive,prune,draco,getBounds}=await imp('@gltf-transform/functions/dist/index.js');
const {MeshoptSimplifier}=await imp('meshoptimizer/index.js');
const require=createRequire(import.meta.url), draco3d=require(path.join(TOOLS,'draco3dgltf'));
await MeshoptSimplifier.ready;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'draco3d.encoder':await draco3d.createEncoderModule(),'draco3d.decoder':await draco3d.createDecoderModule()});
const source=path.resolve(process.argv[2]||path.join(ROOT,'venue-campus-uncompressed.glb'));
const output=path.resolve(process.argv[3]||path.join(ROOT,'venue-campus.glb'));
const sha=b=>createHash('sha256').update(b).digest('hex');
const settings={ratio:.45,error:.00008,lockBorder:true,chunkMetres:128,minChunkTriangles:32000,quantizePosition:20,quantizeNormal:12};
const parts=doc=>doc.getRoot().listMeshes().flatMap(mesh=>mesh.listPrimitives().map(primitive=>({mesh,primitive})));
const triangles=p=>(p.getIndices()?.getCount()||p.getAttribute('POSITION').getCount())/3;
function addSurfaceCells(p,cells){
 const a=p.getAttribute('POSITION').getArray(),idx=p.getIndices().getArray();
 for(let i=0;i<idx.length;i+=3){
  const ia=idx[i]*3,ib=idx[i+1]*3,ic=idx[i+2]*3;if(Math.max(a[ia+1],a[ib+1],a[ic+1])<=20)continue;
  let poly=[[a[ia],a[ia+1],a[ia+2]],[a[ib],a[ib+1],a[ib+2]],[a[ic],a[ic+1],a[ic+2]]];
  if(Math.min(a[ia+1],a[ib+1],a[ic+1])<20){const clipped=[];for(let j=0;j<poly.length;j++){const b=poly[j],c=poly[(j+1)%poly.length];if(b[1]>=20)clipped.push(b);if((b[1]>=20)!==(c[1]>=20)){const t=(20-b[1])/(c[1]-b[1]);clipped.push([b[0]+(c[0]-b[0])*t,20,b[2]+(c[2]-b[2])*t]);}}poly=clipped;}
  const x0=Math.floor(Math.min(...poly.map(v=>v[0]))/10),x1=Math.floor(Math.max(...poly.map(v=>v[0]))/10),z0=Math.floor(Math.min(...poly.map(v=>v[2]))/10),z1=Math.floor(Math.max(...poly.map(v=>v[2]))/10);
  for(let x=x0;x<=x1;x++)for(let z=z0;z<=z1;z++){
   const key=`${x},${z}`;if(cells.has(key))continue;let outside=false;
   for(let j=0;j<poly.length;j++){const b=poly[j],c=poly[(j+1)%poly.length],nx=-(c[2]-b[2]),nz=c[0]-b[0],projections=poly.map(v=>v[0]*nx+v[2]*nz),center=(x+.5)*10*nx+(z+.5)*10*nz,radius=5*(Math.abs(nx)+Math.abs(nz));if(Math.max(...projections)<center-radius-1e-7||Math.min(...projections)>center+radius+1e-7){outside=true;break;}}
   if(!outside)cells.add(key);
  }
 }
}
function summary(doc){
 const list=parts(doc),regions={};
 for(const {mesh,primitive:p}of list){
  const id=mesh.getExtras().sourceVenue;
  if(!regions[id])regions[id]={triangles:0,primitives:0,materials:[],bounds:{min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]},above20mBounds:{min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]},above20mGrid:new Set(),above20mSurfaceGrid:new Set()};
  const r=regions[id];r.triangles+=triangles(p);r.primitives++;r.materials.push(p.getMaterial()?.getName());
  const pos=p.getAttribute('POSITION').getArray();
  for(let i=0;i<pos.length;i+=3){for(let axis=0;axis<3;axis++){r.bounds.min[axis]=Math.min(r.bounds.min[axis],pos[i+axis]);r.bounds.max[axis]=Math.max(r.bounds.max[axis],pos[i+axis]);}if(pos[i+1]>20){for(let axis=0;axis<3;axis++){r.above20mBounds.min[axis]=Math.min(r.above20mBounds.min[axis],pos[i+axis]);r.above20mBounds.max[axis]=Math.max(r.above20mBounds.max[axis],pos[i+axis]);}r.above20mGrid.add(`${Math.floor(pos[i]/10)},${Math.floor(pos[i+2]/10)}`);}}
  addSurfaceCells(p,r.above20mSurfaceGrid);
 }
 for(const x of Object.values(regions)){x.materials=[...new Set(x.materials)].sort();x.above20mGrid=[...x.above20mGrid].sort();x.above20mSurfaceGrid=[...x.above20mSurfaceGrid].sort();if(!x.above20mGrid.length)x.above20mBounds=null;}
 return {triangles:list.reduce((n,{primitive:p})=>n+triangles(p),0),vertices:list.reduce((n,{primitive:p})=>n+p.getAttribute('POSITION').getCount(),0),primitives:list.length,bounds:doc.getRoot().listScenes().map(getBounds),regions};
}
const started=Date.now(), bytes=await fs.readFile(source), doc=await io.readBinary(bytes),before=summary(doc),changes=[];
console.log(JSON.stringify({stage:'loaded',triangles:before.triangles,primitives:before.primitives}));
for(const {mesh,primitive:p}of parts(doc)){const n=triangles(p);if(n>=256){weldPrimitive(p);simplifyPrimitive(p,{simplifier:MeshoptSimplifier,ratio:settings.ratio,error:settings.error,lockBorder:settings.lockBorder});}changes.push({sourceVenue:mesh.getExtras().sourceVenue,material:p.getMaterial()?.getName(),before:n,after:triangles(p)});}
const simplified=summary(doc);console.log(JSON.stringify({stage:'simplified',triangles:simplified.triangles}));
for(const {mesh,primitive:p}of [...parts(doc)]){
 if(triangles(p)<settings.minChunkTriangles)continue;
 const pos=p.getAttribute('POSITION').getArray(),idx=p.getIndices().getArray(),cells=new Map();
 for(let i=0;i<idx.length;i+=3){const a=idx[i]*3,b=idx[i+1]*3,c=idx[i+2]*3;const x=(pos[a]+pos[b]+pos[c])/3,z=(pos[a+2]+pos[b+2]+pos[c+2])/3;const key=`${Math.floor(x/settings.chunkMetres)},${Math.floor(z/settings.chunkMetres)}`;if(!cells.has(key))cells.set(key,[]);cells.get(key).push(idx[i],idx[i+1],idx[i+2]);}
 if(cells.size<2||cells.size>90)continue;
 for(const [cell,indices]of cells){const chunk=p.clone().setName(`${mesh.getName()} ${cell}`);chunk.setIndices(p.getIndices().clone().setArray(new Uint32Array(indices)));compactPrimitive(chunk);mesh.addPrimitive(chunk);}mesh.removePrimitive(p);p.dispose();
}
const partitioned=summary(doc);if(partitioned.triangles!==simplified.triangles)throw new Error('Partition changed triangle count');
await doc.transform(prune({keepAttributes:true,keepLeaves:true,keepExtras:true}),draco({method:'edgebreaker',encodeSpeed:3,decodeSpeed:5,quantizePosition:settings.quantizePosition,quantizeNormal:settings.quantizeNormal,quantizationVolume:'scene'}));
const packed=await io.writeBinary(doc);console.log(JSON.stringify({stage:'compressed',bytes:packed.length}));
const decoded=await io.readBinary(packed),after=summary(decoded);
if(after.triangles!==partitioned.triangles)throw new Error(`Roundtrip changed faces ${after.triangles} vs ${partitioned.triangles}`);
const regionVerification=[];
for(const [id,region]of Object.entries(before.regions)){
 if(!after.regions[id]||JSON.stringify(after.regions[id].materials)!==JSON.stringify(region.materials))throw new Error(`Lost source or materials ${id}`);
 const end=after.regions[id];let boundsDelta=0;for(const edge of ['min','max'])for(let a=0;a<3;a++)boundsDelta=Math.max(boundsDelta,Math.abs(end.bounds[edge][a]-region.bounds[edge][a]));
 if(boundsDelta>.05)throw new Error(`${id} bounds changed ${boundsDelta}m`);
 let highBoundsDelta=0;if(region.above20mBounds){if(!end.above20mBounds)throw new Error(`${id} lost above20m architecture`);for(const edge of ['min','max'])for(let a=0;a<3;a++)highBoundsDelta=Math.max(highBoundsDelta,Math.abs(end.above20mBounds[edge][a]-region.above20mBounds[edge][a]));if(highBoundsDelta>.1)throw new Error(`${id} architectural bounds changed ${highBoundsDelta}m`);}
 const missingCells=region.above20mGrid.filter(x=>!end.above20mGrid.includes(x));
 const missingSurfaceCells=region.above20mSurfaceGrid.filter(x=>!end.above20mSurfaceGrid.includes(x));
 if(missingSurfaceCells.length)throw new Error(`${id} lost above20m projected surface cells ${missingSurfaceCells}`);
 regionVerification.push({sourceVenue:id,boundsDeltaMetres:boundsDelta,above20mBoundsDeltaMetres:highBoundsDelta,originalAbove20mVertexCells:region.above20mGrid.length,decodedAbove20mVertexCells:end.above20mGrid.length,missingVertexCells:missingCells,originalAbove20mSurfaceCells:region.above20mSurfaceGrid.length,decodedAbove20mSurfaceCells:end.above20mSurfaceGrid.length,missingSurfaceCells});
}
let delta=0;for(let i=0;i<before.bounds.length;i++)for(const edge of ['min','max'])for(let axis=0;axis<3;axis++)delta=Math.max(delta,Math.abs(before.bounds[i][edge][axis]-after.bounds[i][edge][axis]));
if(delta>.05)throw new Error(`Bounds changed ${delta}m`);
await fs.writeFile(output,packed);
await fs.writeFile(output.replace(/\.glb$/,'.compression.audit.json'),JSON.stringify({schema:'echo-campus.full-campus-compression.v1',source:{file:path.basename(source),sha256:sha(bytes),bytes:bytes.length},output:{file:path.basename(output),sha256:sha(packed),bytes:packed.length},settings,before,simplified,after,boundsDeltaMetres:delta,regionVerification,changes,elapsedMs:Date.now()-started},null,2));
console.log(JSON.stringify({output,bytes:packed.length,triangles:after.triangles,primitives:after.primitives,boundsDelta:delta,elapsedMs:Date.now()-started}));
