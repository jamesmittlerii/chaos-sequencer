/**
 * Headless Lorenz device for Max for Live (and Node tests).
 * Reuses the same js/ pipeline as the website — MIDI only, no Web Audio.
 */

import { ATTRACTOR_SYSTEMS, ChaoticAttractor } from "../js/attractors.js";
import { ChaosAnalyzer } from "../js/chaos-analyzer.js";
import { ChaosEngine } from "../js/engine.js";
import { EventGenerator } from "../js/event-generator.js";
import { MusicalMapper, SCALES } from "../js/musical-mapper.js";
import { Sequencer } from "../js/sequencer.js";

function normalizePreset(preset) {
  const source = preset && typeof preset === "object" ? preset : {};
  const params = { ...(source.params || source) };
  params.systemId ||= "lorenz";
  if (!params.attractorParams || typeof params.attractorParams !== "object") {
    params.attractorParams =
      params.systemId === "lorenz"
        ? {
            sigma: params.sigma ?? 10,
            rho: params.rho ?? 28,
            beta: params.beta ?? 8 / 3,
          }
        : {};
  }
  delete params.sigma;
  delete params.rho;
  delete params.beta;
  return { ...source, v: 2, params };
}

const VOICE_RANGES = {
  "voice-1": { octaveRange: [2, 4], durationRange: [0.18, 0.72], name: "Bass", eventTypes: ["x-crossing"] },
  "voice-2": { octaveRange: [4, 6], durationRange: [0.06, 0.32], name: "Lead", eventTypes: ["y-max", "y-min"] },
  "voice-3": { octaveRange: [3, 5], durationRange: [0.04, 0.11], name: "Perc", eventTypes: ["z-threshold"] },
};

const DEFAULT_CHANNELS = {
  "voice-1": 1,
  "voice-2": 2,
  "voice-3": 10,
};

function degreeWeights(kind, scaleName) {
  const n = (SCALES[scaleName] ?? SCALES.minor).length;
  if (kind === "tonic") {
    return Array.from({ length: n }, (_, i) => (i === 0 || i === Math.floor(n / 2) ? 3 : 1));
  }
  if (kind === "color") {
    return Array.from({ length: n }, (_, i) => (i === 0 ? 1 : 2));
  }
  return Array.from({ length: n }, () => 1);
}

function defaultParams() {
  return {
    systemId: "lorenz",
    attractorParams: { sigma: 10, rho: 28, beta: 2.6667 },
    dt: 0.01,
    speed: 2.6,
    x0: 0.1,
    y0: 0,
    z0: 0,
    root: "C",
    scale: "pentatonic-minor",
    lobeAOctave: 0,
    lobeBOctave: 1,
    lobeAVel: 0.85,
    lobeBVel: 1.15,
    lobeADur: 1.2,
    lobeBDur: 0.8,
    lobeAPan: -0.35,
    lobeBPan: 0.35,
    lobeAFilter: 900,
    lobeBFilter: 2400,
    lobeAScale: "",
    lobeBScale: "",
    lobeAWeights: "tonic",
    lobeBWeights: "even",
    quantize: false,
    grid: "1/8",
    bpm: 92,
    timingInfluence: 0,
    densityMode: "all",
    nth: 1,
    probability: 1,
    velocityThreshold: 0,
    customMetric: "distance",
    customThreshold: 0,
    zThreshold: 25,
    voice1Enable: true,
    voice2Enable: false,
    voice3Enable: false,
    midiChannel1: 1,
    midiChannel2: 2,
    midiChannel3: 10,
    modulatePan: 0,
    modulateFilter: 0,
    modulateFm: 0,
  };
}

/**
 * @param {object} [options]
 * @param {(event: object) => void} [options.onMidi] called with { kind, time, channel, midi, velocity, note }
 */
