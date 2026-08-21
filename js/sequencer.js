/**
 * Sequencer — maps Lorenz time onto the audio clock, optionally
 * blending chaotic onsets toward a quantized grid.
 *
 * timingInfluence:
 *   0 → 100% chaotic (raw Lorenz event times)
 *   1 → 100% quantized
 */

export const GRID_DIVISIONS = {
  "1/4": 1,
  "1/8": 0.5,
  "1/16": 0.25,
  triplets: 1 / 3,
};

export class Sequencer {
  constructor(options = {}) {
    this.bpm = options.bpm ?? 90;
    this.grid = options.grid ?? "1/8";
    this.quantize = options.quantize ?? false;
    this.timingInfluence = options.timingInfluence ?? 0;
    this.speed = options.speed ?? 1.2;
    this.audioStart = 0;
    this.occupied = new Set();
  }

  setConfig(config = {}) {
    if (config.bpm !== undefined) this.bpm = config.bpm;
    if (config.grid !== undefined) this.grid = config.grid;
    if (config.quantize !== undefined) this.quantize = config.quantize;
    if (config.timingInfluence !== undefined) this.timingInfluence = config.timingInfluence;
    if (config.speed !== undefined) this.speed = config.speed;
  }

  reset(audioStart) {
    this.audioStart = audioStart;
    this.occupied.clear();
  }

  /**
   * Simulation timestamp (system time of the ODE) → AudioContext time.
   */
  simulationToAudio(simulationT) {
    return this.audioStart + simulationT / Math.max(0.05, this.speed);
  }

  schedule(simulationT) {
    const chaotic = this.simulationToAudio(simulationT);
    if (!this.quantize || this.timingInfluence <= 0) return chaotic;

    const quantized = this.quantizeTime(chaotic);
    const influence = Math.max(0, Math.min(1, this.timingInfluence));
    return chaotic * (1 - influence) + quantized * influence;
  }

  quantizeTime(audioTime) {
    const beat = 60 / Math.max(20, this.bpm);
    const division = GRID_DIVISIONS[this.grid] ?? 0.5;
    const grid = beat * division;
    const elapsed = audioTime - this.audioStart;
    const snapped = Math.round(elapsed / grid) * grid;
    return this.audioStart + Math.max(0, snapped);
  }

  /**
   * Avoid stacking many notes on the exact same grid slot for one voice.
   * Returns false if this slot was already used.
   */
  claimSlot(voiceId, audioTime, window = 0.0005) {
    const key = `${voiceId}:${audioTime.toFixed(4)}`;
    if (this.occupied.has(key)) return false;
    this.occupied.add(key);
    if (this.occupied.size > 4000) {
      const first = this.occupied.values().next().value;
      this.occupied.delete(first);
    }
    return true;
  }
}
