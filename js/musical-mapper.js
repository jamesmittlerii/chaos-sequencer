/**
 * MusicalMapper — turns chaotic event features into musical parameters.
 *
 * Raw Lorenz coordinates are never used as MIDI note numbers.
 * Values are normalized into typical attractor ranges, then mapped
 * onto scale degrees, velocity, duration, and register.
 */

export const NOTE_NAMES = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
];

export const SCALES = {
  chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  "pentatonic-major": [0, 2, 4, 7, 9],
  "pentatonic-minor": [0, 3, 5, 7, 10],
  "whole-tone": [0, 2, 4, 6, 8, 10],
};

export const SCALE_LABELS = {
  chromatic: "Chromatic",
  major: "Major",
  minor: "Minor",
  "pentatonic-major": "Pentatonic major",
  "pentatonic-minor": "Pentatonic minor",
  "whole-tone": "Whole tone",
};

/** Typical bounds of the classic chaotic Lorenz attractor. */
export const LORENZ_BOUNDS = {
  y: [-27, 27],
  z: [1, 48],
  velocity: [8, 90],
  distance: [10, 48],
  x: [-20, 20],
};

export const DEFAULT_LOBE = {
  octaveOffset: 0,
  velocityScale: 1,
  durationScale: 1,
  filterCutoff: 1800,
  pan: 0,
  waveform: null,
  scale: null,
  rootOffset: 0,
  degreeWeights: null,
};

function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}

function normalize(value, [lo, hi]) {
  if (hi === lo) return 0.5;
  return clamp((value - lo) / (hi - lo), 0, 1);
}

export function noteNameToMidi(name, octave = 4) {
  const i = NOTE_NAMES.indexOf(name);
  if (i < 0) throw new Error(`Unknown note name: ${name}`);
  return (octave + 1) * 12 + i;
}

export function midiToFreq(midi) {
  return 440 * 2 ** ((midi - 69) / 12);
}

export function midiToName(midi) {
  const n = ((midi % 12) + 12) % 12;
  const oct = Math.floor(midi / 12) - 1;
  return `${NOTE_NAMES[n]}${oct}`;
}

function weightedDegree(norm, scale, weights) {
  if (!weights || weights.length !== scale.length) {
    const idx = Math.min(scale.length - 1, Math.floor(norm * scale.length));
    return { degree: idx, interval: scale[idx] };
  }
  const bag = [];
  for (let i = 0; i < weights.length; i++) {
    const w = Math.max(0, Math.round(weights[i] * 4));
    for (let k = 0; k < w; k++) bag.push(i);
  }
  if (bag.length === 0) {
    const idx = Math.min(scale.length - 1, Math.floor(norm * scale.length));
    return { degree: idx, interval: scale[idx] };
  }
  const idx = bag[Math.min(bag.length - 1, Math.floor(norm * bag.length))];
  return { degree: idx, interval: scale[idx] };
}

export class MusicalMapper {
  constructor(config = {}) {
    this.setConfig(config);
  }

  setConfig(config = {}) {
    this.rootName = config.rootName ?? this.rootName ?? "C";
    this.rootOctave = config.rootOctave ?? this.rootOctave ?? 3;
    this.scaleName = config.scaleName ?? this.scaleName ?? "pentatonic-minor";
    this.octaveRange = config.octaveRange ?? this.octaveRange ?? [2, 5];
    this.durationRange = config.durationRange ?? this.durationRange ?? [0.08, 0.55];
    this.velocityRange = config.velocityRange ?? this.velocityRange ?? [0.15, 0.95];
    this.bounds = { ...LORENZ_BOUNDS, ...config.bounds };
    this.lobeA = { ...DEFAULT_LOBE, ...this.lobeA, ...config.lobeA };
    this.lobeB = { ...DEFAULT_LOBE, ...this.lobeB, ...config.lobeB };
  }

  lobeConfig(lobe) {
    return lobe === "A" ? this.lobeA : this.lobeB;
  }

  map(chaosEvent) {
    const lobe = chaosEvent.lobe ?? (chaosEvent.x < 0 ? "A" : "B");
    const lobeCfg = this.lobeConfig(lobe);

    const scaleName = lobeCfg.scale || this.scaleName;
    const scale = SCALES[scaleName] ?? SCALES["pentatonic-minor"];

    const yNorm = normalize(chaosEvent.y, this.bounds.y);
    const zNorm = normalize(chaosEvent.z, this.bounds.z);
    const velNorm = normalize(chaosEvent.velocity, this.bounds.velocity);
    const distNorm = normalize(chaosEvent.distance, this.bounds.distance);

    const { degree, interval } = weightedDegree(yNorm, scale, lobeCfg.degreeWeights);

    const [octLo, octHi] = this.octaveRange;
    const octaves = Math.max(0, octHi - octLo);
    const register = octLo + Math.round(distNorm * octaves) + (lobeCfg.octaveOffset || 0);

    const rootMidi =
      noteNameToMidi(this.rootName, 0) + (lobeCfg.rootOffset || 0);
    const midi = clamp(rootMidi + register * 12 + interval, 12, 108);

    const [vLo, vHi] = this.velocityRange;
    const velocity = clamp((vLo + zNorm * (vHi - vLo)) * (lobeCfg.velocityScale || 1), 0.01, 1);

    const [dLo, dHi] = this.durationRange;
    // Faster trajectory → shorter notes.
    const duration = clamp(
      (dHi - velNorm * (dHi - dLo)) * (lobeCfg.durationScale || 1),
      0.03,
      4,
    );

    return {
      timestamp: chaosEvent.timestamp,
      midi,
      noteName: midiToName(midi),
      frequency: midiToFreq(midi),
      velocity,
      duration,
      octave: register,
      degree,
      scaleName,
      lobe,
      pan: clamp(lobeCfg.pan ?? 0, -1, 1),
      filter: lobeCfg.filterCutoff ?? 1800,
      waveform: lobeCfg.waveform,
      source: chaosEvent,
    };
  }
}
