import test from "node:test";
import assert from "node:assert/strict";
import {loadVenueAsset} from "../src/runtime/VenueAsset.js";
const baseUrl="https://example.test/echo-campus/";
const manifest={url:baseUrl+"scenes/venue/venue-ab-canopy.glb",scale:.001,anchors:{arrival:{x:1,y:2,z:3}}};
const args={id:"venue-ab-canopy",manifest,baseUrl};
test("event startup requests only the filtered asset, keeping coordinates; source returns untouched asset",async()=>{
 const calls=[];const importer=async input=>{calls.push(input);return {config:input};};
 const event=await loadVenueAsset({...args,view:"event",importer});
 assert.equal(calls.length,1);assert.match(calls[0].url,/venue-ab-canopy-event\.glb$/);
 assert.equal(event.venueAsset.prefiltered,true);assert.deepEqual(calls[0].anchors,manifest.anchors);assert.equal(calls[0].scale,manifest.scale);
 const source=await loadVenueAsset({...args,view:"source",importer});
 assert.equal(calls[1],manifest);assert.equal(source.venueAsset.mode,"source");assert.equal(source.venueAsset.prefiltered,false);
 const again=await loadVenueAsset({...args,view:"event",importer});assert.equal(again.venueAsset.url,event.venueAsset.url);
});
test("failed derivative explicitly falls back to source; dual failure rejects without replacing current scene",async()=>{
 const calls=[];let warning=0;
 const result=await loadVenueAsset({...args,view:"event",onFallback:()=>warning++,importer:async input=>{calls.push(input.url);if(input.url.endsWith("-event.glb"))throw Error("404");return {};}});
 assert.deepEqual(calls,[baseUrl+"scenes/venue/venue-ab-canopy-event.glb",manifest.url]);assert.equal(warning,1);assert.equal(result.venueAsset.fallback,true);assert.equal(result.venueAsset.prefiltered,false);
 await assert.rejects(loadVenueAsset({...args,view:"event",importer:async()=>{throw Error("offline");}}),/offline/);
});

test("assembled campus uses the same prepared geometry for source and event without a derivative request",async()=>{
 const campus={...manifest,url:baseUrl+"scenes/venue/venue-campus.glb"};
 const calls=[];let fallbacks=0;
 for(const view of ["event","source"]){
  const result=await loadVenueAsset({id:"venue-campus",manifest:campus,baseUrl,view,onFallback:()=>fallbacks++,importer:async input=>{calls.push(input);return {};}});
  assert.equal(result.venueAsset.mode,view);assert.equal(result.venueAsset.prefiltered,true);assert.equal(result.venueAsset.url,campus.url);
 }
 assert.deepEqual(calls,[campus,campus]);assert.equal(fallbacks,0);
 let attempts=0;
 await assert.rejects(loadVenueAsset({id:"venue-campus",manifest:campus,baseUrl,view:"event",importer:async()=>{attempts++;throw Error("missing assembly");}}),/missing assembly/);
 assert.equal(attempts,1);
});


test("cleaned campus does not apply source-name depth bias or wrap asset disposal",async()=>{
 const material={name:"石材幕墙",polygonOffset:false,polygonOffsetUnits:0};
 const dispose=()=>{};const root={traverse(fn){fn({isMesh:true,material,userData:{sourceVenue:"venue-c-commercial-20230518"}})}};
 for(const view of ["event","source"]){
  const result=await loadVenueAsset({id:"venue-campus",manifest:{url:"campus.glb"},view,baseUrl,importer:async()=>({root,dispose})});
  assert.equal(result.root,root);assert.equal(result.dispose,dispose);assert.equal(material.polygonOffset,false);assert.equal(material.polygonOffsetUnits,0);assert.equal(result.surfaceDepth,undefined);
 }
});
