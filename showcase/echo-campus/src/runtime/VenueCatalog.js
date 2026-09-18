import { readSceneStartup } from "./SceneStartup.js";
import { validateManifest } from "./SceneManifest.js";

export const VENUE_CANDIDATES = Object.freeze([
  Object.freeze({id:"venue-ab-towers", name:"AB · 塔楼版本", source:"20231226_T1-3塔楼调整.skp", archive:"AB地块SU模型.zip", manifest:"./scenes/venue/venue-ab-towers.json", thumbnail:"./scenes/venue/venue-ab-towers.webp", note:"AB 文件包中的塔楼模型版本；不代表已确认的 A 地块边界。"}),
  Object.freeze({id:"venue-ab-canopy", name:"AB · 雨棚版本", source:"0801-T6雨棚模型-2017版本.skp", archive:"AB地块SU模型.zip", manifest:"./scenes/venue/venue-ab-canopy.json", thumbnail:"./scenes/venue/venue-ab-canopy.webp", note:"AB 文件包中的雨棚模型版本；不代表已确认的 B 地块边界。"}),
  Object.freeze({id:"venue-c", name:"C · 裙房版本", source:"0831 Podium.3dm", archive:"C地块SU模型.zip", manifest:"./scenes/venue/venue-c.json", thumbnail:"./scenes/venue/venue-c.webp", note:"C 文件包中的裙房模型版本；活动布置为可独立开关的演示叠加层。"}),
]);
export function venueById(id) { return VENUE_CANDIDATES.find(item => item.id === id) || null; }
export async function loadVenueManifest(id, {baseUrl, fetchImpl=globalThis.fetch}={}) {
  const candidate=venueById(id);
  if (!candidate) throw new Error("未知的场地源文件");
  const startup=await readSceneStartup({search:"?sceneManifest="+encodeURIComponent(candidate.manifest),baseUrl,fetchImpl});
  const manifest=validateManifest(startup.manifest);
  if (manifest.type!=="glb") throw new Error("场地预览需要转换后的真实 GLB 模型");
  if (!manifest.url) throw new Error("场地模型地址缺失");
  return {candidate,manifest};
}
export function venueUrl(id, {baseUrl,view="source"}={}) {
  if (!venueById(id)) throw new Error("未知的场地源文件");
  const url=new URL(baseUrl);url.search="";url.hash="";
  url.searchParams.set("venue",id);url.searchParams.set("view",view==="event"?"event":"source");
  return url.href;
}

export function startupVenueFromSearch(search="") {
  const params=new URLSearchParams(search);
  if(params.has("venue"))return params.get("venue");
  return params.has("scene")||params.has("sceneManifest")?null:"venue-c";
}
