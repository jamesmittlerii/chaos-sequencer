import assert from "node:assert/strict";
import test from "node:test";
import { MidiEngine } from "../js/midi-engine.js";

test("MIDI engine schedules note on and note off messages", () => {
  const messages = [];
  const midi = new MidiEngine();
  midi.output = {
    send(data, timestamp) {
      messages.push({ data, timestamp });
    },
  };
  midi.setConfig({ enabled: true, channels: { "voice-2": 4 } });

  const before = performance.now();
  midi.play(
    { voiceId: "voice-2", midi: 60, velocity: 0.5, duration: 0.25 },
    10.2,
    10,
  );

  assert.deepEqual(messages.map(({ data }) => data), [
    [0x93, 60, 64],
    [0x83, 60, 0],
  ]);
  assert.ok(messages[0].timestamp >= before + 195);
  assert.equal(messages[1].timestamp - messages[0].timestamp, 250);
});

test("MIDI engine clears scheduled messages and silences every channel", () => {
  const messages = [];
  let cleared = false;
  const midi = new MidiEngine();
  midi.output = {
    clear() {
      cleared = true;
    },
    send(data) {
      messages.push(data);
    },
  };

  midi.stopAll();

  assert.equal(cleared, true);
  assert.equal(messages.length, 32);
  assert.deepEqual(messages[0], [0xb0, 123, 0]);
  assert.deepEqual(messages.at(-1), [0xbf, 120, 0]);
});
