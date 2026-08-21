import { midiToFreq } from "./musical-mapper.js";

/**
 * ChaosEngine — advances the attractor, detects events, maps them,
 * and hands notes to the scheduler / audio engine.
 *
 * This is the only place the independent stages are composed.
 */
export class ChaosEngine {
  constructor({ lorenz, analyzer, generator, mappers, sequencer, audio, onNote, onPoint }) {
    this.lorenz = lorenz;
    this.analyzer = analyzer;
    this.generator = generator;
    this.mappers = mappers;
    this.sequencer = sequencer;
    this.audio = audio;
    this.onNote = onNote;
    this.onPoint = onPoint;
    this.running = false;
    this.timer = null;
    this.lookahead = 0.12;
    this.intervalMs = 25;
    this.modulateFilter = 0;
    this.modulatePan = 0;
    this.modulateFm = 0;
  }

  start() {
    const t0 = this.audio.currentTime + 0.08;
    this.lorenz.reset();
    this.analyzer.reset();
    this.generator.reset();
    this.sequencer.reset(t0);
    this.running = true;
    this._tick();
    this._arm();
  }

  pause() {
    this.running = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  resume() {
    if (this.running) return;
    this.running = true;
    this._arm();
  }

  stop() {
    this.pause();
    this.audio.stopAll();
  }

  _arm() {
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => this._tick(), this.intervalMs);
  }

  _tick() {
    if (!this.running || !this.audio.ctx) return;
    const horizon = this.audio.currentTime + this.lookahead;
    let guard = 0;
    while (this.sequencer.lorenzToAudio(this.lorenz.t) < horizon && guard < 4000) {
      guard++;
      const state = this.lorenz.step();
      if (this.onPoint) this.onPoint(state);
      this._processChaosEvents(this.analyzer.push(state));
    }
  }

  _processChaosEvents(chaosEvents) {
    for (const chaos of chaosEvents) {
      this._processCandidates(this.generator.generate(chaos), chaos);
    }
  }

  _processCandidates(candidates, chaos) {
    for (const candidate of candidates) {
      const mapper = this.mappers.get(candidate.voiceId) ?? this.mappers.values().next().value;
      const note = this._enrich(candidate, mapper.map(chaos), chaos);
      this._scheduleNote(note, chaos.timestamp);
    }
  }

  _scheduleNote(note, timestamp) {
    const when = this.sequencer.schedule(timestamp);
    if (when < this.audio.currentTime - 0.02) return;
    if (!this.sequencer.claimSlot(note.voiceId, when)) return;

    this.audio.play(note, Math.max(when, this.audio.currentTime + 0.005));
    if (this.onNote) this.onNote(note, when);
  }

  _enrich(candidate, mapped, chaos) {
    const xNorm = clamp((chaos.x + 20) / 40, 0, 1);
    const zNorm = clamp((chaos.z - 1) / 47, 0, 1);
    const pan =
      clamp(mapped.pan + (xNorm * 2 - 1) * this.modulatePan, -1, 1);
    const filter = mapped.filter + zNorm * this.modulateFilter * 4200;
    const fm = this.modulateFm * (chaos.velocity / 90);

    return {
      ...mapped,
      voiceId: candidate.voiceId,
      voiceName: candidate.voiceName,
      instrument: candidate.instrument,
      waveform: candidate.waveform || mapped.waveform,
      pan,
      filter,
      fmAmount: fm,
      frequency: mapped.frequency ?? midiToFreq(mapped.midi),
      eventNumber: chaos.id,
      direction: chaos.direction,
      chaos,
    };
  }
}

function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}
