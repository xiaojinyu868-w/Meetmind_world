import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { DEMO_SOCIAL_PAIRS, visibleSocialAttendees, stablePersonSeed, demoSocialPose, conversationIntent } from "../src/scenes/SocialEnsemble.js";
import { seedAttendees } from "../server/seed.mjs";
import { planEventGarden } from "../src/scenes/EventGarden.js";

const fixtures = seedAttendees();
const joined = Array.from({ length: 45 }, (_, i) => ({ id: `visitor-${i}`, source: i % 2 ? "demo-join" : "demo-badge", synthetic: true }));

test("six authored fixture people remain while every real device attendee survives a normal mesh budget", () => {
  const snapshot = [...fixtures, ...joined.slice(0, 5)];
  const before = JSON.stringify(snapshot);
  const result = visibleSocialAttendees(snapshot);
  assert.equal(result.length, 11);
  assert.deepEqual(result.filter(p => p.source === "curated-demo").map(p => p.id), DEMO_SOCIAL_PAIRS.flat());
  assert.deepEqual(result.filter(p => p.source !== "curated-demo"), joined.slice(0, 5));
  assert.equal(JSON.stringify(snapshot), before);
  assert.ok(result.every(person => snapshot.includes(person)), "Original DTO references are retained");
});

test("crowded views prioritize real attendees; selected and self cannot be evicted by LOD", () => {
  const snapshot = [...fixtures, ...joined];
  const result = visibleSocialAttendees(snapshot, { selectedId: "seed-15", selfId: "visitor-44", maxRendered: 12 });
  assert.equal(result.length, 12);
  assert.ok(result.some(p => p.id === "seed-15"));
  assert.ok(result.some(p => p.id === "visitor-44"));
  assert.equal(result.filter(p => p.source === "curated-demo").length, 1);
  assert.ok(snapshot.every(p => p.id), "Snapshot remains complete");
  assert.deepEqual(visibleSocialAttendees(snapshot, { selectedId: "seed-15", selfId: "visitor-44", maxRendered: 0 }).map(p => p.id), ["seed-15", "visitor-44"]);
});

test("unknown selection, duplicate DTOs and empty inputs produce a deterministic safe roster", () => {
  assert.deepEqual(visibleSocialAttendees(null), []);
  assert.deepEqual(visibleSocialAttendees([null, {}, ...fixtures, fixtures[0]], { selectedId: "missing", maxRendered: 100 }).map(p => p.id), DEMO_SOCIAL_PAIRS.flat());
  assert.equal(visibleSocialAttendees([...fixtures, ...joined], { maxRendered: Infinity }).length, 51);
  assert.equal(visibleSocialAttendees([...fixtures, ...joined], { maxRendered: -5 }).length, 0);
});

test("appearance seed is stable under reordering and preserves every existing curated character", () => {
  for (const [index, person] of fixtures.entries()) assert.equal(stablePersonSeed(person.id), index + 23);
  const before = new Map(joined.map(person => [person.id, stablePersonSeed(person.id)]));
  for (const person of [...joined].reverse()) assert.equal(stablePersonSeed(person.id), before.get(person.id));
  assert.equal(new Set([...before.values()]).size, joined.length);
  assert.ok(Number.isFinite(stablePersonSeed(undefined)));
});

for (const venueId of ["venue-ab-canopy", "venue-ab-towers", "venue-c"]) test(`${venueId}: authored pairs stay grounded, face one another and preserve the current garden/aisles`, async () => {
  const config = JSON.parse(await readFile(new URL(`../public/scenes/venue/${venueId}.json`, import.meta.url), "utf8"));
  const garden = planEventGarden(config, { venueId });
  const blockers = [...garden.items, ...(config.colliders || [])];
  const poses = DEMO_SOCIAL_PAIRS.flat().map(id => demoSocialPose(id, venueId, config.groundY));
  for (let i = 0; i < poses.length; i++) {
    const p = poses[i], partner = poses[i ^ 1], bounds = config.bounds;
    assert.equal(p.y, config.groundY);
    assert.ok(p.x >= bounds.minX + .36 && p.x <= bounds.maxX - .36 && p.z >= bounds.minZ + .36 && p.z <= bounds.maxZ - .36);
    assert.ok(blockers.every(b => Math.hypot(p.x - b.x, p.z - b.z) >= (b.r ?? b.radius ?? 0) + .36));
    assert.ok(p.x <= garden.corridors.x.min - .36 || p.x >= garden.corridors.x.max + .36, "Longitudinal aisle remains open");
    assert.ok(p.z <= garden.corridors.z.min - .36 || p.z >= garden.corridors.z.max + .36, "Cross aisle remains open");
    assert.ok(Math.abs(Math.hypot(p.x - partner.x, p.z - partner.z) - 1.5) < 1e-9);
    const desired = Math.atan2(partner.x - p.x, partner.z - p.z);
    assert.ok(Math.cos(p.yaw - desired) > .995, "Root +Z faces the partner with a small natural offset");
    for (let j = i + 1; j < poses.length; j++) assert.ok(Math.hypot(p.x - poses[j].x, p.z - poses[j].z) >= 1.49);
  }
  const fresh = demoSocialPose("seed-01", venueId, config.groundY); fresh.x = -100;
  assert.notEqual(demoSocialPose("seed-01", venueId, config.groundY).x, -100, "Independent pose objects");
});

test("unknown people and uncalibrated venues never invent coordinates", () => {
  assert.equal(demoSocialPose("visitor-0", "venue-c", 0), null);
  assert.equal(demoSocialPose("seed-01", "custom-scene", 0), null);
  assert.equal(demoSocialPose("seed-01", "venue-c", NaN), null);
});

test("conversations alternate, include a handoff and long rest, and never auto-talk for real attendees", () => {
  const [a, b] = DEMO_SOCIAL_PAIRS[0];
  assert.equal(conversationIntent(a, 0), "talking");
  assert.equal(conversationIntent(a, 4.499), "talking");
  for (const time of [4.5, 5, 5.499]) {
    assert.equal(conversationIntent(a, time), "idle");
    assert.equal(conversationIntent(b, time), "idle");
  }
  assert.equal(conversationIntent(b, 5.5), "talking");
  assert.equal(conversationIntent(b, 9.999), "talking");
  for (const time of [10, 12, 15, 17.999]) for (const id of [a, b]) assert.equal(conversationIntent(id, time), "idle");
  assert.equal(conversationIntent(a, 18), "talking");
  for (let time = 0; time < 72; time += .125) {
    for (const pair of DEMO_SOCIAL_PAIRS) assert.ok(pair.filter(id => conversationIntent(id, time) === "talking").length <= 1, "Partners never talk simultaneously");
    assert.equal(conversationIntent("visitor-0", time), "idle");
  }
  assert.equal(conversationIntent(a, -1), "idle");
  assert.equal(conversationIntent(a, NaN), "idle");
});
