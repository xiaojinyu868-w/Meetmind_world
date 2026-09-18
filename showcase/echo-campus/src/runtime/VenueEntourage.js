import * as THREE from "three";

/** Validate fixed source evidence against decoded runtime geometry before removing any face. */
export function validatedEntourageIndices(geometry, metadata) {
  const position=geometry?.attributes?.position,index=geometry?.index;
  if(!position||!index||position.count!==metadata.expectedVertexCount||index.count!==metadata.expectedTriangleCount*3)throw new Error("Entourage metadata does not match this decoded model");
  const triangles=metadata.triangleIndices,boxes=metadata.boxes,pad=metadata.padMeters;
  if(!Array.isArray(triangles)||!triangles.length||!Array.isArray(boxes)||!boxes.length||!Number.isFinite(pad)||pad<0||pad>.02)throw new Error("Invalid entourage metadata");
  const excluded=new Set();
  for(const face of triangles){
    if(!Number.isInteger(face)||face<0||face>=metadata.expectedTriangleCount||excluded.has(face))throw new Error("Invalid entourage triangle index");
    const inside=boxes.some(box=>[0,1,2].every(corner=>{const v=index.getX(face*3+corner);return position.getX(v)>=box.min[0]-pad&&position.getX(v)<=box.max[0]+pad&&position.getY(v)>=box.min[1]-pad&&position.getY(v)<=box.max[1]+pad&&position.getZ(v)>=box.min[2]-pad&&position.getZ(v)<=box.max[2]+pad;}));
    if(!inside)throw new Error("Entourage triangle escaped verified source-person bounds");
    excluded.add(face);
  }
  const ArrayType=index.array.constructor,kept=new ArrayType(index.count-excluded.size*3);let write=0;
  for(let face=0;face<metadata.expectedTriangleCount;face++)if(!excluded.has(face)){kept[write++]=index.getX(face*3);kept[write++]=index.getX(face*3+1);kept[write++]=index.getX(face*3+2);}
  return kept;
}

/** Hide only previously verified source-model people in event view; source geometry stays intact.
 * Fails closed: unavailable / mismatched evidence leaves all source geometry visible.
 */
export async function prepareVenueEntourage(modelRoot,{venueId,baseUrl=import.meta.env?.BASE_URL||"./",fetchImpl=fetch}={}){
  const diagnostics={venueId,removedTriangles:0,figures:0,elapsedMs:0,applied:false,error:null},changes=[];let event=false,disposed=false;
  const result={diagnostics,setEvent(enabled){event=!!enabled;for(const c of changes)c.mesh.geometry=event?c.eventGeometry:c.sourceGeometry;diagnostics.applied=event&&changes.length>0;},dispose(){if(disposed)return;disposed=true;for(const c of changes){c.mesh.geometry=c.sourceGeometry;c.eventGeometry.dispose();}changes.length=0;diagnostics.applied=false;}};
  if(venueId!=="venue-ab-canopy")return result;
  const started=performance.now();
  try{
    const response=await fetchImpl(baseUrl.replace(/\/?$/, "/")+"assets/premium/canopy-entourage.json");
    if(!response.ok)throw new Error(`Entourage metadata HTTP ${response.status}`);
    const metadata=await response.json();
    if(metadata.schema!=="echo-campus.venue-entourage.v1"||metadata.venueId!==venueId)throw new Error("Unexpected entourage metadata");
    const meshes=[];modelRoot.traverse(o=>{if(o.isMesh&&(Array.isArray(o.material)?o.material:[o.material]).some(m=>m.name===metadata.materialName)&&o.geometry?.attributes?.position?.count===metadata.expectedVertexCount&&o.geometry?.index?.count===metadata.expectedTriangleCount*3)meshes.push(o);});
    if(meshes.length!==1)throw new Error("Could not uniquely match source entourage geometry");
    const mesh=meshes[0],sourceGeometry=mesh.geometry,kept=validatedEntourageIndices(sourceGeometry,metadata);
    // Share immutable attributes, allocate only the new index. Restore before importer disposal.
    const eventGeometry=new THREE.BufferGeometry();eventGeometry.name=sourceGeometry.name+" · event without source entourage";
    for(const [name,attribute]of Object.entries(sourceGeometry.attributes))eventGeometry.setAttribute(name,attribute);
    eventGeometry.setIndex(new THREE.BufferAttribute(kept,1));eventGeometry.boundingBox=sourceGeometry.boundingBox?.clone()||null;eventGeometry.boundingSphere=sourceGeometry.boundingSphere?.clone()||null;
    eventGeometry.userData={...sourceGeometry.userData,sourceEntourageFiltered:true};changes.push({mesh,sourceGeometry,eventGeometry});
    diagnostics.removedTriangles=metadata.triangleIndices.length;diagnostics.figures=metadata.boxes.length;result.setEvent(event);
  }catch(error){diagnostics.error=error.message;}
  diagnostics.elapsedMs=Math.round((performance.now()-started)*10)/10;return result;
}
