# Lorenz chaotic sequencer — walkthrough

This is a hands-on guide to [the live sequencer](https://jamesmittlerii.github.io/chaos-sequencer/). You do not need to install anything. Use headphones or decent speakers; the default bass voice is easy to miss on tiny laptop speakers.

The system is **not random**. A Lorenz attractor is a deterministic chaotic flow. The same seed and parameters always produce the same sequence. What you hear is a musical reading of that trajectory: lobe switches become notes, height becomes pitch, energy becomes loudness and length.

```text
Lorenz equations  →  (x, y, z) stream  →  detected events
                                         →  scale / velocity / duration
                                         →  scheduled notes
                                         →  synth
```

The attractor never writes the audio waveform. If the music sounds unstructured, the mapping is too loose or too many voices are on at once — not because the math is rolling dice.

---

## 1. First listen (five minutes)

1. Open [https://jamesmittlerii.github.io/chaos-sequencer/](https://jamesmittlerii.github.io/chaos-sequencer/).
2. Leave every control at its default.
3. Click **Play** (or press **Space**). Browsers require a click before audio starts.
4. Watch the left panel while you listen.

You should hear a **sparse bass line**. Notes are not on a 4/4 grid. Gaps of a second or more are normal. Each note is a trip across `x = 0`: the particle leaving one wing of the butterfly for the other.

What to look at:

| Display | Meaning |
|---|---|
| Teal trail | Lobe A (`x < 0`) |
| Ember trail | Lobe B (`x > 0`) |
| White rings on the trail | Detected events (voice 1: X zero-crossings) |
| Bright dot | Current position |
| Timeline under the attractor | Pitch over the last few seconds of audio |
| Gold readout | Last note name, velocity, duration, lobe, voice |

Let it run for 20–30 seconds before touching anything. The attractor often **lingers on one wing**, then switches. That sojourn-then-leap is the rhythm.

**Pause** freezes audio and the clock. **Reset** returns to the seed `(x₀, y₀, z₀)` and clears the trail. Space toggles play/pause unless you are typing in a field.

---

## 2. See the butterfly

The plot is a 2D projection of a 3D trajectory.

- **X / Y** is the default. The vertical divider is `x = 0`, the lobe boundary.
- **X / Z (butterfly)** is the classic Lorenz picture: two wings stacked in `z`.

Switch the projection while it is playing. The music does not change; only the drawing does. If you lose the shape, you are looking at the transient from the origin — wait a couple of seconds, or hit **Reset** then **Play**.

The HUD line is the live state: time `t`, coordinates `x y z`, current lobe, event count, note count.

---

## 3. Why a note happens

Voice 1 (on by default) fires only when **X crosses zero**.

- Crossing **up** (negative → positive) enters lobe B.
- Crossing **down** (positive → negative) enters lobe A.

That crossing is interpolated, so the event sits on `x = 0` rather than on the sample after the sign change.

The other coordinates at that instant become musical parameters:

| Lorenz feature | Musical result |
|---|---|
| Sign of the X crossing / destination lobe | State A vs B (octave, pan, filter, optional scale) |
| **Y** | Degree **inside the chosen scale** (not a raw MIDI number) |
| **Z** | Velocity (how hard the note hits) |
| Trajectory speed | Duration (faster motion → shorter notes) |
| Distance from the origin | Register / octave |

This is why two crossings in a row can sound related: they are nearby points on a smooth flow, quantized onto a scale. It is also why the line is not a conventional melody. Pitch follows `y` of the crossing, not a composed contour.

Open **Diagnostics** if it is not already checked. The table at the bottom is the same pipeline in numbers:

`#`, `t`, `dir`, `x`, `y`, `z`, `vel`, `pitch`, `midi`, `dur`, `voice`

If a note surprises you, find it in the log and read `y` and `dir`. You are looking at the cause, not a random draw.

---

## 4. Harmony without leaving the attractor

Under **Harmony**:

- **Root** is the tonic (default `C`).
- **Scale** is the set of allowed degrees: chromatic, major, minor, pentatonic major, pentatonic minor, whole tone.

Default is **C pentatonic minor**. That is a small palette, which is why the bass line feels coherent even though timing is irregular.

Try this, one change at a time, then **Reset** and **Play** so you hear the sequence from the seed:

1. Keep pentatonic minor, change root to **A**. Same contour, different key.
2. Switch scale to **chromatic**. More pitch chatter; the attractor has not changed, only the grid it is snapped to.
3. Switch to **whole tone**. Even steps, a more “suspended” color.

Y is normalized against typical Lorenz bounds roughly `[-27, 27]`, then used as an index into the scale (with optional degree weights). Extreme `y` values clamp rather than wrapping into nonsense MIDI notes.

---

## 5. The two lobes as two musical states

The Lorenz attractor has two wings. This sequencer treats them as **state A** and **state B**.

Defaults already contrast them:

| | Lobe A (`x < 0`, teal) | Lobe B (`x > 0`, ember) |
|---|---|---|
| Octave offset | 0 | +1 |
| Velocity | slightly quieter | slightly louder |
| Duration | longer | shorter |
| Pan | left | right |
| Filter | darker | brighter |
| Degree weights | tonic-heavy | even |

A lobe switch is supposed to feel like a **modulation of the same material**, not a new random patch.

Useful experiments:

- Set **B octave** to `0` so both wings share register. The pan/filter contrast remains; pitch range collapses.
- Give A **pentatonic minor** and B **pentatonic major** (scale overrides). Crossing `x = 0` then changes mode.
- Set A weights to **tonic-heavy** and B to **color tones**. A sits on the home notes; B wanders.

Scale override **inherit** means “use the global Harmony scale.”

---

## 6. Tempo is not BPM (until you ask for it)

**Simulation speed** is how fast Lorenz time is played against the audio clock. Higher speed → more notes per second, same sequence compressed.

The attractor’s own clock is still irregular. Voice 1 average rate at default speed is on the order of one lobe-switch per second, with long hangs and sudden bursts.

To pull that toward a metronome:

1. Check **quantize**.
2. Pick a **grid**: 1/4, 1/8, 1/16, or triplets (eighth-note triplets: three per beat).
3. Raise **timing influence** from `0` toward `1`.
4. Set **BPM** to the grid you want.

`timing influence = 0` is pure Lorenz time. `1` snaps onsets to the grid. Values in between lerp each event from chaotic time toward the nearest grid slot.

A good first blend is influence around **0.6–0.75** at 1/8 and ~96 BPM. That is the bundled **Quantized grid** library preset.

Quantize does not change *which* notes occur, only *when* they are scheduled. Two events that land on the same slot for one voice are collapsed so the mono synth does not stack.

---

## 7. Density: fewer notes, not different math

If the line is busy, do not add randomness first. Thin the events.

| Mode | Behavior |
|---|---|
| Every event | Default. Each matching detector hit becomes a note. |
| Every Nth | Keep 1 of N (deterministic). |
| Probability | Optional. Uses a **seeded** PRNG, so the same seed still repeats. |
| Velocity threshold | Keep only fast trajectory hits. |
| Custom threshold | Keep only if distance, velocity, `z`, or `|y|` is above the floor. |

Probability is off unless you choose that mode. The default path has no dice.

**N = 2** on voice 1 is a simple way to hear the same crossings half as often, still locked to the attractor.

---

## 8. Three voices, one attractor

All voices read the **same** Lorenz integration. They differ in *which geometric events* they notice.

| Voice | Detector | Default role | Default on? |
|---|---|---|---|
| 1 | X zero-crossings | Bass, lobe switches | Yes |
| 2 | Y maxima and minima | Faster inner melody | No |
| 3 | Z threshold crossings | Percussive hits | No |

Turn on **Voice 2** while voice 1 is playing. Y extrema happen twice per orbit around a wing, so this line is denser. It is the motion *inside* a lobe, not the jump *between* lobes.

Turn on **Voice 3**. It fires when `z` crosses the **Z threshold** (default 25). Those events sit higher on the butterfly and work well as short noise or square ticks.

Load the library preset **Three voices** if you want this mix already balanced: [trio](https://jamesmittlerii.github.io/chaos-sequencer/#preset=trio).

Each voice has its own waveform. Voice 1 and 2 are monophonic (a new note ducks the previous). Voice 3 is allowed to overlap, which suits percussion.

If the mix clips, lower **master** in Synth, or disable a voice, before you blame the mapping.

---

## 9. Synth and modulation (keep this secondary)

The synth is a simple subtractive voice: oscillator → low-pass → ADSR → pan.

- Waveforms: sine, triangle, sawtooth, square, noise.
- **Cutoff** / **resonance** are the shared filter baseline; lobe filter offsets still apply per note.
- ADSR shapes the amplitude envelope. Short attack and a little release keep chaotic timing articulate.

**Modulation** (amounts default to 0):

| Control | Source | Effect |
|---|---|---|
| Filter from Z | height of the event | Brighter when `z` is high |
| Pan from X | horizontal position | Extra stereo beyond lobe pan |
| FM from velocity | trajectory speed | Pitch shimmer on fast hits |

Raise these after the sequence makes sense. They color the same notes; they do not choose them.

---

## 10. Seeds, reset, and sensitive dependence

The performance seed is the initial condition `(x₀, y₀, z₀)`, default `(0.1, 0, 0)`. Do not start at `(0, 0, 0)`: the origin is an equilibrium and the trajectory will not move.

- Same seed + same parameters → same music. Always.
- **Reset** rewinds to that seed.
- **Perturb seed** adds `1e-6` to `x₀`. Play both versions from the start. They track for a while, then diverge. That is chaos, not a bug.

`σ = 10`, `ρ = 28`, `β = 8/3` are the classic chaotic Lorenz parameters. Dropping `ρ` well below ~24 leaves the chaotic attractor; the “sequence” will change character or collapse. Treat `σ ρ β` as the *world* the music lives in, and the seed as *where you enter*.

**dt** is integration step size (RK4). Smaller is more accurate and more CPU. Leave it near `0.01` unless you know you need otherwise.

---

## 11. Guided recipes

Each recipe assumes you start from **Reset** (or a fresh page load), then **Play**.

### A. Hear the lobes

1. Default everything.
2. Play 30 seconds with **X / Z** projection.
3. Notice teal vs ember matching left/right pan and dark/bright filter.
4. Set both octave offsets to `0`. The register contrast vanishes; the spatial/filter contrast remains.

### B. Make it denser without randomness

1. Enable **Voice 2**.
2. Raise **simulation speed** to ~3.2.
3. If it is still sparse, enable **Voice 3** and set Z threshold around 27.

### C. Make it a pulse

1. Enable quantize, grid **1/8**, BPM **96**.
2. Timing influence **0.7**.
3. Keep only voice 1 at first, then add voice 2.

Or open [Quantized grid](https://jamesmittlerii.github.io/chaos-sequencer/#preset=quantized).

### D. Prove determinism

1. Play 15 seconds. Note the first few pitches in the diagnostic table.
2. Reset, Play again. The table should repeat.
3. Perturb seed, Reset, Play. Early notes may match; later ones will not.

### E. Share a pad

1. Choose root **D**, scale **minor**, enable all three voices.
2. Name it `night pad`, click **Save** (this browser only).
3. Click **Copy link** and send that URL. The other person does not need your local save.

---

## 12. Presets and links

There are three layers. Only the URL is guaranteed to work for someone else.

### Copy link / address bar (`#p=…`)

The hash holds a compressed snapshot of **every** control, including the seed. Changing sliders rewrites the hash after a short debounce. **Copy link** puts the current snapshot on the clipboard.

Example shape:

`https://jamesmittlerii.github.io/chaos-sequencer/#p=…`

Anyone with that link gets the same setup. GitHub Pages never sees the hash (it stays in the browser), so the payload can be long.

### Library presets (`#preset=name`)

Short names that load JSON from this repo:

| Link | What it is |
|---|---|
| [#preset=default](https://jamesmittlerii.github.io/chaos-sequencer/#preset=default) | Factory bass line |
| [#preset=trio](https://jamesmittlerii.github.io/chaos-sequencer/#preset=trio) | All three voices, mode contrast between lobes |
| [#preset=quantized](https://jamesmittlerii.github.io/chaos-sequencer/#preset=quantized) | 1/8 grid blend, two pitched voices |

To add one: save `presets/my-pad.json`, list `{ "id": "my-pad", "name": "My pad" }` in `presets/index.json`, push to `main`. After Pages rebuilds, `/#preset=my-pad` works.

### Saved on this browser

**Save** / **Load** / **Delete** use `localStorage`. They do not upload anywhere. Clearing site data deletes them. To move a local preset to another machine, **Copy link** or **Export JSON**.

**Import JSON** loads a file you (or someone) exported. The object looks like `{ "v": 1, "name": "…", "params": { … } }`.

---

## 13. Reading the diagnostic table

Keep this visible until the mapping feels obvious.

| Column | Read it as |
|---|---|
| `#` | Detector event index |
| `t` | Lorenz time of the event (not yet audio time) |
| `dir` | `up` / `down` for crossings; extrema use max/min direction |
| `x y z` | Coordinates at the event (X crossings have `x ≈ 0`) |
| `vel` | Trajectory speed; high → shorter notes |
| `pitch` / `midi` | After scale + lobe + register mapping |
| `dur` | Note length in seconds |
| `voice` | Bass / Lead / Perc |

If pitch jumps around more than you like: smaller scale (pentatonic), tonic-heavy weights, or narrower lobe octave contrast. If timing feels “broken”: that is the attractor; quantize only if you want a grid.

---

## 14. Architecture (for changing the system)

Stages are intentionally separate. Musical code does not live in the integrator; Lorenz math does not live in the synth.

| File | Role |
|---|---|
| `js/lorenz.js` | RK4 Lorenz ODE. `step()` → `{ x, y, z, t }` |
| `js/chaos-analyzer.js` | Zero crossings, extrema, distance, velocity, Z threshold |
| `js/event-generator.js` | Density + which voice cares about which event type |
| `js/musical-mapper.js` | Normalized features → scale degree, velocity, duration, octave |
| `js/sequencer.js` | Lorenz time → audio clock; optional grid blend |
| `js/synth-voice.js` | Oscillator, ADSR, filter, pan |
| `js/audio-engine.js` | `AudioContext`, master, voice instances |
| `js/engine.js` | The only place those stages are composed |
| `js/presets.js` | Snapshot, hash codec, localStorage, catalog fetch |
| `js/visualizer.js` | Trail, event marks, piano-roll timeline |
| `js/app.js` | UI wiring |

A different chaotic flow (Rössler, Chua, Duffing) can replace `LorenzAttractor` if it still exposes `step()` with `{ x, y, z, t }`. The mapper assumes Lorenz-like ranges; you would retune `LORENZ_BOUNDS` in `musical-mapper.js` for a different system.

Local development (ES modules will not load from `file://`):

```bash
python3 -m http.server 8080
```

Then [http://localhost:8080](http://localhost:8080). `npm test` checks RK4 bounds, seed replay, sensitive dependence, and preset encode/decode.

---

## 15. What “good” sounds like

You are aiming for a **recognizable relationship** between the figure-eight on the left and the notes on the right:

- Lobe jumps line up with voice-1 attacks.
- Teal and ember sound like two related places, not two random patches.
- Repeating **Play** from **Reset** repeats the piece.
- A tiny seed perturb eventually yields a different piece.

If you cannot hear that relationship, solo voice 1, use pentatonic minor, leave quantize off, and watch X crossings on the X/Z plot until the clicks in the diagnostic table match the notes in your ears. Add the rest only after that lock-in is obvious.
