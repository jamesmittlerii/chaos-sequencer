/**
 * SynthVoice — subtractive voice: oscillator → low-pass → ADSR → pan.
 *
 * Musical decisions live elsewhere. This class only renders a note
 * at a scheduled AudioContext time.
 */

export const WAVEFORMS = ["sine", "triangle", "sawtooth", "square", "noise"];

function midiToFreq(midi) {
  return 440 * 2 ** ((midi - 69) / 12);
}

export class SynthVoice {
  constructor(ctx, destination, config = {}) {
    this.ctx = ctx;
    this.destination = destination;
    this.setConfig(config);
    this._noise = null;
    this._active = [];
    this._monoGain = null;
  }

  setConfig(config = {}) {
    this.waveform = config.waveform ?? this.waveform ?? "triangle";
    this.attack = config.attack ?? this.attack ?? 0.01;
    this.decay = config.decay ?? this.decay ?? 0.12;
    this.sustain = config.sustain ?? this.sustain ?? 0.55;
    this.release = config.release ?? this.release ?? 0.18;
    this.cutoff = config.cutoff ?? this.cutoff ?? 1800;
    this.resonance = config.resonance ?? this.resonance ?? 0.8;
    this.amplitude = config.amplitude ?? this.amplitude ?? 0.35;
    this.mono = config.mono ?? this.mono ?? true;
    this.fmAmount = config.fmAmount ?? this.fmAmount ?? 0;
    this.fmRatio = config.fmRatio ?? this.fmRatio ?? 2;
  }

  play(note, when) {
    const ctx = this.ctx;
    const duration = Math.max(0.03, note.duration);
    const velocity = Math.max(0.01, Math.min(1, note.velocity));
    const amp = this.amplitude * velocity;
    const waveform = note.waveform || this.waveform;
    const cutoff = note.filter ?? this.cutoff;
    const pan = note.pan ?? 0;
    const freq = note.frequency ?? midiToFreq(note.midi);
    const stopAt = when + duration + this.release + 0.02;

    if (this.mono) this._releaseActive(when);

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(Math.max(40, cutoff), when);
    filter.Q.setValueAtTime(this.resonance, when);

    const gain = ctx.createGain();
    const peak = amp;
    const sustainLevel = peak * this.sustain;
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), when + Math.max(0.005, this.attack));
    gain.gain.exponentialRampToValueAtTime(
      Math.max(0.0002, sustainLevel),
      when + Math.max(0.005, this.attack) + Math.max(0.005, this.decay),
    );
    const relStart = Math.max(when + this.attack + this.decay, when + duration);
    gain.gain.setValueAtTime(Math.max(0.0002, sustainLevel), relStart);
    gain.gain.exponentialRampToValueAtTime(0.0001, relStart + Math.max(0.02, this.release));

    const panner = ctx.createStereoPanner();
    panner.pan.setValueAtTime(Math.max(-1, Math.min(1, pan)), when);

    filter.connect(gain);
    gain.connect(panner);
    panner.connect(this.destination);

    const nodes = { filter, gain, panner, stopAt };

    if (waveform === "noise") {
      const src = ctx.createBufferSource();
      src.buffer = this._noiseBuffer();
      src.loop = true;
      src.connect(filter);
      src.start(when);
      src.stop(stopAt);
      nodes.src = src;
    } else {
      const osc = ctx.createOscillator();
      osc.type = waveform;
      osc.frequency.setValueAtTime(freq, when);

      const fm = note.fmAmount ?? this.fmAmount;
      if (fm > 0) {
        const mod = ctx.createOscillator();
        const modGain = ctx.createGain();
        mod.frequency.setValueAtTime(freq * this.fmRatio, when);
        modGain.gain.setValueAtTime(fm * freq, when);
        mod.connect(modGain);
        modGain.connect(osc.frequency);
        mod.start(when);
        mod.stop(stopAt);
        nodes.mod = mod;
      }

      osc.connect(filter);
      osc.start(when);
      osc.stop(stopAt);
      nodes.src = osc;
    }

    this._active.push(nodes);
    this._prune(when);
    return nodes;
  }

  modulateFilter(cutoff, when) {
    for (const n of this._active) {
      if (n.stopAt > when) {
        n.filter.frequency.setTargetAtTime(Math.max(40, cutoff), when, 0.05);
      }
    }
  }

  _releaseActive(when) {
    for (const n of this._active) {
      if (n.stopAt > when) {
        try {
          n.gain.gain.cancelScheduledValues(when);
          n.gain.gain.setValueAtTime(Math.max(0.0001, n.gain.gain.value), when);
          n.gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.03);
        } catch {
          /* already stopped */
        }
      }
    }
  }

  _prune(now) {
    this._active = this._active.filter((n) => n.stopAt > now - 1);
  }

  _noiseBuffer() {
    if (this._noise) return this._noise;
    const length = this.ctx.sampleRate * 1;
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    this._noise = buffer;
    return buffer;
  }

  stop() {
    const now = this.ctx.currentTime;
    for (const n of this._active) {
      try {
        n.gain.gain.cancelScheduledValues(now);
        n.gain.gain.setValueAtTime(Math.max(0.0001, n.gain.gain.value), now);
        n.gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
        n.src.stop(now + 0.06);
      } catch {
        /* ignore */
      }
    }
    this._active = [];
  }
}
