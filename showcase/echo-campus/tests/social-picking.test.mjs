import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { pickSocialPerson } from "../src/runtime/SocialPicking.js";
function character(x, y, z, height = 1.78) {
  const root = new THREE.Group(); root.position.set(x,y,z); return { root, height };
}
test("standing proxy picks foreground person without traversing a skinned rig", () => {
  const a=character(80,6.2991,205), b=character(80,6.2991,201);
  a.root.raycast=()=>{throw Error("must not evaluate animated triangles");};
  const ray=new THREE.Ray(new THREE.Vector3(80,7.8,211),new THREE.Vector3(0,0,-1));
  assert.equal(pickSocialPerson(ray,[b,a]).object,a.root);
  a.root.visible=false; assert.equal(pickSocialPerson(ray,[a,b]).object,b.root);
  assert.equal(pickSocialPerson(ray,[a,b],{far:3}),null);
});
test("proxy respects actual height and arrival scale, skips empty space", () => {
  const person=character(0,0,0,1.68);
  const ray=new THREE.Ray(new THREE.Vector3(0,1.6,5),new THREE.Vector3(0,0,-1));
  assert.equal(pickSocialPerson(ray,[person]).object,person.root);
  person.root.scale.setScalar(.25);assert.equal(pickSocialPerson(ray,[person]),null);
  person.root.scale.setScalar(1);ray.origin.x=2;assert.equal(pickSocialPerson(ray,[person]),null);
});
