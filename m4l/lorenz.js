/**
 * Max for Live host for the Lorenz chaotic sequencer.
 *
 * Load with: [js lorenz.js]
 * Requires chaos-pipeline.js (bundled IIFE) beside this file.
 *
 * Messages (inlet 0):
 *   playing <0|1>     — Live transport
 *   tempo <bpm>       — Live tempo (quantization)
 *   beats <beats>     — Live current_song_time
 *   bang              — metro lookahead tick (optional offline mode)
 *   reset / perturb / restart
 *   preset <json>     — apply a v:2 preset snapshot
 *   set <key> <value> — set one param (speed, root, voice1Enable, …)
 *   getpreset         — dump JSON preset to outlet 1
 *
 * Outlets:
 *   0 — MIDI for [midiformat] / [midiout]: "note" pitch velocity, plus "channel"
 *   1 — status / preset JSON strings
 */

autowatch = 1;
inlets = 1;
outlets = 2;

include("chaos-pipeline.js");

var device = null;
var playing = false;
var tempo = 120;
var originBeats = 0;
var lastBeats = 0;
var held = {};

function ensureDevice() {
  if (device) return device;
  if (typeof Lorenz === "undefined" || !Lorenz.createLorenzDevice) {
    post("lorenz: chaos-pipeline.js missing — run npm run build:m4l\n");
    return null;
  }
  device = Lorenz.createLorenzDevice({
    onMidi: dispatchMidi,
  });
  return device;
}

function keyFor(channel, midi) {
  return channel + ":" + midi;
}

function dispatchMidi(event) {
  var ch = Math.max(1, Math.min(16, event.channel | 0));
  outlet(0, "channel", ch);
  if (event.kind === "noteOn") {
    var vel = Math.max(1, Math.min(127, event.velocity | 0));
    held[keyFor(ch, event.midi)] = true;
    outlet(0, "note", event.midi | 0, vel);
  } else if (event.kind === "noteOff") {
    delete held[keyFor(ch, event.midi)];
    outlet(0, "note", event.midi | 0, 0);
  }
}

function allNotesOff() {
  var keys = [];
  for (var k in held) {
    if (Object.prototype.hasOwnProperty.call(held, k)) keys.push(k);
  }
  for (var i = 0; i < keys.length; i++) {
    var parts = keys[i].split(":");
    outlet(0, "channel", parseInt(parts[0], 10));
    outlet(0, "note", parseInt(parts[1], 10), 0);
  }
  held = {};
}

function secondsFromBeats(beats) {
  return ((beats - originBeats) * 60) / Math.max(20, tempo);
}

function loadbang() {
  ensureDevice();
  outlet(1, "ready");
}

function playing() {
  var v = arguments.length ? arguments[0] : 0;
  var next = v ? true : false;
  if (next && !playing) {
    originBeats = lastBeats;
    var d = ensureDevice();
    if (d) {
      d.setBpm(tempo);
      d.beginAt(0);
    }
    outlet(1, "playing", 1);
  } else if (!next && playing) {
    allNotesOff();
    outlet(1, "playing", 0);
  }
  playing = next;
}

function tempo(v) {
  tempo = Math.max(20, Number(v) || 120);
  var d = ensureDevice();
  if (d) d.setBpm(tempo);
}

function beats(v) {
  lastBeats = Number(v) || 0;
  if (!playing) return;
  var d = ensureDevice();
  if (!d) return;
  // Live loop / scrub: large backward jump restarts the phrase at the new position.
  if (lastBeats + 1e-6 < originBeats) {
    originBeats = lastBeats;
    d.beginAt(0);
    allNotesOff();
  }
  var events = d.render(secondsFromBeats(lastBeats));
  if (events.length) outlet(1, "notes", events.length);
}

function bang() {
  if (!playing) return;
  var d = ensureDevice();
  if (!d) return;
  d.renderLookahead(0.1);
}

function reset() {
  allNotesOff();
  var d = ensureDevice();
  if (!d) return;
  originBeats = lastBeats;
  d.beginAt(0);
  outlet(1, "reset");
}

function restart() {
  allNotesOff();
  var d = ensureDevice();
  if (!d) return;
  d.restartHere();
  outlet(1, "restart");
}

function perturb() {
  allNotesOff();
  var d = ensureDevice();
  if (!d) return;
  d.perturb();
  outlet(1, "perturb");
}

function preset(json) {
  var d = ensureDevice();
  if (!d) return;
  try {
    var data = typeof json === "string" ? JSON.parse(json) : json;
    d.loadPreset(data, { reset: true });
    originBeats = lastBeats;
    allNotesOff();
    outlet(1, "preset", d.capturePreset().name || "ok");
  } catch (err) {
    outlet(1, "error", String(err));
  }
}

function getpreset() {
  var d = ensureDevice();
  if (!d) return;
  outlet(1, "presetjson", JSON.stringify(d.capturePreset()));
}

function set(key, value) {
  var d = ensureDevice();
  if (!d || key == null) return;
  var parsed = value;
  if (typeof value === "string") {
    if (value === "true") parsed = true;
    else if (value === "false") parsed = false;
    else if (value !== "" && !isNaN(Number(value))) parsed = Number(value);
  }
  d.set(String(key), parsed);
  outlet(1, "set", String(key), parsed);
}

function anything() {
  var a = arrayfromargs(messagename, arguments);
  if (!a.length) return;
  var cmd = String(a[0]);
  if (cmd === "set" && a.length >= 3) {
    set(a[1], a[2]);
    return;
  }
  if (cmd === "preset" && a.length >= 2) {
    preset(a.slice(1).join(" "));
    return;
  }
}

function notifydeleted() {
  allNotesOff();
  device = null;
}