export function createLorenzDevice(options = {}) {
  const params = { ...defaultParams() };
  const attractor = new ChaoticAttractor("lorenz");
  const analyzer = new ChaosAnalyzer();
  const sequencer = new Sequencer();
  const mappers = new Map([
    ["voice-1", new MusicalMapper({ ...VOICE_RANGES["voice-1"] })],
    ["voice-2", new MusicalMapper({ ...VOICE_RANGES["voice-2"] })],
    ["voice-3", new MusicalMapper({ ...VOICE_RANGES["voice-3"] })],
  ]);
  const generator = new EventGenerator([], 1);

  let clockSeconds = 0;
  const engine = new ChaosEngine({
    attractor,
    analyzer,
    generator,
    mappers,
    sequencer,
    clock: { now: () => clockSeconds },
  });
  engine.internalAudioEnabled = false;

  const channels = { ...DEFAULT_CHANNELS };
  let onMidi = options.onMidi ?? null;

  function voicesFromParams() {
    const density = {
      densityMode: params.densityMode,
      nth: params.nth,
      probability: params.probability,
      velocityThreshold: params.velocityThreshold,
      customMetric: params.customMetric,
      customThreshold: params.customThreshold,
    };
    return [
      {
        id: "voice-1",
        name: "Bass",
        enabled: Boolean(params.voice1Enable),
        eventTypes: VOICE_RANGES["voice-1"].eventTypes,
        instrument: "bass",
        waveform: "triangle",
        ...density,
      },
      {
        id: "voice-2",
        name: "Lead",
        enabled: Boolean(params.voice2Enable),
        eventTypes: VOICE_RANGES["voice-2"].eventTypes,
        instrument: "lead",
        waveform: "sawtooth",
        ...density,
      },
      {
        id: "voice-3",
        name: "Perc",
        enabled: Boolean(params.voice3Enable),
        eventTypes: VOICE_RANGES["voice-3"].eventTypes,
        instrument: "perc",
        waveform: "noise",
        ...density,
      },
    ];
  }

  function applyParams() {
    const systemId = params.systemId || "lorenz";
    const definition = ATTRACTOR_SYSTEMS[systemId] ?? ATTRACTOR_SYSTEMS.lorenz;
    const attractorConfig = {
      ...(params.attractorParams || {}),
      dt: params.dt,
      x: params.x0,
      y: params.y0,
      z: params.z0,
    };
    if (attractor.systemId !== systemId) attractor.setSystem(systemId, attractorConfig);
    else attractor.setParams(attractorConfig);

    analyzer.setConfig({ zThreshold: params.zThreshold, xThreshold: definition.xCenter ?? 0 });
    engine.bounds = definition.bounds;
    engine.modulatePan = params.modulatePan || 0;
    engine.modulateFilter = params.modulateFilter || 0;
    engine.modulateFm = params.modulateFm || 0;

    const scaleName = params.scale || "pentatonic-minor";
    const shared = {
      rootName: params.root || "C",
      scaleName,
      bounds: definition.bounds,
      xCenter: definition.xCenter ?? 0,
      lobeA: {
        octaveOffset: params.lobeAOctave,
        velocityScale: params.lobeAVel,
        durationScale: params.lobeADur,
        pan: params.lobeAPan,
        filterCutoff: params.lobeAFilter,
        scale: params.lobeAScale || null,
        degreeWeights: degreeWeights(params.lobeAWeights || "even", params.lobeAScale || scaleName),
      },
      lobeB: {
        octaveOffset: params.lobeBOctave,
        velocityScale: params.lobeBVel,
        durationScale: params.lobeBDur,
        pan: params.lobeBPan,
        filterCutoff: params.lobeBFilter,
        scale: params.lobeBScale || null,
        degreeWeights: degreeWeights(params.lobeBWeights || "even", params.lobeBScale || scaleName),
      },
    };
    for (const [id, ranges] of Object.entries(VOICE_RANGES)) {
      mappers.get(id).setConfig({ ...shared, octaveRange: ranges.octaveRange, durationRange: ranges.durationRange });
    }

    generator.setVoices(voicesFromParams());
    sequencer.setConfig({
      bpm: params.bpm,
      grid: params.grid,
      quantize: Boolean(params.quantize),
      timingInfluence: params.timingInfluence,
      speed: params.speed,
    });

    channels["voice-1"] = Number(params.midiChannel1) || 1;
    channels["voice-2"] = Number(params.midiChannel2) || 2;
    channels["voice-3"] = Number(params.midiChannel3) || 10;
  }

  function emit(event) {
    const channel = channels[event.note.voiceId] ?? 1;
    const midi = {
      kind: event.kind,
      time: event.time,
      channel,
      midi: event.note.midi,
      velocity: event.kind === "noteOn" ? Math.round(event.note.velocity * 127) : 0,
      note: event.note,
    };
    if (onMidi) onMidi(midi);
    return midi;
  }

  applyParams();
  sequencer.reset(0);
  engine.cursor = 0;

  return {
    get params() {
      return { ...params };
    },

    get cursor() {
      return engine.cursor;
    },

    setOnMidi(fn) {
      onMidi = fn;
    },

    /** Apply a website/plugin `v:2` preset (or a flat params object). */
    loadPreset(preset, { reset = true } = {}) {
      const normalized = normalizePreset(preset);
      Object.assign(params, defaultParams(), normalized.params);
      applyParams();
      if (reset) this.reset();
      return this.capturePreset(normalized.name);
    },

    capturePreset(name = "M4L") {
      return { v: 2, name, params: { ...params, attractorParams: { ...(params.attractorParams || {}) } } };
    },

    set(key, value) {
      if (key === "attractorParams" && value && typeof value === "object") {
        params.attractorParams = { ...params.attractorParams, ...value };
      } else {
        params[key] = value;
      }
      applyParams();
    },

    setBpm(bpm) {
      params.bpm = bpm;
      sequencer.setConfig({ bpm });
    },

    /**
     * Reset the trajectory so simulation t=0 maps to `audioTime`
     * (Live playhead seconds from sequence origin).
     */
    beginAt(audioTime = 0) {
      clockSeconds = audioTime;
      attractor.reset();
      analyzer.reset();
      generator.reset();
      engine.pending = [];
      sequencer.reset(audioTime);
      engine.cursor = audioTime;
    },

    reset() {
      this.beginAt(0);
    },

    /** Drop trajectory and restart from seed at the current cursor. */
    restartHere() {
      this.beginAt(engine.cursor);
    },

    perturb() {
      params.x0 = (Number(params.x0) || 0) + 1e-6;
      attractor.setParams({ x: params.x0, y: params.y0, z: params.z0 });
      this.restartHere();
    },

    /**
     * Advance the device clock to `endSeconds` and return MIDI events in range.
     * Times are seconds from sequence origin (same contract as ChaosEngine.render).
     */
    render(endSeconds) {
      clockSeconds = endSeconds;
      const start = engine.cursor;
      if (endSeconds <= start) return [];
      const events = engine.render(start, endSeconds);
      return events.map(emit);
    },

    /** Render a fixed window from the current cursor (metro / lookahead mode). */
    renderLookahead(horizonSeconds = 0.1) {
      return this.render(engine.cursor + horizonSeconds);
    },

    systemIds() {
      return Object.keys(ATTRACTOR_SYSTEMS);
    },
  };
}

export { ATTRACTOR_SYSTEMS, defaultParams };
