import assert from "node:assert/strict";
import test from "node:test";
import { ChaosAnalyzer } from "../js/chaos-analyzer.js";
import { EventGenerator } from "../js/event-generator.js";
import { LorenzAttractor, LORENZ_DEFAULTS } from "../js/lorenz.js";
import {
  midiToFreq,
  midiToName,
  MusicalMapper,
  noteNameToMidi,
} from "../js/musical-mapper.js";

function chaosEvent(overrides = {}) {
  return {
    type: "x-crossing",
    timestamp: 1,
    x: 2,
    y: 4,
    z: 25,
    velocity: 30,
    distance: 24,
    lobe: "B",
    ...overrides,
  };
}

test("Lorenz attractor uses defaults and computes derivatives", () => {
  const attractor = new LorenzAttractor();

  assert.deepEqual(
    {
      sigma: attractor.sigma,
      rho: attractor.rho,
      beta: attractor.beta,
      dt: attractor.dt,
      x: attractor.x,
      y: attractor.y,
      z: attractor.z,
    },
    {
      sigma: LORENZ_DEFAULTS.sigma,
      rho: LORENZ_DEFAULTS.rho,
      beta: LORENZ_DEFAULTS.beta,
      dt: LORENZ_DEFAULTS.dt,
      x: LORENZ_DEFAULTS.x,
      y: LORENZ_DEFAULTS.y,
      z: LORENZ_DEFAULTS.z,
    },
  );
  assert.deepEqual(attractor.derivatives(1, 2, 3), {
    dx: 10,
    dy: 23,
    dz: -6,
  });
});

test("Lorenz trajectory remains bounded and deterministic", () => {
  const first = new LorenzAttractor();
  const replay = new LorenzAttractor();

  for (let i = 0; i < 8000; i++) {
    first.step();
    replay.step();
  }

  assert.deepEqual(first.state(), replay.state());
  assert.ok([first.x, first.y, first.z].every(Number.isFinite));
  assert.ok(Math.abs(first.x) < 40);
  assert.ok(Math.abs(first.y) < 50);
  assert.ok(first.z > -5);
  assert.ok(first.z < 60);
});

test("nearby Lorenz trajectories diverge", () => {
  const first = new LorenzAttractor({ x: 0.1 });
  const perturbed = new LorenzAttractor({ x: 0.1 + 1e-6 });

  for (let i = 0; i < 6000; i++) {
    first.step();
    perturbed.step();
  }

  const drift = Math.hypot(
    first.x - perturbed.x,
    first.y - perturbed.y,
    first.z - perturbed.z,
  );
  assert.ok(drift > 1, `expected chaotic divergence, got ${drift}`);
});

test("reset and clone preserve the intended Lorenz state", () => {
  const attractor = new LorenzAttractor({ sigma: 12, x: 2, y: 3, z: 4 });
  attractor.step();
  const clone = attractor.clone();

  assert.deepEqual(clone.state(), attractor.state());
  clone.step();
  assert.notDeepEqual(clone.state(), attractor.state());

  assert.deepEqual(attractor.reset({ y: 8 }), {
    x: 2,
    y: 8,
    z: 4,
    t: 0,
    dx: 72,
    dy: 40,
    dz: 2 * 8 - (8 / 3) * 4,
  });
});

test("chaos analyzer interpolates crossings and tracks event timing", () => {
  const analyzer = new ChaosAnalyzer({ zThreshold: 25 });
  assert.deepEqual(
    analyzer.push({ x: -2, y: -1, z: 20, t: 0, dx: 1, dy: 1, dz: 1 }),
    [],
  );

  const events = analyzer.push({
    x: 2,
    y: 1,
    z: 30,
    t: 2,
    dx: -1,
    dy: -1,
    dz: -1,
  });
  const xCrossing = events.find(({ type }) => type === "x-crossing");
  const threshold = events.find(({ type }) => type === "z-threshold");

  assert.equal(xCrossing.x, 0);
  assert.equal(xCrossing.timestamp, 1);
  assert.equal(xCrossing.direction, "up");
  assert.equal(xCrossing.lobe, "B");
  assert.equal(threshold.z, 25);
  assert.equal(threshold.timestamp, 1);
  assert.ok(events.some(({ type }) => type === "x-max"));
  assert.ok(events.every(({ id }, index) => id === index + 1));

  analyzer.setZThreshold(40);
  analyzer.reset();
  assert.equal(analyzer.zThreshold, 40);
  assert.equal(analyzer.eventCount, 0);
});

