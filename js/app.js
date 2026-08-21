import { ATTRACTOR_SYSTEMS, ChaoticAttractor } from "./attractors.js";
import { ChaosAnalyzer } from "./chaos-analyzer.js";
import { EventGenerator } from "./event-generator.js";
import { MusicalMapper, NOTE_NAMES, SCALE_LABELS, SCALES } from "./musical-mapper.js";
import { Sequencer } from "./sequencer.js";
import { AudioEngine } from "./audio-engine.js";
import { MidiEngine } from "./midi-engine.js";
import { ChaosEngine } from "./engine.js";
import { Visualizer } from "./visualizer.js";
import { hashSeed } from "./rng.js";
import {
  applyPresetToDom,
  capturePreset,
  catalogUrl,
  deleteLocalPreset,
  fetchCatalogIndex,
  fetchCatalogPreset,
  listLocalPresets,
  normalizePreset,
  parseLocation,
  saveLocalPreset,
  shareUrl,
  writeShareHash,
} from "./presets.js";

const $ = (id) => document.getElementById(id);

if (["localhost", "127.0.0.1", "::1"].includes(window.location.hostname)) {
  $("buildStamp").textContent = "[local]";
}

function fillSelect(el, entries, selected) {
  el.innerHTML = "";
  for (const [value, label] of entries) {
    const opt = document.createElement("option");
    opt.value = value;
    opt.textContent = label;
    if (value === selected) opt.selected = true;
    el.appendChild(opt);
  }
}

function bindRange(id, digits = 2) {
  const input = $(id);
  const out = $(id + "Out");
  const paint = () => {
    if (!out) return;
    const n = Number(input.value);
    out.textContent = Number.isInteger(n) && input.step === "1" ? String(n) : n.toFixed(digits);
  };
  input.addEventListener("input", paint);
  paint();
  return input;
}

function degreeWeights(kind, scaleName) {
  const n = (SCALES[scaleName] ?? SCALES.minor).length;
  if (kind === "tonic") return Array.from({ length: n }, (_, i) => (i === 0 || i === Math.floor(n / 2) ? 3 : 1));
  if (kind === "color") return Array.from({ length: n }, (_, i) => (i === 0 ? 1 : 2));
  return Array.from({ length: n }, () => 1);
}

function num(id) {
  return Number($(id).value);
}

const ranges = [
  ["dt", 4],
  ["speed", 2],
  ["lobeAOctave", 0],
  ["lobeBOctave", 0],
  ["lobeAVel", 2],
  ["lobeBVel", 2],
  ["lobeADur", 2],
  ["lobeBDur", 2],
  ["lobeAPan", 2],
  ["lobeBPan", 2],
  ["lobeAFilter", 0],
  ["lobeBFilter", 0],
  ["bpm", 0],
  ["timingInfluence", 2],
  ["nth", 0],
  ["probability", 2],
  ["velocityThreshold", 1],
  ["customThreshold", 1],
  ["zThreshold", 1],
  ["attack", 3],
  ["decay", 2],
  ["sustain", 2],
  ["release", 2],
  ["cutoff", 0],
  ["resonance", 1],
  ["master", 2],
  ["modulateFilter", 2],
  ["modulatePan", 2],
  ["modulateFm", 2],
];

for (const [id, digits] of ranges) bindRange(id, digits);

fillSelect(
  $("root"),
  NOTE_NAMES.map((n) => [n, n]),
  "C",
);
fillSelect($("scale"), Object.entries(SCALE_LABELS), "pentatonic-minor");
fillSelect($("lobeAScale"), [["", "inherit"], ...Object.entries(SCALE_LABELS)], "");
fillSelect($("lobeBScale"), [["", "inherit"], ...Object.entries(SCALE_LABELS)], "");
fillSelect(
  $("systemId"),
  Object.values(ATTRACTOR_SYSTEMS).map(({ id, label }) => [id, label]),
  "lorenz",
);

const attractor = new ChaoticAttractor();
const analyzer = new ChaosAnalyzer();
const audio = new AudioEngine();
const midi = new MidiEngine({ onChange: refreshMidiOutputs });
const sequencer = new Sequencer();
const visualizer = new Visualizer({
  attractor: $("attractor"),
  timeline: $("timeline"),
});

