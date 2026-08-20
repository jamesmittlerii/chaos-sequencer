import { SynthVoice } from "./synth-voice.js";

/**
 * AudioEngine — owns the AudioContext, master bus, and synth voices.
 */
export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.compressor = null;
    this.voices = new Map();
    this.voiceConfigs = new Map();
    this.started = false;
  }

  async resume() {
    if (!this.ctx) this._build();
    if (this.ctx.state !== "running") await this.ctx.resume();
    this.started = true;
    return this.ctx;
  }

  get currentTime() {
    return this.ctx ? this.ctx.currentTime : 0;
  }

  setMasterGain(value) {
    if (!this.master || !this.ctx) return;
    this.master.gain.setTargetAtTime(value, this.ctx.currentTime, 0.02);
  }

  configureVoice(id, config) {
    this.voiceConfigs.set(id, { ...(this.voiceConfigs.get(id) ?? {}), ...config });
    const voice = this.voices.get(id);
    if (voice) voice.setConfig(this.voiceConfigs.get(id));
  }

  play(note, when) {
    if (!this.ctx) return;
    const voice = this._voice(note.voiceId);
    voice.play(note, when);
  }

  stopAll() {
    for (const v of this.voices.values()) v.stop();
  }

  _build() {
    const ctx = new AudioContext();
    const master = ctx.createGain();
    master.gain.value = 0.7;

    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.knee.value = 12;
    compressor.ratio.value = 6;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.12;

    master.connect(compressor);
    compressor.connect(ctx.destination);

    this.ctx = ctx;
    this.master = master;
    this.compressor = compressor;
  }

  _voice(id) {
    if (!this.voices.has(id)) {
      const voice = new SynthVoice(this.ctx, this.master, this.voiceConfigs.get(id) ?? {});
      this.voices.set(id, voice);
    }
    return this.voices.get(id);
  }
}
