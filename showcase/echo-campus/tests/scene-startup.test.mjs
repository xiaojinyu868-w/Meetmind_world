import test from 'node:test';
import assert from 'node:assert/strict';
import {readSceneStartup} from '../src/runtime/SceneStartup.js';
const baseUrl='https://example.com/echo-campus/';
const response=data=>({ok:true,text:async()=>JSON.stringify(data)});
test('explicit built-in scene bypasses default fetch',async()=>{const got=await readSceneStartup({search:'?scene=gallery',baseUrl,fetchImpl:()=>{throw new Error('must not fetch');}});assert.equal(got.scene,'gallery');});
test('shared manifest resolves model paths relative to its own location',async()=>{const got=await readSceneStartup({search:'?sceneManifest=./scenes/new/scene.json',baseUrl,fetchImpl:async url=>{assert.equal(url.href,'https://example.com/echo-campus/scenes/new/scene.json');return response({schema:'echo-campus.scene.v1',type:'glb',url:'./model.glb'});}});assert.equal(got.manifest.url,'https://example.com/echo-campus/scenes/new/model.glb');});
test('disabled default startup returns chosen built-in',async()=>{const got=await readSceneStartup({baseUrl,fetchImpl:async()=>response({enabled:false,scene:'gallery'})});assert.deepEqual(got,{scene:'gallery'});});
test('startup rejects protocol abuse and malformed payloads',async()=>{await assert.rejects(readSceneStartup({search:'?sceneManifest=javascript:alert(1)',baseUrl}),/HTTP/);await assert.rejects(readSceneStartup({search:'?sceneManifest=./bad.json',baseUrl,fetchImpl:async()=>response(null)}),/缺少/);await assert.rejects(readSceneStartup({search:'?sceneManifest=./big.json',baseUrl,fetchImpl:async()=>response({value:'x'.repeat(66000)})}),/64 KB/);});

test("streamed startup response cancels reading as soon as the 64 KB cap is exceeded",async()=>{
 let cancelled=false,reads=0;
 const body={getReader:()=>({read:async()=>{reads++;return {done:false,value:new Uint8Array(40000)};},cancel:async()=>{cancelled=true;},releaseLock(){}})};
 await assert.rejects(readSceneStartup({search:"?sceneManifest=./huge.json",baseUrl,fetchImpl:async()=>({ok:true,body})}),/64 KB/);
 assert.equal(cancelled,true);assert.equal(reads,2);
});
test("startup rejects invalid JSON and advertised oversize before reading body",async()=>{
 await assert.rejects(readSceneStartup({baseUrl,fetchImpl:async()=>({ok:true,text:async()=>"<html>not json</html>"})}),/有效 JSON/);
 let read=false;
 await assert.rejects(readSceneStartup({baseUrl,fetchImpl:async()=>({ok:true,headers:{get:()=>"90000"},text:async()=>{read=true;return "{}";}})}),/64 KB/);
 assert.equal(read,false);
 await assert.rejects(readSceneStartup({baseUrl,fetchImpl:async()=>response(null)}),/缺少/);
});
