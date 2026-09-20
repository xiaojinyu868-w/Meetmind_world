import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import * as THREE from "three";
import { createEventGarden } from "../src/scenes/EventGarden.js";
import { placeSignSurface } from "../src/runtime/SignSurface.js";

function fakeDocument() {
  return {
    createElement: () => ({
      width: 0,
      height: 0,
      getContext: () => ({
        createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
        putImageData() {}, fillRect() {}, fillText() {}, beginPath() {},
        moveTo() {}, lineTo() {}, stroke() {}
      })
    })
  };
}

function assertSurfacePolicy(face) {
  assert.equal(face.material.side, THREE.FrontSide, "Only the outward printed face is rendered");
  assert.equal(face.material.depthTest, true, "A sign must remain occluded by foreground geometry");
  assert.equal(face.material.depthWrite, true, "A sign must occlude geometry behind it");
  assert.equal(face.castShadow, false, "The backing casts the physical sign's shadow");
  assert.equal(face.receiveShadow, false, "A printed overlay must not self-shadow against its backing");
  assert.equal(face.material.polygonOffset, true);
  assert.ok(face.material.polygonOffsetFactor < 0);
  assert.ok(face.material.polygonOffsetUnits < 0);
  assert.equal(face.userData.signSurface, true);
}

for (const id of ["venue-ab-canopy", "venue-ab-towers", "venue-c"]) {
  test(`${id}: real beveled wayfinding boards have separated print surfaces`, async () => {
    const previous = globalThis.document;
    globalThis.document = fakeDocument();
    let garden;
    try {
      const config = JSON.parse(await readFile(new URL(`../public/scenes/venue/${id}.json`, import.meta.url), "utf8"));
      garden = await createEventGarden({ venueId: id, config, quality: "low" });
      garden.root.updateMatrixWorld(true);
      const wood = garden.root.getObjectByName("event-garden-oiled oak");
      const signs = [];
      garden.root.traverse(object => { if (object.name === "event wayfinding") signs.push(object); });
      assert.ok(wood?.isMesh, "Test the actual merged wooden backing geometry");
      assert.ok(signs.length > 0, "Expected a real wayfinding board in this venue");
      for (const face of signs) {
        assertSurfacePolicy(face);
        const normal = new THREE.Vector3(0, 0, 1).transformDirection(face.matrixWorld);
        const ray = new THREE.Raycaster();
        for (const x of [-.10, 0, .10]) {
          for (const y of [-.40, 0, .40]) {
            const origin = face.localToWorld(new THREE.Vector3(x, y, 0));
            ray.set(origin, normal.clone().negate());
            ray.near = 0;
            ray.far = .05;
            const hit = ray.intersectObject(wood, false)[0];
            assert.ok(hit, "Each sampled print point has a wooden backing behind it");
            assert.ok(hit.distance >= .0079 && hit.distance <= .0081,
              `Real bevel clearance must be 8 mm, received ${hit.distance} m at ${x},${y}`);
          }
        }
      }
    } finally {
      garden?.dispose();
      globalThis.document = previous;
    }
  });
}

test("Double-sided activity signs keep front and back outside the box and facing outward", () => {
  const backing = new THREE.BoxGeometry(.72, .93, .06);
  const geometry = new THREE.PlaneGeometry(.695, .90);
  const material = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide });
  const front = new THREE.Mesh(geometry, material);
  front.position.set(.012, 1.16, 0);
  front.castShadow = front.receiveShadow = true;
  placeSignSurface(front, backing);
  const back = front.clone();
  placeSignSurface(back, backing, -1);
  try {
    assert.equal(front.position.x, .012);
    assert.equal(front.position.y, 1.16);
    for (const [face, direction] of [[front, 1], [back, -1]]) {
      assertSurfacePolicy(face);
      const edge = direction > 0 ? backing.boundingBox.max.z : backing.boundingBox.min.z;
      assert.ok(Math.abs(direction * (face.position.z - edge) - .008) < 1e-10);
      face.updateMatrixWorld(true);
      const normal = new THREE.Vector3(0, 0, 1).transformDirection(face.matrixWorld);
      assert.ok(normal.dot(new THREE.Vector3(0, 0, direction)) > .999999);
      const center = face.getWorldPosition(new THREE.Vector3());
      const outside = new THREE.Raycaster(center.clone().addScaledVector(normal, .1), normal.clone().negate(), 0, .2);
      assert.ok(outside.intersectObject(face).length > 0, "Printed side is visible from outside");
      const inside = new THREE.Raycaster(center.clone().addScaledVector(normal, -.1), normal.clone(), 0, .2);
      assert.equal(inside.intersectObject(face).length, 0, "Reverse side is culled, not drawn through the backing");
    }
    assert.ok(front.position.z > back.position.z);
  } finally {
    backing.dispose();
    geometry.dispose();
    material.dispose();
  }
});
