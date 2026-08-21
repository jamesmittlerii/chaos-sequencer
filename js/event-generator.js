import { createRng, hashString } from "./rng.js";

/**
 * EventGenerator — decides which analyzed chaotic events become notes.
 *
 * Density modes (deterministic by default):
 *   all                 every matching event
 *   nth                 every Nth matching event
 *   probability         optional; uses a seeded PRNG
 *   velocity-threshold  only if trajectory speed ≥ threshold
 *   custom-threshold    only if a chosen metric ≥ threshold
 */
export const DENSITY_MODES = [
  "all",
  "nth",
  "probability",
  "velocity-threshold",
  "custom-threshold",
];

export const DEFAULT_VOICE = {
  id: "voice-1",
  name: "Bass",
  enabled: true,
  eventTypes: ["x-crossing"],
  densityMode: "all",
  nth: 1,
  probability: 1,
  velocityThreshold: 0,
  customMetric: "distance",
  customThreshold: 0,
  instrument: "bass",
  waveform: "triangle",
};

export class EventGenerator {
  constructor(voices = [DEFAULT_VOICE], seed = 1) {
    this.voices = voices.map((v) => ({ ...DEFAULT_VOICE, ...v }));
    this.setSeed(seed);
  }

  setSeed(seed) {
    this.seed = seed >>> 0;
    this.reset();
  }

  setVoices(voices) {
    this.voices = voices.map((v) => ({ ...DEFAULT_VOICE, ...v }));
    this.reset();
  }

  reset() {
    this.counts = new Map();
    this.rngs = new Map();
    for (const voice of this.voices) {
      this.counts.set(voice.id, 0);
      this.rngs.set(voice.id, createRng(this.seed ^ hashString(voice.id)));
    }
  }

  generate(chaosEvent) {
    const out = [];
    for (const voice of this.voices) {
      if (!voice.enabled) continue;
      if (!voice.eventTypes.includes(chaosEvent.type)) continue;
      if (!this._accept(voice, chaosEvent)) continue;

      out.push({
        voiceId: voice.id,
        voiceName: voice.name,
        instrument: voice.instrument,
        waveform: voice.waveform,
        chaos: chaosEvent,
      });
    }
    return out;
  }

  _accept(voice, event) {
    const n = (this.counts.get(voice.id) || 0) + 1;
    this.counts.set(voice.id, n);

    switch (voice.densityMode) {
      case "nth":
        return n % Math.max(1, Math.trunc(voice.nth)) === 0;
      case "probability": {
        const rng = this.rngs.get(voice.id);
        return rng() < clamp01(voice.probability);
      }
      case "velocity-threshold":
        return event.velocity >= voice.velocityThreshold;
      case "custom-threshold": {
        let metric = event[voice.customMetric];
        if (voice.customMetric === "y") metric = Math.abs(event.y);
        return typeof metric === "number" && metric >= voice.customThreshold;
      }
      case "all":
      default:
        return true;
    }
  }
}

function clamp01(v) {
  return Math.min(1, Math.max(0, Number(v) || 0));
}
