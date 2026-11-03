import assert from "node:assert/strict";
import test from "node:test";
import { makeReferenceEngine } from "./reference-engine.js";

function makeEngine() {
  return makeReferenceEngine();
}

function noteOns(events) {
  return events.filter((event) => event.kind === "noteOn");
}

test("render windows partition note events without duplicates", () => {
  const engine = makeEngine();
  const first = engine.render(0, 8);
  const second = engine.render(8, 16);
  const ons = [...noteOns(first), ...noteOns(second)];

  assert.ok(ons.length > 8, `expected several notes, got ${ons.length}`);
  for (let i = 1; i < ons.length; i++) assert.ok(ons[i].time >= ons[i - 1].time);
  assert.ok(ons.every((event) => event.time >= 0 && event.time < 16));
  assert.ok(first.every((event) => event.time < 8));
  assert.ok(second.every((event) => event.time >= 8 && event.time < 16));

  const drained = engine.render(16, 24);
  const offs = [...first, ...second, ...drained].filter((event) => event.kind === "noteOff");
  for (const on of ons) {
    const off = offs.find((event) => event.note === on.note);
    assert.ok(off);
    assert.ok(Math.abs(off.time - (on.time + on.note.duration)) < 1e-9);
  }
});

test("render is deterministic and seek matches a forward pass", () => {
  const direct = makeEngine();
  const played = [...noteOns(direct.render(0, 8)), ...noteOns(direct.render(8, 16))];
  const replay = noteOns(makeEngine().render(0, 16));
  assert.deepEqual(
    replay.map((event) => [event.time, event.note.midi, event.note.velocity, event.note.duration]),
    played.map((event) => [event.time, event.note.midi, event.note.velocity, event.note.duration]),
  );

  const chased = makeEngine();
  chased.seek(8);
  const tail = noteOns(chased.render(8, 16));
  const directTail = played.filter((event) => event.time >= 8);
  assert.deepEqual(
    tail.map((event) => [event.time, event.note.midi]),
    directTail.map((event) => [event.time, event.note.midi]),
  );
});
