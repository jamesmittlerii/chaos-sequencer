import { ChaoticAttractor } from "../js/attractors.js";
import { ChaosAnalyzer } from "../js/chaos-analyzer.js";
import { ChaosEngine } from "../js/engine.js";
import { EventGenerator } from "../js/event-generator.js";
import { MusicalMapper } from "../js/musical-mapper.js";
import { Sequencer } from "../js/sequencer.js";

/** Default voice-1 Lorenz setup used as the C++ port fixture. */
export function makeReferenceEngine() {
  const attractor = new ChaoticAttractor("lorenz");
  const analyzer = new ChaosAnalyzer();
  const sequencer = new Sequencer({ speed: 2.6, bpm: 92, quantize: false, timingInfluence: 0 });
  sequencer.reset(0);
  const mapper = new MusicalMapper({
    rootName: "C",
    scaleName: "pentatonic-minor",
    octaveRange: [2, 4],
    durationRange: [0.18, 0.72],
    bounds: attractor.definition.bounds,
    xCenter: 0,
    lobeA: {
      octaveOffset: 0,
      velocityScale: 0.85,
      durationScale: 1.2,
      pan: -0.35,
      degreeWeights: [3, 1, 3, 1, 1],
    },
    lobeB: {
      octaveOffset: 1,
      velocityScale: 1.15,
      durationScale: 0.8,
      pan: 0.35,
      degreeWeights: [1, 1, 1, 1, 1],
    },
  });
  const generator = new EventGenerator([
    { id: "voice-1", name: "Bass", enabled: true, eventTypes: ["x-crossing"], waveform: "triangle" },
  ]);
  const engine = new ChaosEngine({
    attractor,
    analyzer,
    generator,
    mappers: new Map([["voice-1", mapper]]),
    sequencer,
    clock: { now: () => 0 },
  });
  engine.cursor = 0;
  engine.bounds = attractor.definition.bounds;
  return engine;
}
