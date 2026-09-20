import {NodeIO} from '@gltf-transform/core';
import {EXTMeshoptCompression} from '@gltf-transform/extensions';
import {prune,weld,reorder} from '@gltf-transform/functions';
import {MeshoptEncoder,MeshoptDecoder} from 'meshoptimizer';
import fs from 'node:fs/promises';import {fileURLToPath}from'node:url';import{createHash}from'node:crypto';import{gzipSync,constants}from'node:zlib';
await Promise.all([MeshoptEncoder.ready,MeshoptDecoder.ready]);
const io=new NodeIO().registerExtensions([EXTMeshoptCompression]).registerDependencies({'meshopt.encoder':MeshoptEncoder,'meshopt.decoder':MeshoptDecoder});
const root=fileURLToPath(new URL('.',import.meta.url)),input=process.argv[2]||'candidate.glb',output=process.argv[3]||'candidate-meshopt.glb',optimized=process.argv.includes('--optimize'),doc=await io.read(root+input),source=await fs.readFile(root+input);
await doc.transform(prune({keepExtras:true,keepLeaves:true,keepAttributes:true}));
const sha=x=>createHash('sha256').update(x).digest('hex'),view=a=>new Uint8Array(a.buffer,a.byteOffset,a.byteLength);
function orderedFaceHash(indices){
 const out=new Uint32Array(indices.length);
 for(let i=0;i<indices.length;i+=3){const t=[indices[i],indices[i+1],indices[i+2]],k=t.indexOf(Math.min(...t));out.set([t[k],t[(k+1)%3],t[(k+2)%3]],i);}
 return sha(view(out));
}
function stats(d){return d.getRoot().listMeshes().flatMap(m=>m.listPrimitives().map(p=>({mesh:m.getName(),material:p.getMaterial()?.getName(),triangles:p.getIndices().getCount()/3,positionHash:sha(view(p.getAttribute('POSITION').getArray())),normalHash:sha(view(p.getAttribute('NORMAL').getArray())),orientedFaceHash:orderedFaceHash(p.getIndices().getArray())})));}
function geometryStats(d){return d.getRoot().listMeshes().flatMap(m=>m.listPrimitives().map(p=>{
 const indices=p.getIndices().getArray(),pos=p.getAttribute('POSITION').getArray(),normal=p.getAttribute('NORMAL').getArray(),pb=new Uint32Array(pos.buffer,pos.byteOffset,pos.length),nb=new Uint32Array(normal.buffer,normal.byteOffset,normal.length),vertex=new Uint32Array(pos.length*2);
 for(let i=0;i<pos.length/3;i++)for(let c=0;c<3;c++){vertex[i*6+c]=pb[i*3+c];vertex[i*6+c+3]=nb[i*3+c];}
 const rows=new Uint32Array(indices.length*6);const compare=(a,b)=>{for(let c=0;c<6;c++){const delta=vertex[a*6+c]-vertex[b*6+c];if(delta)return delta;}return 0;};
 for(let i=0;i<indices.length;i+=3){const t=[indices[i],indices[i+1],indices[i+2]];let k=0;if(compare(t[1],t[k])<0)k=1;if(compare(t[2],t[k])<0)k=2;for(let j=0;j<3;j++)rows.set(vertex.subarray(t[(k+j)%3]*6,t[(k+j)%3]*6+6),i*6+j*6);}
 const order=Array.from({length:indices.length/3},(_,i)=>i);order.sort((a,b)=>{for(let c=0;c<18;c++){const delta=rows[a*18+c]-rows[b*18+c];if(delta)return delta;}return 0;});const sorted=new Uint32Array(rows.length);order.forEach((a,i)=>sorted.set(rows.subarray(a*18,a*18+18),i*18));
 return{mesh:m.getName(),material:p.getMaterial()?.getName(),triangles:indices.length/3,positionNormalOrientedTriangleMultisetHash:sha(view(sorted))};
}));}
const originalGeometry=optimized?geometryStats(doc):null;
if(optimized){await doc.transform(weld({overwrite:true}),reorder({encoder:MeshoptEncoder,target:'size',cleanup:false}),prune({keepExtras:true,keepLeaves:true,keepAttributes:true}));if(JSON.stringify(originalGeometry)!==JSON.stringify(geometryStats(doc)))throw Error('Weld/reorder changed rendered position-normal triangle tuples');}
const before=stats(doc);
// This extension mode uses lossless byte compression. Deliberately do not
// call the meshopt() transform, quantize(), or FILTER mode. Optional index
// reorder above is separately proved to preserve the rendered triangle multiset.
doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({method:EXTMeshoptCompression.EncoderMethod.QUANTIZE});
await io.write(root+output,doc);const bytes=await fs.readFile(root+output),decoded=await io.read(root+output),after=stats(decoded);
const exact=JSON.stringify(before)===JSON.stringify(after);
if(!exact)throw Error('Lossless Meshopt readback mismatch (positions, normals, face winding/count/order)');
decoded.getRoot().listExtensionsUsed().forEach(ext=>ext.dispose());
await io.write(root+output.replace(/\.glb$/,'-decoded.glb'),decoded);
const gz=gzipSync(bytes,{level:9});await fs.writeFile(root+output+'.gz',gz);
const report={input:{file:input,sha256:sha(source)},output:{file:output,sha256:sha(bytes),bytes:bytes.length,gzipBytes:gz.length},exactPositions:true,exactNormals:true,exactOrientedFaces:true,optimized,preprocessGeometry:originalGeometry,triangles:before.reduce((n,p)=>n+p.triangles,0),primitives:before.length,extension:'EXT_meshopt_compression',method:'Raw float32 byte compression with no quantization or lossy filters'+(optimized?'; bitwise weld and index reorder validated by oriented position-normal triangle multisets':''),readback:after};await fs.writeFile(root+output.replace(/\.glb$/,'.audit.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({...report,readback:undefined,preprocessGeometry:undefined}));
