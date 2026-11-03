# Lorenz MIDI effect

AGPLv3 MIDI effect for macOS (Audio Unit and VST3) and Windows (VST3). It runs the Lorenz sequencer in the plugin processor and shows the existing page in a web view. The website in the repository root stays a separate MIT-licensed program.

This build uses JUCE 9.0.5, also under the AGPL. Source for a binary is the git tag of this repository plus that JUCE tag.

## Build

```bash
cmake -S plugin -B plugin/build
cmake --build plugin/build --config Release
```

Products:

- `plugin/build/LorenzMIDI_artefacts/Release/AU/Lorenz.component`
- `plugin/build/LorenzMIDI_artefacts/Release/VST3/Lorenz.vst3`
- `plugin/build/LorenzMIDI_artefacts/Release/Standalone/Lorenz.app`

`lorenz_engine_test` checks the C++ renderer against `tests/lorenz-fixture.csv`, which the JavaScript renderer produced. `lorenz_host_test` plays the processor with the editor closed and checks transport, preset state, and factory presets. `lorenz_host_test --ui` loads the page and checks that the synth is hidden.

Load it as a MIDI effect in front of an instrument. Play starts when the DAW transport starts. Reset and Perturb start the sequence at the current playhead. The saved plugin state is the same preset JSON the website uses.
