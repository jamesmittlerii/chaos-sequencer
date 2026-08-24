# Lobes — musical states on the attractor

This document is a deep dive into the **Lobes (musical states)** panel. For a first listen and the full walkthrough, start with [TUTORIAL.md](TUTORIAL.md). For architecture and presets, see [README.md](README.md).

The Lorenz butterfly (and most flows in this app) spends its time on two wings. The sequencer treats those wings as **two musical states** — not two random patches, but two sides of the same deterministic material.

---

## What a lobe is

On the default **X / Y** projection, the vertical line at `x = 0` is the boundary between wings:

| State | Condition | Color in the viz | Default role |
|---|---|---|---|
| **Lobe A** | `x < 0` | Teal | Left wing, “home” register |
| **Lobe B** | `x > 0` | Ember | Right wing, brighter / higher contrast |

The HUD shows the **current** lobe while the trajectory runs. The trail is drawn in teal or ember depending on which side of `x = 0` each point lies.

Lobe settings do **not** choose *when* notes fire (that is the job of voices and density). They choose **how a note sounds and which harmonic rules apply** once an event has been detected, based on which state the event belongs to.

---

## How the active lobe is chosen

Every chaotic event carries a `lobe` field. `MusicalMapper` reads that field and applies the matching A or B configuration.

### Position-based (most events)

For extrema, Z-threshold crossings, and any event without an explicit override:

```text
lobe = (x < 0) ? "A" : "B"
```

So a **Y maximum** while the point sits on the left wing uses lobe A settings, even though Y extrema are not lobe crossings.

### Destination-based (X zero-crossings)

Voice 1’s primary trigger — **X zero-crossings** — uses the **destination** wing, not the side you left:

| Crossing | Direction | Destination lobe |
|---|---|---|
| Negative → positive | up | **B** |
| Positive → negative | down | **A** |

That is why left-to-right crossings (into B) sound higher by default: lobe B has **octave offset +1**, not because pitch is tied to crossing direction directly.

Implementation: `js/chaos-analyzer.js` sets `lobe: direction === "up" ? "B" : "A"` on `x-crossing` events.

---

## What lobes control vs what they do not

Lobe settings are **multipliers and overrides** on top of the shared mapping in **Harmony** and per-voice ranges in code.

### Shared first (Harmony panel)

| Input | Role |
|---|---|
| **Root** | Key center for all voices |
| **Scale** | Default scale for both lobes when override is *inherit* |

### Per event (chaos features → pitch and dynamics)

These apply **before** lobe offsets, for every voice:

| Feature | Maps to |
|---|---|
| **Y** (normalized) | Scale **degree** inside the active lobe’s scale |
| **Distance from origin** (normalized) | **Octave register** within the voice’s range |
| **Z** (normalized) | **Velocity** (loudness) |
| **Trajectory speed** (normalized) | **Duration** (faster motion → shorter notes) |

Each voice has its own register and duration span in code (for example voice 1 uses roughly octaves 2–4 and longer notes; voice 2 uses 4–6 and shorter notes). Lobe settings apply on top of those voice-specific ranges.

### Per lobe (Lobes panel)

| Control | Effect |
|---|---|
| **Octave** | Added to the register after distance mapping |
| **Velocity** | Multiplier on Z-derived velocity |
| **Duration** | Multiplier on speed-derived duration |
| **Pan** | Stereo position for notes in that lobe |
| **Filter** | Per-note low-pass cutoff baseline |
| **Scale override** | Replace Harmony scale for this lobe only |
| **Degree weights** | Bias which scale degrees Y tends to pick |

Pitch is **never** “the x coordinate as MIDI.” Lobes shape **color and register contrast** between wings; Y and distance still pick the actual note.

---

## Control reference

All sliders apply to **both voices** (and voice 3) equally — there are no per-voice lobe panels.

### Octave (`lobeAOctave`, `lobeBOctave`)

