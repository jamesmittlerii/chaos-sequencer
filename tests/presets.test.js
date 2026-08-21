import assert from "node:assert/strict";
import test from "node:test";
import defaultPreset from "../presets/default.json" with { type: "json" };
import trioPreset from "../presets/trio.json" with { type: "json" };
import {
  applyPresetToDom,
  capturePreset,
  catalogUrl,
  decodeState,
  deleteLocalPreset,
  encodeState,
  fetchCatalogIndex,
  fetchCatalogPreset,
  listLocalPresets,
  parseLocation,
  saveLocalPreset,
  shareUrl,
  writeShareHash,
} from "../js/presets.js";

async function withGlobals(overrides, run) {
  const originals = new Map();
  for (const [name, value] of Object.entries(overrides)) {
    originals.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
    Object.defineProperty(globalThis, name, {
      configurable: true,
      writable: true,
      value,
    });
  }
  try {
    return await run();
  } finally {
    for (const [name, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else delete globalThis[name];
    }
  }
}

function memoryStorage(initial = {}) {
  const data = { ...initial };
  return {
    getItem(key) {
      return Object.hasOwn(data, key) ? data[key] : null;
    },
    setItem(key, value) {
      data[key] = value;
    },
  };
}

const location = {
  href: "https://example.com/chaos/?old=1#old",
  hash: "#old",
  search: "?old=1",
  pathname: "/chaos/",
  origin: "https://example.com",
};

test("preset state round-trips booleans, zeros, and Unicode", () => {
  const preset = {
    ...trioPreset,
    name: "Rössler 🎵",
  };
  const roundTrip = decodeState(encodeState(preset));

  assert.deepEqual(roundTrip, preset);
  assert.equal(roundTrip.params.voice2Enable, true);
  assert.equal(roundTrip.params.timingInfluence, 0);
});

test("parseLocation reads inline presets from hashes and queries", () => {
  const payload = encodeState(defaultPreset);
  const fromHash = parseLocation({
    ...location,
    hash: `#p=${payload}`,
    search: "",
  });
  const fromQuery = parseLocation({
    ...location,
    hash: "",
    search: `?p=${payload}`,
  });

  assert.deepEqual(fromHash, { type: "inline", preset: defaultPreset });
  assert.deepEqual(fromQuery, fromHash);
});

test("parseLocation handles named, missing, and invalid presets", () => {
  assert.deepEqual(
    parseLocation({ ...location, hash: "#preset=trio", search: "" }),
    { type: "named", name: "trio" },
  );
  assert.deepEqual(
    parseLocation({ ...location, hash: "", search: "?preset=default" }),
    { type: "named", name: "default" },
  );
  assert.deepEqual(parseLocation({ ...location, hash: "", search: "" }), {
    type: "none",
  });
  assert.deepEqual(
    parseLocation({ ...location, hash: "#p=not-valid-json", search: "" }),
    { type: "error", error: "Could not read the preset in this link." },
  );
});

test("share and catalog URLs discard queries and encode their payloads", () => {
  const shared = new URL(shareUrl(trioPreset, location));
  const catalog = new URL(catalogUrl("space trio/β", location));

  assert.equal(shared.origin + shared.pathname, "https://example.com/chaos/");
  assert.equal(shared.search, "");
  assert.deepEqual(decodeState(shared.hash.slice(3)), trioPreset);
  assert.equal(catalog.search, "");
  assert.equal(catalog.hash, "#preset=space%20trio%2F%CE%B2");
});

test("capturePreset reads supported DOM control values", async () => {
  const controls = {
    sigma: { type: "number", value: "10.5" },
    rho: { type: "range", value: "not-a-number" },
    voice1Enable: { type: "checkbox", checked: true },
    root: { type: "select-one", value: "D" },
  };
  await withGlobals(
    {
      document: {
        getElementById(id) {
          return controls[id] ?? null;
        },
      },
    },
    () => {
      assert.deepEqual(capturePreset("Example"), {
        v: 1,
        name: "Example",
        params: {
          sigma: 10.5,
          rho: "not-a-number",
          root: "D",
          voice1Enable: true,
        },
      });
      assert.equal(capturePreset().name, undefined);
    },
  );
});

test("applyPresetToDom updates checkboxes and values", async () => {
  const controls = {
    voice1Enable: { type: "checkbox", checked: false },
    root: { type: "text", value: "" },
    scale: { type: "text", value: "major" },
  };
  await withGlobals(
    {
      document: {
        getElementById(id) {
          return controls[id] ?? null;
        },
      },
    },
    () => {
      applyPresetToDom({
        params: {
          voice1Enable: 1,
          root: "F#",
          scale: null,
          missing: "ignored",
        },
      });
      assert.equal(controls.voice1Enable.checked, true);
      assert.equal(controls.root.value, "F#");
      assert.equal(controls.scale.value, "");
      assert.doesNotThrow(() => applyPresetToDom(null));
    },
  );
});

test("writeShareHash only replaces a changed location", async () => {
  const calls = [];
  const preset = { v: 1, params: { root: "C" } };
  const nextHash = `#p=${encodeState(preset)}`;

  await withGlobals(
    {
      history: {
        replaceState(...args) {
          calls.push(args);
        },
      },
    },
    () => {
      writeShareHash(preset, {
        ...location,
        hash: nextHash,
        search: "",
      });
      assert.equal(calls.length, 0);

      writeShareHash(preset, location);
      assert.deepEqual(calls, [[null, "", `/chaos/${nextHash}`]]);
    },
  );
});

test("local presets can be listed, saved, and deleted", async () => {
  const storage = memoryStorage();
  await withGlobals({ localStorage: storage }, () => {
    assert.deepEqual(listLocalPresets(), {});
    assert.equal(
      saveLocalPreset("  My preset  ", { v: 1, params: { root: "A" } }),
      "My preset",
    );

    const saved = listLocalPresets()["My preset"];
    assert.equal(saved.name, "My preset");
    assert.equal(saved.params.root, "A");
    assert.ok(Number.isFinite(saved.savedAt));

    deleteLocalPreset("My preset");
    assert.deepEqual(listLocalPresets(), {});
    assert.throws(() => saveLocalPreset("  ", {}), /Name the preset/);
  });
});

test("listLocalPresets tolerates invalid or inaccessible storage", async () => {
  await withGlobals(
    { localStorage: memoryStorage({ "lorenz.presets.v1": "{broken" }) },
    () => assert.deepEqual(listLocalPresets(), {}),
  );
  await withGlobals(
    {
      localStorage: {
        getItem() {
          throw new Error("blocked");
        },
      },
    },
    () => assert.deepEqual(listLocalPresets(), {}),
  );
});

test("fetchCatalogIndex returns catalog arrays and handles bad responses", async () => {
  const responses = [
    { ok: false },
    { ok: true, json: async () => ({ invalid: true }) },
    { ok: true, json: async () => ["default", "trio"] },
  ];
  const urls = [];
  await withGlobals(
    {
      window: { location: { href: "https://example.com/chaos/" } },
      fetch: async (url) => {
        urls.push(url.toString());
        return responses.shift();
      },
    },
    async () => {
      assert.deepEqual(await fetchCatalogIndex(), []);
      assert.deepEqual(await fetchCatalogIndex(), []);
      assert.deepEqual(await fetchCatalogIndex(), ["default", "trio"]);
      assert.ok(
        urls.every((url) => url === "https://example.com/chaos/presets/index.json"),
      );
    },
  );
});

test("fetchCatalogPreset sanitizes names and reports failures", async () => {
  const urls = [];
  const responses = [
    { ok: false },
    { ok: true, json: async () => trioPreset },
  ];
  await withGlobals(
    {
      window: { location: { href: "https://example.com/chaos/" } },
      fetch: async (url) => {
        urls.push(url.toString());
        return responses.shift();
      },
    },
    async () => {
      await assert.rejects(fetchCatalogPreset("***"), /Unknown preset/);
      await assert.rejects(fetchCatalogPreset("missing!"), /was not found/);
      assert.deepEqual(await fetchCatalogPreset("../trio"), trioPreset);
      assert.deepEqual(urls, [
        "https://example.com/chaos/presets/missing.json",
        "https://example.com/chaos/presets/trio.json",
      ]);
    },
  );
});
