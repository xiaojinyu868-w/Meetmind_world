import assert from "node:assert/strict";
import test from "node:test";

import {
  isMeetingActorReady,
  roomMeetingSeatFor,
  seatKeyForTarget,
  shouldForceMeetingSeat,
} from "../src/runtime/MeetingReadiness.js";


const roundtableTarget = {
  x: 1.25,
  z: 0,
  state: "in-meeting",
  seat: { tableId: "roundtable-six", seatIndex: 2 },
};


test("meeting readiness accepts an authoritative live snapshot seat", () => {
  const seatKey = seatKeyForTarget(roundtableTarget);
  assert.equal(seatKey, "roundtable-six:2");
  assert.equal(isMeetingActorReady({
    target: roundtableTarget,
    currentSeatKey: seatKey,
    animationReady: true,
    roundtableId: "roundtable-six",
  }), true);
});


test("meeting readiness waits for both the roundtable seat and seated animation", () => {
  assert.equal(isMeetingActorReady({
    target: roundtableTarget,
    currentSeatKey: null,
    animationReady: true,
    roundtableId: "roundtable-six",
  }), false);
  assert.equal(isMeetingActorReady({
    target: roundtableTarget,
    currentSeatKey: "roundtable-six:2",
    animationReady: false,
    roundtableId: "roundtable-six",
  }), false);
  assert.equal(isMeetingActorReady({
    target: { ...roundtableTarget, seat: { tableId: "table-library-four", seatIndex: 2 } },
    currentSeatKey: "table-library-four:2",
    animationReady: true,
    roundtableId: "roundtable-six",
  }), false);
});


test("room meetings reserve participant-order seats before the conductor heartbeat", () => {
  const seats = [{ id: 0 }, { id: 1 }, { id: 2 }];
  assert.deepEqual(
    roomMeetingSeatFor("agent-b", ["person-self", "agent-a", "agent-b"], seats),
    { seat: seats[2], seatIndex: 2 },
  );
  assert.equal(roomMeetingSeatFor("outsider", ["person-self"], seats), null);
});


test("room meeting walkers settle into their authoritative seat after a bounded wait", () => {
  assert.equal(shouldForceMeetingSeat({
    state: "in-meeting", elapsed: 17.9, assignedAt: 10,
  }), false);
  assert.equal(shouldForceMeetingSeat({
    state: "in-meeting", elapsed: 18, assignedAt: 10,
  }), true);
  assert.equal(shouldForceMeetingSeat({
    state: "walking", elapsed: 20, assignedAt: 10,
  }), false);
});