- **Range:** −2 … +2 (integer steps)
- **Default:** A = 0, B = +1
- **Formula:** `register = voiceOctaveRange(distNorm) + lobeOctaveOffset`

Use this for the classic “left wing lower, right wing higher” call-and-response. Setting both to `0` removes pitch register contrast while pan, filter, and duration differences remain.

### Velocity (`lobeAVel`, `lobeBVel`)

- **Range:** 0.2 … 2.0
- **Default:** A = 0.85, B = 1.15
- **Formula:** `velocity = clamp(zMapped * lobeVelocityScale, 0.01, 1)`

Scales loudness after Z normalization. B notes hit slightly harder at the same height on the butterfly.

### Duration (`lobeADur`, `lobeBDur`)

- **Range:** 0.3 … 2.5
- **Default:** A = 1.2, B = 0.8
- **Formula:** `duration = speedMapped * lobeDurationScale`

Scales note length after trajectory-speed mapping. Default A **sustains**; default B **staccato** — so wing changes feel like articulation changes, not just pitch jumps.

### Pan (`lobeAPan`, `lobeBPan`)

- **Range:** −1 (full left) … +1 (full right)
- **Default:** A = −0.35, B = +0.35

Applied per note in the synth. Voice 3 (perc) is stereo-capable; voices 1–2 are mono but still respect pan for spatial imaging.

**Modulation → Pan from X** adds extra stereo wobble on top of the lobe pan (see below).

### Filter (`lobeAFilter`, `lobeBFilter`)

- **Range:** 200 … 6000 Hz
- **Default:** A = 900, B = 2400

Per-note low-pass cutoff **baseline** before modulation. A is darker; B is brighter.

The **Synth** panel **Cutoff** / **Resonance** are shared voice defaults. Lobe filter values replace the baseline cutoff on each note (`note.filter ?? voice.cutoff`).

**Modulation → Filter from Z** adds up to +4200 Hz based on current Z at the event.

### Scale override (`lobeAScale`, `lobeBScale`)

- **Default:** *inherit* (empty) — use Harmony scale
- **Options:** chromatic, major, minor, pentatonic major/minor, whole tone

When set, that lobe’s notes are snapped to a **different** scale while the root from Harmony still applies.

Example from the **trio** library preset:

- Lobe A → pentatonic minor, tonic-heavy
- Lobe B → pentatonic major, color tones

Crossing `x = 0` then changes **mode and melodic bias**, not just timbre.

### Degree weights (`lobeAWeights`, `lobeBWeights`)

Y is normalized to 0…1, then mapped to a scale degree. Weights skew which degrees are likely:

| Mode | Behavior |
|---|---|
| **Even** | Uniform — all degrees equally likely |
| **Tonic-heavy** | Boosts scale degree 0 and the midpoint degree (stable, “home” notes) |
| **Color tones** | De-emphasizes the tonic; favors other degrees |

Weights are rebuilt when the effective scale changes (global or lobe override). Implementation: `degreeWeights()` in `js/app.js`, `weightedDegree()` in `js/musical-mapper.js`.

---

## End-to-end mapping (one note)

For a voice-1 **x-crossing** into lobe B:

```text
1. ChaosAnalyzer emits x-crossing at x ≈ 0, direction up → lobe B
2. EventGenerator accepts it (density / voice enable)
3. MusicalMapper.map():
     scale     ← lobe B scale (or Harmony if inherit)
     degree    ← Y normalized → weighted pick on that scale
     register  ← distance normalized → voice octave range + lobe B octave offset
     midi      ← root + register×12 + scale interval
     velocity  ← Z normalized × lobe B velocity scale
     duration  ← speed normalized × lobe B duration scale
     pan       ← lobe B pan
     filter    ← lobe B filter cutoff
4. Engine._enrich() optionally adds modulatePan / modulateFilter / FM
5. Sequencer schedules; synth plays
```

The diagnostic log columns **pitch**, **vel**, **dur**, and the gold readout all reflect the **final** values after lobe (and modulation) processing.

