import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createLorenzDevice } from "../m4l/pipeline.js";
import { makeReferenceEngine } from "./reference-engine.js";

const here = dirname(fileURLToPath(import.meta.url));
const defaultPreset = JSON.parse(
  readFileSync(join(here, "../presets/default.json"), "utf8"),
);

test("M4L device loads default preset and emits deterministic noteOns", () => {
  const midi = [];
  const device = createLorenzDevice({ onMidi: (e) => midi.push(e) });
  device.loadPreset(defaultPreset);
  device.beginAt(0);

  const events = device.render(20);
  const noteOns = events.filter((e) => e.kind === "noteOn");
  assert.ok(noteOns.length >= 3, `expected several notes, got ${noteOns.length}`);
  assert.equal(noteOns[0].channel, 1);
  assert.ok(noteOns[0].midi >= 12 && noteOns[0].midi <= 108);

  const again = [];
  const replay = createLorenzDevice({ onMidi: (e) => again.push(e) });
  replay.loadPreset(defaultPreset);
  replay.beginAt(0);
  replay.render(20);

  assert.deepEqual(
    midi.filter((e) => e.kind === "noteOn").map((e) => [e.time, e.midi, e.velocity]),
    again.filter((e) => e.kind === "noteOn").map((e) => [e.time, e.midi, e.velocity]),
  );
});

test("M4L device matches reference engine note times for voice 1", () => {
  const device = createLorenzDevice();
  device.loadPreset(defaultPreset);
  device.set("voice2Enable", false);
  device.set("voice3Enable", false);
  device.beginAt(0);

  const ref = makeReferenceEngine();
  const a = device.render(4).filter((e) => e.kind === "noteOn").map((e) => [e.time, e.midi]);
  const b = ref
    .render(0, 4)
    .filter((e) => e.kind === "noteOn")
    .map((e) => [e.time, e.note.midi]);

  assert.equal(a.length, b.length);
  for (let i = 0; i < a.length; i++) {
    assert.ok(Math.abs(a[i][0] - b[i][0]) < 1e-6, `time mismatch at ${i}`);
    assert.equal(a[i][1], b[i][1]);
  }
});

test("perturb changes the sequence", () => {
  const device = createLorenzDevice();
  device.loadPreset(defaultPreset);
  device.beginAt(0);
  const before = device
    .render(30)
    .filter((e) => e.kind === "noteOn")
    .map((e) => [Number(e.time.toFixed(4)), e.midi]);

  device.loadPreset(defaultPreset);
  device.beginAt(0);
  device.perturb();
  const after = device
    .render(30)
    .filter((e) => e.kind === "noteOn")
    .map((e) => [Number(e.time.toFixed(4)), e.midi]);
  assert.notDeepEqual(before, after);
});

test("bundled chaos-pipeline.js exposes Lorenz.createLorenzDevice", () => {
  const src = readFileSync(join(here, "../m4l/chaos-pipeline.js"), "utf8");
  assert.match(src, /var Lorenz =/);
  assert.match(src, /createLorenzDevice/);
});