test("the simulated pipeline produces mappable crossings", () => {
  const attractor = new LorenzAttractor();
  const analyzer = new ChaosAnalyzer();
  const mapper = new MusicalMapper();
  const crossings = [];

  for (let i = 0; i < 12000; i++) {
    crossings.push(
      ...analyzer
        .push(attractor.step())
        .filter(({ type }) => type === "x-crossing"),
    );
  }

  assert.ok(crossings.length > 10);
  const note = mapper.map(crossings[0]);
  assert.ok(note.midi >= 12);
  assert.ok(note.midi <= 108);
  assert.ok(note.velocity >= 0.01);
  assert.ok(note.velocity <= 1);
  assert.ok(note.duration >= 0.03);
  assert.ok(note.duration <= 4);
});

test("musical note conversions use standard MIDI tuning", () => {
  assert.equal(noteNameToMidi("C", 4), 60);
  assert.equal(midiToName(69), "A4");
  assert.equal(midiToFreq(69), 440);
  assert.throws(() => noteNameToMidi("H"), /Unknown note name/);
});

test("musical mapping respects lobe configuration and clamps output", () => {
  const mapper = new MusicalMapper({
    rootName: "D",
    scaleName: "major",
    octaveRange: [3, 3],
    lobeA: {
      scale: "whole-tone",
      octaveOffset: -10,
      velocityScale: 10,
      durationScale: 20,
      pan: -2,
      filterCutoff: 900,
      waveform: "square",
      degreeWeights: [0, 0, 0, 0, 0, 1],
    },
  });

  const note = mapper.map(
    chaosEvent({ lobe: "A", x: -1, y: 27, z: 100, velocity: -1 }),
  );

  assert.equal(note.scaleName, "whole-tone");
  assert.equal(note.degree, 5);
  assert.equal(note.midi, 12);
  assert.equal(note.velocity, 1);
  assert.equal(note.duration, 4);
  assert.equal(note.pan, -1);
  assert.equal(note.filter, 900);
  assert.equal(note.waveform, "square");
});

test("event generator filters disabled, mismatched, and nth events", () => {
  const generator = new EventGenerator([
    { id: "all", eventTypes: ["x-crossing"], densityMode: "all" },
    { id: "disabled", enabled: false, eventTypes: ["x-crossing"] },
    { id: "other", eventTypes: ["y-crossing"] },
    { id: "nth", eventTypes: ["x-crossing"], densityMode: "nth", nth: 2 },
  ]);

  assert.deepEqual(
    generator.generate(chaosEvent()).map(({ voiceId }) => voiceId),
    ["all"],
  );
  assert.deepEqual(
    generator.generate(chaosEvent()).map(({ voiceId }) => voiceId),
    ["all", "nth"],
  );
});

test("event generator supports deterministic and threshold density modes", () => {
  const voices = [
    {
      id: "chance",
      eventTypes: ["x-crossing"],
      densityMode: "probability",
      probability: 0.5,
    },
    {
      id: "fast",
      eventTypes: ["x-crossing"],
      densityMode: "velocity-threshold",
      velocityThreshold: 20,
    },
    {
      id: "far",
      eventTypes: ["x-crossing"],
      densityMode: "custom-threshold",
      customMetric: "distance",
      customThreshold: 20,
    },
    {
      id: "wide",
      eventTypes: ["x-crossing"],
      densityMode: "custom-threshold",
      customMetric: "y",
      customThreshold: 3,
    },
  ];
  const first = new EventGenerator(voices, 42);
  const second = new EventGenerator(voices, 42);
  const events = Array.from({ length: 12 }, (_, i) =>
    chaosEvent({ velocity: i, distance: i, y: -i }),
  );
  const run = (generator) =>
    events.map((event) =>
      generator.generate(event).map(({ voiceId }) => voiceId),
    );

  assert.deepEqual(run(first), run(second));
  assert.deepEqual(run(new EventGenerator(voices, 42))[11], ["wide"]);

  first.setVoices([{ id: "always", eventTypes: ["x-crossing"] }]);
  first.setSeed(7);
  assert.equal(first.generate(chaosEvent())[0].voiceId, "always");
});