const mappers = new Map([
  ["voice-1", new MusicalMapper({ octaveRange: [2, 4], durationRange: [0.18, 0.72] })],
  ["voice-2", new MusicalMapper({ octaveRange: [4, 6], durationRange: [0.06, 0.32] })],
  ["voice-3", new MusicalMapper({ octaveRange: [3, 5], durationRange: [0.04, 0.11] })],
]);

const generator = new EventGenerator([], 1);

function renderAttractorParameters(systemId, values = {}) {
  const definition = ATTRACTOR_SYSTEMS[systemId] ?? ATTRACTOR_SYSTEMS.lorenz;
  const container = $("attractorParams");
  container.innerHTML = "";
  for (const [key, spec] of Object.entries(definition.params)) {
    const field = document.createElement("div");
    field.className = "field";

    const label = document.createElement("label");
    label.className = "lbl";
    label.htmlFor = `systemParam-${key}`;
    label.textContent = spec.label;

    const input = document.createElement("input");
    input.type = "range";
    input.id = `systemParam-${key}`;
    input.dataset.attractorParam = key;
    input.min = String(spec.min);
    input.max = String(spec.max);
    input.step = String(spec.step);
    input.value = String(values[key] ?? spec.value);

    const output = document.createElement("output");
    output.id = `${input.id}Out`;

    field.append(label, input, output);
    container.appendChild(field);
    bindRange(input.id, spec.digits);
  }
}

function resetSystemControls(systemId) {
  const definition = ATTRACTOR_SYSTEMS[systemId] ?? ATTRACTOR_SYSTEMS.lorenz;
  renderAttractorParameters(definition.id);
  configureSystemRanges(definition);
  $("dt").value = String(definition.dt);
  $("x0").value = String(definition.initial.x);
  $("y0").value = String(definition.initial.y);
  $("z0").value = String(definition.initial.z);
  $("zThreshold").value = String(definition.zThreshold);
  refreshRangeOutputs();
}

function configureSystemRanges(definition) {
  const [zLo, zHi] = definition.viewBounds.z;
  const threshold = $("zThreshold");
  threshold.min = String(zLo);
  threshold.max = String(zHi);
  threshold.step = String(Math.max(0.01, (zHi - zLo) / 200));
}

function attractorParamsFromUI() {
  return Object.fromEntries(
    [...document.querySelectorAll("[data-attractor-param]")].map((input) => [
      input.dataset.attractorParam,
      Number(input.value),
    ]),
  );
}

renderAttractorParameters("lorenz");

const debugRows = [];
let noteCount = 0;
let playing = false;
let paused = false;
let idle = true;
let hydrating = false;
let urlSyncTimer = 0;
let catalog = [];

function voicesFromUI() {
  const density = {
    densityMode: $("densityMode").value,
    nth: num("nth"),
    probability: num("probability"),
    velocityThreshold: num("velocityThreshold"),
    customMetric: $("customMetric").value,
    customThreshold: num("customThreshold"),
  };
  return [
    {
      id: "voice-1",
      name: "Bass",
      enabled: $("voice1Enable").checked,
      eventTypes: ["x-crossing"],
      instrument: "bass",
      waveform: $("voice1Wave").value,
      ...density,
    },
    {
      id: "voice-2",
      name: "Lead",
      enabled: $("voice2Enable").checked,
      eventTypes: ["y-max", "y-min"],
      instrument: "lead",
      waveform: $("voice2Wave").value,
      ...density,
    },
    {
      id: "voice-3",
      name: "Perc",
      enabled: $("voice3Enable").checked,
      eventTypes: ["z-threshold"],
      instrument: "perc",
      waveform: $("voice3Wave").value,
      ...density,
    },
  ];
}

function applyAttractorFromUI() {
  const systemId = $("systemId").value;
  const config = {
    ...attractorParamsFromUI(),
    dt: num("dt"),
    x: num("x0"),
    y: num("y0"),
    z: num("z0"),
  };
  if (attractor.systemId !== systemId) attractor.setSystem(systemId, config);
  else attractor.setParams(config);
}

