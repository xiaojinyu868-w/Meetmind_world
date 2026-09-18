import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {socialPeopleLayout} from '../src/runtime/SocialPeopleLayout.js';
import {planEventGarden} from '../src/scenes/EventGarden.js';
for(const id of ['venue-ab-canopy','venue-ab-towers','venue-c'])test(id+' attendees preserve free floor and stay separated',async()=>{
 const config=JSON.parse(await readFile(new URL('../public/scenes/venue/'+id+'.json',import.meta.url)));const original=JSON.stringify(config.anchors.people);const garden=planEventGarden(config,{venueId:id});const furniture=garden.items;const result=socialPeopleLayout(config,furniture);
 assert.equal(JSON.stringify(config.anchors.people),original);assert.equal(result.length,config.anchors.people.length);
 for(const [i,p]of result.entries()){
  assert(p.x>=config.bounds.minX&&p.x<=config.bounds.maxX&&p.z>=config.bounds.minZ&&p.z<=config.bounds.maxZ);assert(Number.isFinite(p.yaw));assert.equal(p.y,config.groundY);
  for(const f of furniture)assert(Math.hypot(p.x-f.x,p.z-f.z)>=f.r+.36);
  for(const [j,q]of result.entries())if(j>i)assert(Math.hypot(p.x-q.x,p.z-q.z)>=1.15);
 }
});
