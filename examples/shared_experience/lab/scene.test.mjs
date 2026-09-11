import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { SemanticObjects } from "./SceneObjects.js";

const state = (entities, relationships = []) => ({ entities, relationships });
const artifact = { id: "artifact-1", kind: "artifact", title: "旧名称" };
const memory = { id: "memory-1", kind: "memory-object", title: "共同经历" };

test("correction updates semantic content without replacing mesh identity or position", () => {
  const objects = new SemanticObjects(new THREE.Scene());
  objects.apply(state([artifact, memory]));
  const object = objects.objects.get(artifact.id);
  const uuid = object.uuid;
  const position = object.position.clone();
  objects.apply(state([{ ...artifact, title: "新名称" }, memory]));
  assert.equal(objects.objects.get(artifact.id), object);
  assert.equal(object.uuid, uuid);
  assert.ok(object.position.equals(position));
  assert.equal(object.userData.entity.title, "新名称");
  assert.equal(objects.created, 2);
  objects.dispose();
});

test("withdrawal removes object and connecting line, preserves unrelated object", () => {
  const scene = new THREE.Scene();
  const objects = new SemanticObjects(scene);
  objects.apply(state([artifact, memory], [{ from: artifact.id, to: memory.id }]));
  const old = objects.objects.get(memory.id);
  let disposed = false;
  old.children[0].geometry.addEventListener("dispose", () => { disposed = true; });
  assert.equal(objects.edges.children.length, 1);
  objects.apply(state([artifact]));
  assert.equal(objects.edges.children.length, 0);
  assert.equal(objects.objects.has(memory.id), false);
  assert.equal(old.parent, null);
  assert.ok(disposed);
  assert.equal(objects.created, 2);
  assert.equal(objects.removed, 1);
  objects.dispose();
});

test("viewer changes remove hidden entities without remounting shared objects", () => {
  const objects = new SemanticObjects(new THREE.Scene());
  const privatePerson = { id: "candidate-e", kind: "person", claim: "candidate" };
  objects.apply(state([artifact, privatePerson]));
  const existing = objects.objects.get(artifact.id);
  objects.apply(state([artifact]));
  assert.equal(objects.objects.size, 1);
  assert.equal(objects.objects.get(artifact.id), existing);
  objects.dispose();
});