function applyMappingFromUI() {
  const scaleName = $("scale").value;
  const system = ATTRACTOR_SYSTEMS[$("systemId").value] ?? ATTRACTOR_SYSTEMS.lorenz;
  const shared = {
    rootName: $("root").value,
    scaleName,
    bounds: system.bounds,
    lobeA: {
      octaveOffset: num("lobeAOctave"),
      velocityScale: num("lobeAVel"),
      durationScale: num("lobeADur"),
      pan: num("lobeAPan"),
      filterCutoff: num("lobeAFilter"),
      scale: $("lobeAScale").value || null,
      degreeWeights: degreeWeights($("lobeAWeights").value, $("lobeAScale").value || scaleName),
    },
    lobeB: {
      octaveOffset: num("lobeBOctave"),
      velocityScale: num("lobeBVel"),
      durationScale: num("lobeBDur"),
      pan: num("lobeBPan"),
      filterCutoff: num("lobeBFilter"),
      scale: $("lobeBScale").value || null,
      degreeWeights: degreeWeights($("lobeBWeights").value, $("lobeBScale").value || scaleName),
    },
  };
  mappers.get("voice-1").setConfig({ ...shared, octaveRange: [2, 4], durationRange: [0.18, 0.72] });
  mappers.get("voice-2").setConfig({ ...shared, octaveRange: [4, 6], durationRange: [0.06, 0.32] });
  mappers.get("voice-3").setConfig({ ...shared, octaveRange: [3, 5], durationRange: [0.04, 0.11] });
}

function applyAudioFromUI() {
  const synth = {
    attack: num("attack"),
    decay: num("decay"),
    sustain: num("sustain"),
    release: num("release"),
    cutoff: num("cutoff"),
    resonance: num("resonance"),
    amplitude: 0.38,
    mono: true,
  };
  audio.configureVoice("voice-1", { ...synth, waveform: $("voice1Wave").value, mono: true });
  audio.configureVoice("voice-2", { ...synth, waveform: $("voice2Wave").value, amplitude: 0.22, mono: true });
  audio.configureVoice("voice-3", { ...synth, waveform: $("voice3Wave").value, amplitude: 0.28, mono: false, attack: 0.001, release: 0.08 });
  audio.setMasterGain(num("master"));
}

function applyMidiFromUI() {
  engine.internalAudioEnabled = $("internalAudio").checked;
  midi.setConfig({
    enabled: $("midiEnable").checked,
    channels: {
      "voice-1": num("midiChannel1"),
      "voice-2": num("midiChannel2"),
      "voice-3": num("midiChannel3"),
    },
  });
}

function applyAll() {
  if (hydrating) return;
  applyAttractorFromUI();
  applyMappingFromUI();
  analyzer.setZThreshold(num("zThreshold"));
  sequencer.setConfig({
    bpm: num("bpm"),
    grid: $("grid").value,
    quantize: $("quantize").checked,
    timingInfluence: num("timingInfluence"),
    speed: num("speed"),
  });
  const seed = hashSeed(num("x0"), num("y0"), num("z0"));
  generator.setVoices(voicesFromUI());
  generator.setSeed(seed);
  engine.modulateFilter = num("modulateFilter");
  engine.modulatePan = num("modulatePan");
  engine.modulateFm = num("modulateFm");
  engine.bounds = (ATTRACTOR_SYSTEMS[$("systemId").value] ?? ATTRACTOR_SYSTEMS.lorenz).bounds;
  visualizer.projection = $("projection").value;
  visualizer.setSystem(ATTRACTOR_SYSTEMS[$("systemId").value] ?? ATTRACTOR_SYSTEMS.lorenz);
  $("debugPanel").classList.toggle("hidden", !$("diagnostics").checked);
  applyAudioFromUI();
  applyMidiFromUI();
}

function pushDebug(note) {
  const c = note.chaos;
  debugRows.unshift({
    id: c.id,
    t: c.timestamp.toFixed(3),
    dir: c.direction ?? "—",
    x: c.x.toFixed(2),
    y: c.y.toFixed(2),
    z: c.z.toFixed(2),
    vel: c.velocity.toFixed(1),
    pitch: note.noteName,
    midi: note.midi,
    dur: note.duration.toFixed(3),
    voice: note.voiceName,
  });
  if (debugRows.length > 48) debugRows.pop();
  $("debugBody").innerHTML = debugRows
    .map(
      (r) =>
        `<tr><td>${r.id}</td><td>${r.t}</td><td>${r.dir}</td><td>${r.x}</td><td>${r.y}</td><td>${r.z}</td><td>${r.vel}</td><td>${r.pitch}</td><td>${r.midi}</td><td>${r.dur}</td><td>${r.voice}</td></tr>`,
    )
    .join("");
}

