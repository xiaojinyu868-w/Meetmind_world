import test from "node:test";import assert from "node:assert/strict";import {validateManifest,defaultManifest} from "../src/runtime/SceneManifest.js";
test("default scenes preserve independent render and gameplay transforms",()=>{for(const type of ["glb","splat"]){const v=validateManifest(defaultManifest(type));assert.equal(v.type,type);assert.equal(v.spawn.y,0);assert.equal(v.rotation[0],type==="splat"?180:0);}});
test("malformed scenes fail before loading or replacing the current scene",()=>{for(const patch of [{schema:"wrong"},{scale:0},{scale:Infinity},{rotation:[0,NaN,0]},{bounds:{minX:1,maxX:0,minZ:0,maxZ:1}},{url:"javascript:alert(1)"},{spawn:{x:NaN,y:0,z:0}}])assert.throws(()=>validateManifest({...defaultManifest(),...patch}));});

test("visual framing bounds are independent of event movement bounds and validated",()=>{
 const base=defaultManifest();const framingBounds={minX:-117.21,maxX:106.902,minY:-8.668,maxY:53.4,minZ:-146.879,maxZ:159.011};
 const result=validateManifest({...base,framingBounds});
 assert.deepEqual(result.framingBounds,framingBounds);assert.deepEqual(result.bounds,base.bounds);
 framingBounds.maxX=999;assert.equal(result.framingBounds.maxX,106.902);
 for(const patch of [null,{}, {...result.framingBounds,minY:NaN}, {...result.framingBounds,maxY:-100}]) assert.throws(()=>validateManifest({...base,framingBounds:patch}),/主体展示边界/);
});
