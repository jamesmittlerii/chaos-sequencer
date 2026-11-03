import { midiToFreq } from "./musical-mapper.js";

/**
 * ChaosEngine — advances the attractor, detects events, maps them,
 * and hands notes to the scheduler / audio engine.
 *
 * render(start, end) is the clock-agnostic contract. Times are in the
 * same seconds domain as Sequencer.simulationToAudio. The web app calls
 * it from a lookahead tick. A plugin calls it once per audio block.
 */
export class ChaosEngine {
  constructor({ attractor, analyzer, generator, mappers, sequencer, audio, midi, clock, onNote, onPoint }) {
    this.attractor = attractor;
    this.analyzer = analyzer;
    this.generator = generator;
    this.mappers = mappers;
    this.sequencer = sequencer;
    this.audio = audio ?? null;
    this.midi = midi ?? null;
    this.clock = clock ?? { now: () => this.audio?.currentTime ?? 0 };
    this.onNote = onNote;
    this.onPoint = onPoint;
    this.running = false;
    this.timer = null;
    this.lookahead = 0.12;
    this.intervalMs = 25;
    this.modulateFilter = 0;
    this.modulatePan = 0;
    this.modulateFm = 0;
    this.internalAudioEnabled = true;
    this.bounds = {
      x: [-20, 20],
      z: [1, 48],
      velocity: [8, 90],
    };
    this.pending = [];
    this.cursor = 0;
  }

  start() {
    const t0 = this.clock.now() + 0.08;
    this._resetPerformance();
    this.sequencer.reset(t0);
    this.pending = [];
    this.cursor = t0;
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
    this.midi?.stopAll();
  }

  resume() {
    if (this.running) return;
    this.running = true;
    this._arm();
  }

  stop() {
    this.pause();
    this.audio?.stopAll();
  }

  /**
   * Drop the trajectory and fast-forward to `audioTime` without emitting.
   * `audioTime` uses the sequencer clock (simulationToAudio).
   */
  seek(audioTime) {
    this._resetPerformance();
    this.pending = [];
    this.sequencer.occupied.clear();
    this._advanceUntil(audioTime, false);
    this.cursor = audioTime;
  }

  /**
   * Advance through [start, end) and return noteOn / noteOff events whose
   * times fall in that window. A start that is not the current cursor
   * resimulates from the seed up to `start` before emitting.
   */
  render(start, end) {
    if (!(end > start)) return [];
    if (Math.abs(start - this.cursor) > 1e-4) this.seek(start);
    this._advanceUntil(end, true);

    const out = [];
    const keep = [];
    for (const event of this.pending) {
      if (event.time < start) continue;
      if (event.time < end) out.push(event);
      else keep.push(event);
    }
    this.pending = keep;
    this.cursor = end;
    out.sort((a, b) => a.time - b.time || kindOrder(a.kind) - kindOrder(b.kind));
    return out;
  }

  _arm() {
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => this._tick(), this.intervalMs);
  }

  _tick() {
    if (!this.running) return;
    if (this.audio && !this.audio.ctx) return;
    const horizon = this.clock.now() + this.lookahead;
    const events = this.render(this.cursor, horizon);
    for (const event of events) this._dispatch(event);
  }

  _resetPerformance() {
    this.attractor.reset();
    this.analyzer.reset();
    this.generator.reset();
  }

  _advanceUntil(endAudio, emit) {
    let guard = 0;
    while (this.sequencer.simulationToAudio(this.attractor.t) < endAudio && guard < 200000) {
      guard++;
      const state = this.attractor.step();
      if (emit && this.onPoint) this.onPoint(state);
      const chaosEvents = this.analyzer.push(state);
      if (emit) this._processChaosEvents(chaosEvents);
      else {
        for (const chaos of chaosEvents) this.generator.generate(chaos);
      }
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
      this._queueNote(note, chaos.timestamp);
    }
  }

  _queueNote(note, timestamp) {
    const when = this.sequencer.schedule(timestamp);
    if (!this.sequencer.claimSlot(note.voiceId, when)) return;
    this.pending.push({ kind: "noteOn", time: when, note });
    this.pending.push({ kind: "noteOff", time: when + note.duration, note });
  }

  _dispatch(event) {
    if (event.kind !== "noteOn") return;
    const now = this.clock.now();
    const when = event.time;
    if (when < now - 0.02) return;
    const scheduledWhen = Math.max(when, now + 0.005);
    if (this.internalAudioEnabled && this.audio) this.audio.play(event.note, scheduledWhen);
    this.midi?.play(event.note, scheduledWhen, now);
    if (this.onNote) this.onNote(event.note, when);
  }

  _enrich(candidate, mapped, chaos) {
    const xNorm = normalize(chaos.x, this.bounds.x);
    const zNorm = normalize(chaos.z, this.bounds.z);
    const pan = clamp(mapped.pan + (xNorm * 2 - 1) * this.modulatePan, -1, 1);
    const filter = mapped.filter + zNorm * this.modulateFilter * 4200;
    const fm = this.modulateFm * normalize(chaos.velocity, this.bounds.velocity);

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

function kindOrder(kind) {
  if (kind === "noteOff") return 0;
  if (kind === "cc") return 1;
  return 2;
}

function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}

function normalize(value, [lo, hi]) {
  if (lo === hi) return 0.5;
  return clamp((value - lo) / (hi - lo), 0, 1);
}