const engine = new ChaosEngine({
  attractor,
  analyzer,
  generator,
  mappers,
  sequencer,
  audio,
  midi,
  onPoint(state) {
    visualizer.addPoint(state);
  },
  onNote(note, when) {
    noteCount += 1;
    visualizer.addNote(note, when);
    visualizer.addEvent(note.chaos);
    $("noteReadout").textContent =
      `${note.noteName}  vel ${note.velocity.toFixed(2)}  ${Math.round(note.duration * 1000)}ms  lobe ${note.lobe}  ${note.direction ?? ""}  ${note.voiceName}`;
    $("hudNotes").textContent = String(noteCount);
    $("hudEvents").textContent = String(note.eventNumber);
    if ($("diagnostics").checked) pushDebug(note);
  },
});

function resetSim(clearLog = true) {
  applyAll();
  attractor.reset({ x: num("x0"), y: num("y0"), z: num("z0") });
  analyzer.reset();
  generator.reset();
  visualizer.reset();
  noteCount = 0;
  if (clearLog) {
    debugRows.length = 0;
    $("debugBody").innerHTML = "";
  }
  $("hudNotes").textContent = "0";
  $("hudEvents").textContent = "0";
  $("noteReadout").textContent = playing ? "performing…" : "waiting for play";
}

async function play() {
  applyAll();
  if (midi.enabled && !midi.access) await connectMidi();
  await audio.resume();
  applyAudioFromUI();
  if (paused && playing) {
    await audio.ctx.resume();
    paused = false;
    idle = false;
    engine.resume();
    return;
  }
  engine.stop();
  resetSim(true);
  idle = false;
  playing = true;
  paused = false;
  engine.start();
}

function pause() {
  if (!playing) return;
  paused = true;
  engine.pause();
  audio.ctx?.suspend();
}

function reset() {
  engine.stop();
  playing = false;
  paused = false;
  idle = true;
  resetSim(true);
}

function perturb() {
  const x = num("x0") + 1e-6;
  $("x0").value = String(x);
  reset();
}

function setPresetStatus(message) {
  $("presetStatus").textContent = message;
}

function setMidiStatus(message) {
  $("midiStatus").textContent = message;
}

function refreshMidiOutputs() {
  const select = $("midiOutput");
  const selected = midi.output?.id ?? select.value;
  const outputs = midi.outputs();
  select.innerHTML = "";

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = outputs.length ? "Choose a MIDI destination…" : "No MIDI outputs found";
  select.appendChild(placeholder);

  for (const output of outputs) {
    const option = document.createElement("option");
    option.value = output.id;
    const manufacturer = output.manufacturer ? ` — ${output.manufacturer}` : "";
    option.textContent = `${output.name}${manufacturer}`;
    select.appendChild(option);
  }

  select.disabled = !midi.access || outputs.length === 0;
  if (outputs.some((output) => output.id === selected)) {
    select.value = selected;
    midi.setOutput(selected);
  }
}

async function connectMidi() {
  setMidiStatus("Requesting MIDI access…");
  try {
    const outputs = await midi.connect();
    refreshMidiOutputs();
    if (!outputs.length) {
      setMidiStatus("MIDI access granted, but no outputs were found.");
      return;
    }
    if (!midi.output) {
      $("midiOutput").value = outputs[0].id;
      midi.setOutput(outputs[0].id);
    }
    setMidiStatus(`Connected to ${midi.output.name}.`);
  } catch (err) {
    setMidiStatus(err.message || "Could not access MIDI devices.");
  }
}

function refreshLocalSelect(selected = "") {
  const all = listLocalPresets();
  const names = Object.keys(all).sort((a, b) => a.localeCompare(b));
  const select = $("localSelect");
  select.innerHTML = "";
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = names.length ? "Choose a saved preset…" : "No local presets yet";
  select.appendChild(placeholder);
  for (const name of names) {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    if (name === selected) opt.selected = true;
    select.appendChild(opt);
  }
}

function refreshRangeOutputs() {
  for (const [id, digits] of ranges) {
    const input = $(id);
    const out = $(id + "Out");
    if (!input || !out) continue;
    const n = Number(input.value);
    out.textContent = Number.isInteger(n) && input.step === "1" ? String(n) : n.toFixed(+digits);
  }
}

