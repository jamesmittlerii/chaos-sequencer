// Lorenz MIDI effect
// Copyright (C) 2026 James Mittler II
// SPDX-License-Identifier: AGPL-3.0-or-later

#pragma once

#include "Engine/ChaosEngine.hpp"

#include <juce_audio_processors/juce_audio_processors.h>

#include <mutex>
#include <vector>

class LorenzAudioProcessor : public juce::AudioProcessor {
public:
    LorenzAudioProcessor();
    ~LorenzAudioProcessor() override;

    void prepareToPlay (double sampleRate, int samplesPerBlock) override;
    void releaseResources() override;
    bool isBusesLayoutSupported (const BusesLayout& layouts) const override;
    void processBlock (juce::AudioBuffer<float>&, juce::MidiBuffer&) override;

    juce::AudioProcessorEditor* createEditor() override;
    bool hasEditor() const override { return true; }

    const juce::String getName() const override { return "Lorenz"; }
    bool acceptsMidi() const override { return false; }
    bool producesMidi() const override { return true; }
    bool isMidiEffect() const override { return true; }
    double getTailLengthSeconds() const override { return 0; }

    int getNumPrograms() override { return 1; }
    int getCurrentProgram() override { return 0; }
    void setCurrentProgram (int) override {}
    const juce::String getProgramName (int) override { return {}; }
    void changeProgramName (int, const juce::String&) override {}

    void getStateInformation (juce::MemoryBlock& destData) override;
    void setStateInformation (const void* data, int sizeInBytes) override;

    void pushPresetFromUi (const juce::var& payload);
    juce::String getPresetJson() const;
    int getStateEpoch() const;

    struct Viz {
        bool cleared = false;
        bool playing = false;
        double bpm = 92;
        double sequenceTime = 0;
        double t = 0, x = 0, y = 0, z = 0;
        int noteCount = 0;
        int eventCount = 0;
        std::vector<lorenz::Point> points;
        std::vector<lorenz::MidiEvent> notes;
    };

    Viz takeViz();

private:
    enum class ApplyMode { live, restartHere, replaceState };

    lorenz::Config configFromPreset (const juce::var& preset) const;
    juce::String presetFromConfig (const lorenz::Config& config) const;
    void addAllNotesOff (juce::MidiBuffer& midi);

    lorenz::ChaosEngine engine;
    lorenz::Config config;
    juce::String presetJson;
    ApplyMode mode = ApplyMode::live;
    int revision = 0;
    int appliedRevision = -1;
    int stateEpoch = 0;
    double origin = 0;
    bool wasPlaying = false;
    bool held[16][128] {};
    int lastPan[16] {};
    int noteCount = 0;
    mutable std::mutex mutex;
    Viz viz;
    std::mutex vizMutex;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (LorenzAudioProcessor)
};
