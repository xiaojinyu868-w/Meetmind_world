import test from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync,writeFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {gzipSync} from "node:zlib";
import {createEventServer} from "../server/index.mjs";

test("precompressed GLB keeps MIME, honors encoding opt-out and original byte ranges",async t=>{
 const dir=mkdtempSync(join(tmpdir(),"echo-gzip-")),data=Buffer.from("glTF0123456789".repeat(1000));
 writeFileSync(join(dir,"model.glb"),data);writeFileSync(join(dir,"model.glb.gz"),gzipSync(data));
 const app=createEventServer({distDir:dir,dataFile:join(dir,"event.json")});const address=await app.listen(0),url="http://127.0.0.1:"+address.port+"/model.glb";
 t.after(async()=>{await app.close();rmSync(dir,{recursive:true,force:true})});
 const compressed=await fetch(url,{headers:{"Accept-Encoding":"gzip"}});
 assert.equal(compressed.headers.get("content-encoding"),"gzip");assert.equal(compressed.headers.get("content-type"),"model/gltf-binary");assert.equal(compressed.headers.get("vary"),"Accept-Encoding");assert.deepEqual(Buffer.from(await compressed.arrayBuffer()),data);
 const raw=await fetch(url,{headers:{"Accept-Encoding":"gzip;q=0"}});assert.equal(raw.headers.get("content-encoding"),null);assert.deepEqual(Buffer.from(await raw.arrayBuffer()),data);
 const range=await fetch(url,{headers:{"Accept-Encoding":"gzip","Range":"bytes=4-9"}});assert.equal(range.status,206);assert.equal(range.headers.get("content-encoding"),null);assert.deepEqual(Buffer.from(await range.arrayBuffer()),data.subarray(4,10));
 const head=await fetch(url,{method:"HEAD",headers:{"Accept-Encoding":"gzip"}});assert.equal(head.headers.get("content-length"),String(gzipSync(data).length));assert.equal((await head.arrayBuffer()).byteLength,0);
});
