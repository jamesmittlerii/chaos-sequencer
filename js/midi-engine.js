/**
 * Web MIDI output scheduled against the AudioContext clock.
 */
export class MidiEngine {
  access = null;
  output = null;
  enabled = false;
  channels = new Map([
    ["voice-1", 1],
    ["voice-2", 2],
    ["voice-3", 10],
  ]);

  constructor({ onChange } = {}) {
    this.onChange = onChange;
  }

  get supported() {
    return typeof navigator !== "undefined" && "requestMIDIAccess" in navigator;
  }

  async connect() {
    if (!this.supported) {
      throw new Error("Web MIDI is not supported in this browser. Try Chrome or Edge.");
    }
    if (!this.access) {
      this.access = await navigator.requestMIDIAccess();
      this.access.onstatechange = () => {
        if (this.output?.state !== "connected") this.output = null;
        this.onChange?.();
      };
    }
    this.onChange?.();
    return this.outputs();
  }

  outputs() {
    return this.access ? [...this.access.outputs.values()] : [];
  }

  setOutput(id) {
    if (this.output?.id !== id) this.stopAll();
    this.output = this.access?.outputs.get(id) ?? null;
  }

  setConfig({ enabled, channels } = {}) {
    if (enabled !== undefined) {
      if (this.enabled && !enabled) this.stopAll();
      this.enabled = enabled;
    }
    if (channels) {
      for (const [voiceId, channel] of Object.entries(channels)) {
        this.channels.set(voiceId, clamp(Math.round(channel), 1, 16));
      }
    }
  }

  play(note, when, audioNow) {
    if (!this.enabled || !this.output) return;
    const channel = (this.channels.get(note.voiceId) ?? 1) - 1;
    const pitch = clamp(Math.round(note.midi), 0, 127);
    const velocity = clamp(Math.round(note.velocity * 127), 1, 127);
    const startsAt = performance.now() + Math.max(0, when - audioNow) * 1000;
    const endsAt = startsAt + Math.max(0.01, note.duration) * 1000;

    this.output.send([0x90 | channel, pitch, velocity], startsAt);
    this.output.send([0x80 | channel, pitch, 0], endsAt);
  }

  stopAll() {
    if (!this.output) return;
    this.output.clear?.();
    for (let channel = 0; channel < 16; channel++) {
      this.output.send([0xb0 | channel, 123, 0]);
      this.output.send([0xb0 | channel, 120, 0]);
    }
  }
}

function clamp(value, lo, hi) {
  return Math.min(hi, Math.max(lo, value));
}
