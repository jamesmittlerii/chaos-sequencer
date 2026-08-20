import { LorenzAttractor } from "../js/lorenz.js";
import { ChaosAnalyzer } from "../js/chaos-analyzer.js";
import { MusicalMapper } from "../js/musical-mapper.js";
import { EventGenerator } from "../js/event-generator.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const a = new LorenzAttractor();
for (let i = 0; i < 8000; i++) a.step();
assert(Number.isFinite(a.x) && Number.isFinite(a.y) && Number.isFinite(a.z), "trajectory left the reals");
assert(Math.abs(a.x) < 40 && Math.abs(a.y) < 50 && a.z > -5 && a.z < 60, `left the attractor: ${a.x} ${a.y} ${a.z}`);

const b = new LorenzAttractor({ x: 0.1, y: 0, z: 0 });
const c = new LorenzAttractor({ x: 0.1, y: 0, z: 0 });
for (let i = 0; i < 2000; i++) {
  b.step();
  c.step();
}
assert(b.x === c.x && b.y === c.y && b.z === c.z, "same seed must replay");

const d = new LorenzAttractor({ x: 0.1 + 1e-6, y: 0, z: 0 });
for (let i = 0; i < 4000; i++) {
  c.step();
  d.step();
}
const drift = Math.hypot(c.x - d.x, c.y - d.y, c.z - d.z);
assert(drift > 1, `perturbed seed should diverge, drift=${drift}`);

const sim = new LorenzAttractor({ x: 0.1, y: 0, z: 0 });
const analyzer = new ChaosAnalyzer();
let firstCross = null;
const crosses = [];
for (let i = 0; i < 12000; i++) {
  const events = analyzer.push(sim.step());
  for (const e of events) {
    if (e.type === "x-crossing") {
      if (!firstCross) firstCross = e;
      crosses.push(e);
    }
  }
}
assert(crosses.length > 10, `expected many x-crossings, got ${crosses.length}`);
assert(firstCross.direction === "up" || firstCross.direction === "down", "crossing needs a direction");
assert(Math.abs(firstCross.x) < 1e-6, "interpolated crossing should sit on x=0");

const mapper = new MusicalMapper({ rootName: "C", scaleName: "pentatonic-minor" });
const n1 = mapper.map(firstCross);
const n2 = mapper.map(firstCross);
assert(n1.midi === n2.midi && n1.duration === n2.duration, "mapping must be deterministic");
assert(n1.midi >= 12 && n1.midi <= 108, "midi out of range");

const gen = new EventGenerator(
  [{ id: "voice-1", enabled: true, eventTypes: ["x-crossing"], densityMode: "all" }],
  1,
);
assert(gen.generate(firstCross).length === 1, "all-density should emit");

const nth = new EventGenerator(
  [{ id: "voice-1", enabled: true, eventTypes: ["x-crossing"], densityMode: "nth", nth: 2 }],
  1,
);
const kept = crosses.map((e) => nth.generate(e)).filter((x) => x.length).length;
assert(kept === Math.floor(crosses.length / 2), `nth=2 kept ${kept} of ${crosses.length}`);

console.log("ok");
console.log(`first x-crossing at t=${firstCross.timestamp.toFixed(3)} dir=${firstCross.direction}`);
console.log(`crossings in t<=${sim.t.toFixed(2)}: ${crosses.length}`);
console.log(`mapped note ${n1.noteName} midi=${n1.midi} vel=${n1.velocity.toFixed(2)} dur=${n1.duration.toFixed(3)}`);
console.log(`sensitive dependence drift after extra steps: ${drift.toFixed(2)}`);