function currentShareUrl() {
  return shareUrl(capturePreset($("presetName").value.trim()));
}

function scheduleUrlSync() {
  if (hydrating) return;
  clearTimeout(urlSyncTimer);
  urlSyncTimer = setTimeout(() => {
    writeShareHash(capturePreset($("presetName").value.trim()));
  }, 200);
}

async function copyShareLink() {
  const url = currentShareUrl();
  writeShareHash(capturePreset($("presetName").value.trim()));
  try {
    await navigator.clipboard.writeText(url);
    setPresetStatus("Share link copied. Anyone with it gets this exact setup.");
  } catch {
    window.prompt("Copy this share link:", url);
    setPresetStatus("Copy the link from the prompt.");
  }
}

function adoptPreset(preset, { writeUrl = true, status } = {}) {
  const normalized = normalizePreset(preset);
  hydrating = true;
  const systemId = normalized.params.systemId;
  normalized.params.systemId = ATTRACTOR_SYSTEMS[systemId] ? systemId : "lorenz";
  $("systemId").value = normalized.params.systemId;
  configureSystemRanges(ATTRACTOR_SYSTEMS[$("systemId").value]);
  renderAttractorParameters($("systemId").value, normalized.params.attractorParams);
  applyPresetToDom(normalized);
  refreshRangeOutputs();
  if (normalized.name) $("presetName").value = normalized.name;
  hydrating = false;
  if (writeUrl) writeShareHash(capturePreset(normalized.name || $("presetName").value.trim()));
  if (playing) {
    engine.stop();
    resetSim(true);
    playing = true;
    paused = false;
    idle = false;
    engine.start();
  } else {
    resetSim(true);
  }
  if (status) setPresetStatus(status);
}

async function loadFromLocation({ replaceNamedHash = true } = {}) {
  const parsed = parseLocation();
  if (parsed.type === "error") {
    setPresetStatus(parsed.error);
    return;
  }
  if (parsed.type === "inline") {
    adoptPreset(parsed.preset, {
      writeUrl: false,
      status: parsed.preset.name
        ? `Loaded “${parsed.preset.name}” from this link.`
        : "Loaded setup from this link.",
    });
    return;
  }
  if (parsed.type === "named") {
    try {
      const preset = await fetchCatalogPreset(parsed.name);
      adoptPreset(preset, {
        writeUrl: !replaceNamedHash,
        status: `Loaded library preset “${preset.name || parsed.name}”. Short link: #preset=${parsed.name}`,
      });
    } catch (err) {
      setPresetStatus(err.message || "Could not load that preset.");
    }
  }
}

$("playBtn").addEventListener("click", play);
$("pauseBtn").addEventListener("click", pause);
$("resetBtn").addEventListener("click", reset);
$("perturbBtn").addEventListener("click", perturb);
$("copyLinkBtn").addEventListener("click", copyShareLink);
$("midiConnectBtn").addEventListener("click", connectMidi);
$("midiOutput").addEventListener("change", () => {
  midi.setOutput($("midiOutput").value);
  setMidiStatus(midi.output ? `Connected to ${midi.output.name}.` : "Choose a MIDI destination.");
});
$("systemId").addEventListener("change", () => {
  resetSystemControls($("systemId").value);
  reset();
});

function handleControlChange(event) {
  const el = event.target;
  if (!el.matches("input, select") || el.closest("[data-preset-ui]")) return;
  applyAll();
  scheduleUrlSync();
}

document.addEventListener("input", handleControlChange);
document.addEventListener("change", handleControlChange);

$("savePresetBtn").addEventListener("click", () => {
  try {
    const name = saveLocalPreset($("presetName").value, capturePreset($("presetName").value.trim()));
    refreshLocalSelect(name);
    writeShareHash(capturePreset(name));
    setPresetStatus(`Saved “${name}” on this browser. Copy link to share it with someone else.`);
  } catch (err) {
    setPresetStatus(err.message);
  }
});

$("loadLocalBtn").addEventListener("click", () => {
  const name = $("localSelect").value;
  const all = listLocalPresets();
  if (!name || !all[name]) {
    setPresetStatus("Choose a locally saved preset first.");
    return;
  }
  adoptPreset(all[name], { status: `Loaded “${name}” from this browser.` });
});

$("localSelect").addEventListener("change", () => {
  const name = $("localSelect").value;
  if (name) $("presetName").value = name;
});

