/**
 * Preset capture / share links.
 *
 * Shareable URLs encode the full control snapshot in the hash:
 *   https://jamesmittlerii.github.io/chaos-sequencer/#p=<payload>
 *
 * Named catalog presets live in /presets and load as:
 *   .../chaos-sequencer/#preset=trio
 *
 * Browser-local names are stored in localStorage and are not shareable.
 */

export const CONTROL_IDS = [
  "sigma",
  "rho",
  "beta",
  "dt",
  "speed",
  "projection",
  "x0",
  "y0",
  "z0",
  "root",
  "scale",
  "lobeAOctave",
  "lobeBOctave",
  "lobeAVel",
  "lobeBVel",
  "lobeADur",
  "lobeBDur",
  "lobeAPan",
  "lobeBPan",
  "lobeAFilter",
  "lobeBFilter",
  "lobeAScale",
  "lobeBScale",
  "lobeAWeights",
  "lobeBWeights",
  "quantize",
  "grid",
  "bpm",
  "timingInfluence",
  "densityMode",
  "nth",
  "probability",
  "velocityThreshold",
  "customMetric",
  "customThreshold",
  "zThreshold",
  "voice1Enable",
  "voice1Wave",
  "voice2Enable",
  "voice2Wave",
  "voice3Enable",
  "voice3Wave",
  "attack",
  "decay",
  "sustain",
  "release",
  "cutoff",
  "resonance",
  "master",
  "modulateFilter",
  "modulatePan",
  "modulateFm",
  "diagnostics",
];

const STORE_KEY = "lorenz.presets.v1";

export function capturePreset(name = "") {
  const params = {};
  for (const id of CONTROL_IDS) {
    const el = document.getElementById(id);
    if (!el) continue;
    if (el.type === "checkbox") params[id] = el.checked;
    else if (el.type === "number" || el.type === "range") {
      const n = Number(el.value);
      params[id] = Number.isFinite(n) ? n : el.value;
    } else params[id] = el.value;
  }
  return { v: 1, name: name || undefined, params };
}

export function applyPresetToDom(preset) {
  const params = preset?.params ?? {};
  for (const [id, value] of Object.entries(params)) {
    const el = document.getElementById(id);
    if (!el) continue;
    if (el.type === "checkbox") el.checked = Boolean(value);
    else el.value = value == null ? "" : String(value);
  }
}

export function encodeState(preset) {
  const json = JSON.stringify(preset);
  const bytes = new TextEncoder().encode(json);
  let bin = "";
  for (const b of bytes) bin += String.fromCodePoint(b);
  return btoa(bin).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

export function decodeState(payload) {
  const pad = payload.length % 4 === 0 ? "" : "=".repeat(4 - (payload.length % 4));
  const b64 = payload.replaceAll("-", "+").replaceAll("_", "/") + pad;
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.codePointAt(i);
  return JSON.parse(new TextDecoder().decode(bytes));
}

export function parseLocation(loc = window.location) {
  const hash = loc.hash.startsWith("#") ? loc.hash.slice(1) : loc.hash;
  const query = loc.search.startsWith("?") ? loc.search.slice(1) : loc.search;
  const fromHash = new URLSearchParams(hash);
  const fromQuery = new URLSearchParams(query);
  const p = fromHash.get("p") || fromQuery.get("p");
  const preset = fromHash.get("preset") || fromQuery.get("preset");
  if (p) {
    try {
      return { type: "inline", preset: decodeState(p) };
    } catch {
      return { type: "error", error: "Could not read the preset in this link." };
    }
  }
  if (preset) return { type: "named", name: preset };
  return { type: "none" };
}

export function shareUrl(preset, loc = window.location) {
  const url = new URL(loc.href);
  url.search = "";
  url.hash = "p=" + encodeState(preset);
  return url.toString();
}

export function catalogUrl(name, loc = window.location) {
  const url = new URL(loc.href);
  url.search = "";
  url.hash = "preset=" + encodeURIComponent(name);
  return url.toString();
}

export function writeShareHash(preset, loc = window.location) {
  const next = "#p=" + encodeState(preset);
  if (loc.hash === next && loc.search === "") return;
  history.replaceState(null, "", loc.pathname + next);
}

export function listLocalPresets() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    const data = raw ? JSON.parse(raw) : {};
    return data && typeof data === "object" ? data : {};
  } catch {
    return {};
  }
}

export function saveLocalPreset(name, preset) {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Name the preset before saving.");
  const all = listLocalPresets();
  all[trimmed] = { ...preset, name: trimmed, savedAt: Date.now() };
  localStorage.setItem(STORE_KEY, JSON.stringify(all));
  return trimmed;
}

export function deleteLocalPreset(name) {
  const all = listLocalPresets();
  delete all[name];
  localStorage.setItem(STORE_KEY, JSON.stringify(all));
}

export async function fetchCatalogIndex() {
  const url = new URL("presets/index.json", window.location.href);
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function fetchCatalogPreset(name) {
  const safe = name.replace(/[^a-z0-9_-]/gi, "");
  if (!safe) throw new Error("Unknown preset.");
  const url = new URL(`presets/${safe}.json`, window.location.href);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Preset “${name}” was not found.`);
  return res.json();
}
