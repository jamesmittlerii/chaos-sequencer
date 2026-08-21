# Lorenz — chaotic sequencer

A real-time generative music system. A Lorenz attractor is integrated as a dynamical system, its trajectory is analyzed for geometric events, and those events are mapped onto notes, rhythm, and a simple synthesizer.

The attractor never writes the audio waveform. It only produces a stream of `(x, y, z)` states. Music is derived from features of that trajectory.

## Run

ES modules need a local server (opening `index.html` as a file will fail):

```bash
python3 -m http.server 8080
```

Then open [http://localhost:8080](http://localhost:8080). Click **Play**. Space also toggles play/pause.

Live site: [https://jamesmittlerii.github.io/chaos-sequencer/](https://jamesmittlerii.github.io/chaos-sequencer/)

**Walkthrough:** [TUTORIAL.md](TUTORIAL.md) — first listen, mapping, lobes, voices, quantization, presets, and how to read the diagnostic log.

```bash
npm test    # pipeline determinism / RK4 bounds / preset encoding
```

## Shareable presets

The address bar is the preset. **Copy link** puts a URL on the clipboard that recreates every control, including the Lorenz seed.

Examples:

- Full snapshot (portable between people): `https://jamesmittlerii.github.io/chaos-sequencer/#p=…`
- Named library preset from this repo: [https://jamesmittlerii.github.io/chaos-sequencer/#preset=trio](https://jamesmittlerii.github.io/chaos-sequencer/#preset=trio)

Library presets are JSON files in `presets/`. Add `presets/my-pad.json` and list it in `presets/index.json` to get a short `#preset=my-pad` link after you push.

**Save** stores a name in this browser only (`localStorage`). That does not travel with a link — copy the share URL (or export JSON) to send a setup to someone else.

## Pipeline

```text
Lorenz mathematics
    → trajectory (x, y, z, t)
    → event detection
    → musical mapping
    → event scheduling
    → synthesis
```

| Stage | Module | Responsibility |
|---|---|---|
| 1 | `js/lorenz.js` | RK4 integration of the Lorenz ODE. No musical knowledge. |
| 2 | `js/chaos-analyzer.js` | Zero crossings, extrema, distance, velocity, thresholds. |
| 3 | `js/event-generator.js` | Density, voice routing. Deterministic unless probability mode is on. |
| 4 | `js/musical-mapper.js` | Normalized features → scale degrees, velocity, duration, register. |
| 5 | `js/sequencer.js` | Lorenz time → audio clock; optional quantization blend. |
| 6 | `js/synth-voice.js` | Oscillator, ADSR, low-pass, pan. |
| 7 | `js/audio-engine.js` | AudioContext, master bus, voices. |

You can replace `LorenzAttractor` with another flow (Rössler, Chua, Duffing) as long as `step()` returns `{ x, y, z, t }`.

## Default mapping (voice 1)

- **X zero-crossings** fire notes (sign of the crossing is the event type / destination lobe)
- **Y** selects a degree inside the chosen scale (not a raw MIDI number)
- **Z** maps to velocity
- **Trajectory speed** maps to duration (faster → shorter)
- **Distance from origin** maps to octave
- Timing is the raw Lorenz event time (no grid) unless you raise **timing influence**

Standard chaotic parameters are the defaults: `σ = 10`, `ρ = 28`, `β = 8/3`. Initial condition `(0.1, 0, 0)` is the seed. The same seed always replays the same sequence. **Perturb seed** adds `1e-6` to `x₀` so you can hear sensitive dependence.

## Lobes

`x < 0` is state A (teal), `x > 0` is state B (ember). Each state has its own octave, velocity, duration, pan, filter, optional scale, and degree weighting. A lobe crossing is a musical transition, not just another random note.

## Voices

All voices share one attractor and remain deterministic with randomness off.

| Voice | Default source | Role |
|---|---|---|
| 1 | X zero-crossings | Bass / primary sequence |
| 2 | Y maxima and minima | Faster inner melody |
| 3 | Z threshold crossings | Percussive events |

## Rhythm

Leave quantization off to keep the irregular Lorenz timing. Enable it and raise **timing influence** from 0 (fully chaotic) toward 1 (fully on a 1/4, 1/8, 1/16, or triplet grid).

## Density

- every event
- every Nth event
- probability (optional, seeded)
- trajectory-velocity threshold
- custom metric threshold

Probability is off unless you choose that mode.
