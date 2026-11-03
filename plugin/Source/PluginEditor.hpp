// Lorenz MIDI effect
// Copyright (C) 2026 James Mittler II
// SPDX-License-Identifier: AGPL-3.0-or-later

#pragma once

#include "PluginProcessor.hpp"

#include <juce_gui_extra/juce_gui_extra.h>

class LorenzAudioProcessorEditor : public juce::AudioProcessorEditor, private juce::Timer {
public:
    explicit LorenzAudioProcessorEditor (LorenzAudioProcessor&);
    ~LorenzAudioProcessorEditor() override;

    void paint (juce::Graphics&) override;
    void resized() override;
    void timerCallback() override;
    void evaluate (const juce::String& script, std::function<void (juce::String)> callback);

private:
    struct Browser : juce::WebBrowserComponent {
        using juce::WebBrowserComponent::WebBrowserComponent;
        bool pageAboutToLoad (const juce::String& newURL) override;
    };

    LorenzAudioProcessor& lorenz() const { return static_cast<LorenzAudioProcessor&> (processor); }
    juce::WebBrowserComponent::Options makeOptions();
    std::optional<juce::WebBrowserComponent::Resource> getResource (const juce::String& url) const;
    juce::File webRoot() const;
    void emitState();
    void emitFrame();

    Browser web;
    int shownEpoch = -1;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (LorenzAudioProcessorEditor)
};
