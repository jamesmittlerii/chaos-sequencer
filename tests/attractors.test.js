import assert from "node:assert/strict";
import test from "node:test";
import { ATTRACTOR_IDS, ATTRACTOR_SYSTEMS, ChaoticAttractor } from "../js/attractors.js";
import { ChaosAnalyzer } from "../js/chaos-analyzer.js";
import { LorenzAttractor } from "../js/lorenz.js";

test("registry contains all seven source systems", () => {
  assert.deepEqual(ATTRACTOR_IDS, [
    "lorenz",
    "chua",
    "rossler",
    "thomas",
    "aizawa",
    "halvorsen",
    "rabinovich",
  ]);
});

test("registry-backed Lorenz exactly preserves the original trajectory", () => {
  const original = new LorenzAttractor();
  const registered = new ChaoticAttractor("lorenz");

  for (let i = 0; i < 2000; i++) {
    assert.deepEqual(registered.step(), original.step());
  }
});

test("every system is deterministic, finite, and produces musical events promptly", () => {
  for (const systemId of ATTRACTOR_IDS) {
    const definition = ATTRACTOR_SYSTEMS[systemId];
    const first = new ChaoticAttractor(systemId);
    const second = new ChaoticAttractor(systemId);
    const analyzer = new ChaosAnalyzer({ zThreshold: definition.zThreshold });
    const eventTypes = new Set();
    const steps = Math.ceil(10 / first.dt);

    for (let i = 0; i < steps; i++) {
      const state = first.step();
      const duplicate = second.step();
      assert.deepEqual(state, duplicate, `${systemId} must be deterministic`);
      assert.ok(
        [state.x, state.y, state.z, state.dx, state.dy, state.dz].every(Number.isFinite),
        `${systemId} must remain finite`,
      );
      for (const event of analyzer.push(state)) eventTypes.add(event.type);
    }

    assert.ok(eventTypes.has("x-crossing"), `${systemId} must produce Bass events`);
    assert.ok(
      eventTypes.has("y-max") || eventTypes.has("y-min"),
      `${systemId} must produce Lead events`,
    );
    assert.ok(eventTypes.has("z-threshold"), `${systemId} must produce Perc events`);
  }
});

test("switching systems restores that system's parameters and seed", () => {
  const attractor = new ChaoticAttractor("lorenz", { sigma: 12 });
  attractor.setSystem("rossler", { a: 0.25 });

  assert.equal(attractor.systemId, "rossler");
  assert.deepEqual(attractor.params, { a: 0.25, b: 0.2, c: 5.7 });
  assert.equal(attractor.x0, 1);
  assert.equal(attractor.dt, 0.01);
  assert.deepEqual(attractor.clone().state(), attractor.state());
});
