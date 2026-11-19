# Lorenz — Max for Live

MIDI Effect that runs the same chaotic sequencer pipeline as the website (`js/`), driven by Live’s transport. Notes go out as MIDI — put an instrument after this device.

## Contents

| File | Role |
|---|---|
| `Lorenz.maxpat` | Device patch (open in Max, then save as a Max MIDI Effect) |
| `lorenz.js` | Max `[js]` host — transport, MIDI, param messages |
| `pipeline.js` | Source factory wrapping shared `js/` modules |
| `chaos-pipeline.js` | Bundled IIFE (`Lorenz` global) loaded by `lorenz.js` |

`.amxd` binaries are not checked in (Max creates them). Freeze / save from Max after opening the patcher.

## Install in Ableton Live

1. Install [Max](https://cycling74.com) (same major version Live expects for Max for Live).
2. From the repo root: `npm install && npm run build:m4l`
3. Open `m4l/Lorenz.maxpat` in Max.
4. **File → Save As… → Max MIDI Effect** into a User Library MIDI Effects folder, e.g.  
   `~/Music/Ableton/User Library/Presets/MIDI Effects/Max MIDI Effect/Lorenz.amxd`
5. In Live, drag **Lorenz** onto a MIDI track **before** an instrument.
6. Press play — the device follows Live’s transport and tempo.

Keep `lorenz.js` and `chaos-pipeline.js` beside the saved device (or freeze the device in Max so dependencies are embedded).

## Controls

Presentation UI (what Live shows):

- **Voices 1–3** — bass (X crossings), lead (Y extrema), perc (Z threshold)
- **System / Root / Scale** — attractor and harmony
- **Speed / Quantize / Timing** — simulation rate and grid blend
- **Reset / Perturb** — restart phrase at the playhead; perturb nudges `x₀` by `1e-6`

Full website presets (`presets/*.json`, `#p=` links) can be applied from Max:

```text
preset {"v":2,"name":"Default","params":{...}}
```

Send that message to the `[js lorenz.js]` object (outlet status prints on `print lorenz`).

## Development

```bash
npm run build:m4l   # refresh chaos-pipeline.js from js/
npm test            # includes tests/m4l.test.js
```

After changing `js/` pipeline modules or `m4l/pipeline.js`, rebuild the bundle before reloading the device in Max (`autowatch` reloads `lorenz.js`; re-`include` may need a device reopen).

### Message reference (`[js lorenz.js]`)

| Message | Meaning |
|---|---|
| `playing 0/1` | Transport |
| `tempo <bpm>` | Host tempo |
| `beats <n>` | `current_song_time` (beats) |
| `reset` / `perturb` / `restart` | Phrase control |
| `set <key> <value>` | Any preset param (`speed`, `systemId`, …) |
| `preset <json>` | Load a `v:2` snapshot |
| `getpreset` | Dump JSON to outlet 1 |

Outlet 0 feeds `[midiformat] → [midiout]` (`channel`, `note pitch velocity`).

## License

Same as the website sources in this folder’s dependency chain (MIT). The separate JUCE plugin under `plugin/` remains AGPL.