---

## Interaction with other panels

| Panel | Relationship to lobes |
|---|---|
| **Harmony** | Root + default scale; lobe overrides replace scale only |
| **Voices** | All enabled voices share the same lobe A/B config |
| **Synth** | Shared ADSR/resonance; lobe filter sets per-note cutoff baseline |
| **Modulation** | Adds on top of lobe pan/filter (does not replace them) |
| **Rhythm / Density** | Unaffected — lobes are timbral/harmonic, not temporal |

### Modulation overlay (engine)

After lobe mapping, `js/engine.js` can still adjust:

| Control | Effect |
|---|---|
| **Pan from X** | ±`modulatePan` by horizontal position at the event |
| **Filter from Z** | + up to 4200 Hz × `modulateFilter` × zNorm |
| **FM from velocity** | Brightness from trajectory speed |

Think of lobes as **state presets** and modulation as **continuous expression** within a state.

---

## Defaults and design intent

Out of the box, A and B differ on every axis so that **wing changes are audible even in mono**:

```text
        A (teal)          B (ember)
Octave   0                 +1
Vel      0.85              1.15
Dur      1.20              0.80
Pan      −0.35             +0.35
Filter   900 Hz            2400 Hz
Weights  tonic-heavy       even
Scale    inherit           inherit
```

The goal is **modulation of the same material**: same attractor, same seed, same Y→degree logic — but a clear change of register, space, brightness, and articulation when the trajectory moves to the other wing.

---

## Experiments (ordered)

1. **Hear only timbre contrast** — Set both octave offsets to `0`. Keep default pan/filter/duration.
2. **Hear only register contrast** — Set pan both to `0`, filters both to `1600`, durations both to `1.0`.
3. **Modal exchange** — A = pentatonic minor / tonic-heavy, B = pentatonic major / color (see `#preset=trio`).
4. **Monochrome wings** — Same scale and weights on A and B; only octave + pan differ. Good for checking crossing detection.
5. **Extreme separation** — A octave −1, B octave +2; A filter 400, B filter 5000. Useful for teaching which events belong to which wing in a classroom demo.

Reset and Play after each change so you replay from the same seed.

---

## Presets and share links

All lobe controls are serialized in preset URLs and JSON (`js/presets.js` field list). Library examples:

| Preset | Lobe character |
|---|---|
| `default` | Standard A/B contrast (see table above) |
| `quantized` | Slightly softer velocity/duration contrast; grid timing |
| `trio` | Different scales and degree weights per lobe; all voices on |

Copy link after editing lobes to share an exact A/B setup.

---

## FAQ

**Why do rightward crossings sound higher?**  
Default B octave offset is +1. Direction sets destination lobe; lobe sets register offset.

**Do lobes affect voice 2 and 3?**  
Yes. Y extrema and Z hits use position-based lobe (`x < 0` → A). They get the same octave/velocity/duration/pan/filter/scale/weight rules.

**Can lobes change which notes fire?**  
No. Only **Density** and **Voices** gate events. Lobes only change parameters of notes that already fired.

**Does inherit mean “no scale”?**  
No. Inherit means “use the **Harmony → Scale** value for this lobe.”

**Why does pitch still move inside one lobe?**  
Y and distance still vary along the wing. Lobes add **state-wide** bias; they do not freeze pitch.

---

## Code map

| Concern | Module |
|---|---|
| Lobe on events | `js/chaos-analyzer.js` |
| A/B config + mapping math | `js/musical-mapper.js` |
| UI → config | `js/app.js` → `applyMappingFromUI()` |
| Modulation overlay | `js/engine.js` → `_enrich()` |
| Playback | `js/synth-voice.js`, `js/audio-engine.js` |
| Preset encode/decode | `js/presets.js` |

The attractor integrator (`js/attractors.js` / `js/lorenz.js`) has no lobe concept — lobes exist only in the musical layer.
