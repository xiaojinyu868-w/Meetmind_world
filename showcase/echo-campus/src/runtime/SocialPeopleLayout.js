import * as THREE from "three";

// Pair nearby attendees inside the calibrated social floor. The original source
// anchors stay unchanged; only the removable event presentation uses these poses.
export function socialPeopleLayout(config, furniture = []) {
  const source=config.anchors?.people||[], b=config.bounds;
  const result=source.map(p=>({...p})), free=new Set(source.map((_,i)=>i));
  const blockers=[...(config.colliders||[]),...furniture];
  const safe=(p,i)=>p.x>=b.minX+.3&&p.x<=b.maxX-.3&&p.z>=b.minZ+.3&&p.z<=b.maxZ-.3
    &&!blockers.some(c=>Math.hypot(p.x-c.x,p.z-c.z)<(c.r??c.radius??0)+.36)
    &&!result.some((q,j)=>j!==i&&Math.hypot(p.x-q.x,p.z-q.z)<1.15);
  for(const i of free){
    free.delete(i);const a=result[i];
    const candidates=[...free].map(j=>({j,d:Math.hypot(a.x-result[j].x,a.z-result[j].z)})).filter(c=>c.d>=1.8&&c.d<7).sort((u,v)=>u.d-v.d);
    const chosen=candidates[0];if(!chosen){a.yaw=(i%3-1)*.35;continue;}
    const j=chosen.j;free.delete(j);const other=result[j],dx=other.x-a.x,dz=other.z-a.z,d=chosen.d,shift=Math.min(.65,(d-1.8)/2);
    const p={...a,x:a.x+dx/d*shift,z:a.z+dz/d*shift};if(safe(p,i))Object.assign(a,p);
    const q={...other,x:other.x-dx/d*shift,z:other.z-dz/d*shift};if(safe(q,j))Object.assign(other,q);
    a.yaw=Math.atan2(other.x-a.x,other.z-a.z)+.18;other.yaw=Math.atan2(a.x-other.x,a.z-other.z)-.15;
  }
  return result;
}