$("deletePresetBtn").addEventListener("click", () => {
  const name = $("localSelect").value || $("presetName").value.trim();
  if (!name) {
    setPresetStatus("Choose a local preset to delete.");
    return;
  }
  deleteLocalPreset(name);
  refreshLocalSelect();
  setPresetStatus(`Deleted “${name}” from this browser.`);
});

$("catalogSelect").addEventListener("change", async () => {
  const id = $("catalogSelect").value;
  if (!id) return;
  try {
    const preset = await fetchCatalogPreset(id);
    adoptPreset(preset, {
      writeUrl: false,
      status: `Loaded “${preset.name || id}”. Share: ${catalogUrl(id)}`,
    });
    history.replaceState(null, "", location.pathname + "#preset=" + encodeURIComponent(id));
  } catch (err) {
    setPresetStatus(err.message);
  }
});

$("exportPresetBtn").addEventListener("click", () => {
  const preset = capturePreset($("presetName").value.trim());
  const blob = new Blob([JSON.stringify(preset, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
    a.download = `${(preset.name || "chaos-preset").replace(/\s+/g, "-")}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  setPresetStatus("Downloaded JSON. You can also drop a file into the repo as presets/name.json for a short #preset=name link.");
});

$("importPresetBtn").addEventListener("click", () => $("importPresetFile").click());
$("importPresetFile").addEventListener("change", async () => {
  const file = $("importPresetFile").files[0];
  $("importPresetFile").value = "";
  if (!file) return;
  try {
    const preset = JSON.parse(await file.text());
    if (!preset || typeof preset !== "object" || !preset.params) {
      throw new Error("That file is not a chaos sequencer preset.");
    }
    adoptPreset(preset, { status: `Imported “${preset.name || file.name}”.` });
  } catch (err) {
    setPresetStatus(err.message || "Could not import that file.");
  }
});

window.addEventListener("hashchange", () => {
  loadFromLocation({ replaceNamedHash: true });
});

window.addEventListener("keydown", (e) => {
  if (e.target.matches("input, select, textarea")) return;
  if (e.code === "Space") {
    e.preventDefault();
    if (playing && !paused) pause();
    else play();
  }
});

function hudFrom(state) {
  if (!state) return;
  $("hudT").textContent = state.t.toFixed(3);
  $("hudX").textContent = state.x.toFixed(2);
  $("hudY").textContent = state.y.toFixed(2);
  $("hudZ").textContent = state.z.toFixed(2);
  $("hudLobe").textContent = state.x < 0 ? "A" : "B";
  $("hudLobe").parentElement.className = state.x < 0 ? "a" : "b";
}

function frame() {
  if (idle && !playing) {
    const previewSteps = Math.min(80, Math.ceil(0.04 / attractor.dt));
    for (let i = 0; i < previewSteps; i++) visualizer.addPoint(attractor.step());
    visualizer.setPlayback(attractor.t);
    visualizer.draw(0);
    hudFrom(attractor);
  } else if (playing && audio.ctx) {
    const elapsed = Math.max(0, audio.currentTime - sequencer.audioStart);
    const simulationNow = elapsed * sequencer.speed;
    visualizer.setPlayback(simulationNow);
    visualizer.draw(paused ? sequencer.audioStart + visualizer.playbackT / sequencer.speed : audio.currentTime);
    const pts = visualizer.points;
    let shown = pts[0];
    for (let i = pts.length - 1; i >= 0; i--) {
      if (pts[i].t <= simulationNow) {
        shown = pts[i];
        break;
      }
    }
    hudFrom(shown);
  } else {
    visualizer.draw(0);
  }
  requestAnimationFrame(frame);
}

applyAll();
resetSim(true);
refreshLocalSelect();
const catalogLoad = fetchCatalogIndex();
const locationLoad = loadFromLocation();
requestAnimationFrame(frame);

try {
  const items = await catalogLoad;
  catalog = items;
  const select = $("catalogSelect");
  for (const item of items) {
    const opt = document.createElement("option");
    opt.value = item.id;
    opt.textContent = item.name || item.id;
    select.appendChild(opt);
  }
  const parsed = parseLocation();
  if (parsed.type === "named") select.value = parsed.name;
} catch {
  // The app remains usable without the optional preset catalog.
}

await locationLoad;
