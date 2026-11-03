// Lorenz MIDI effect
// Copyright (C) 2026 James Mittler II
// SPDX-License-Identifier: AGPL-3.0-or-later

#include "PluginEditor.hpp"

#include <cstring>

namespace {

const char* mimeFor (const juce::String& extension)
{
    if (extension == "html" || extension == "htm") return "text/html";
    if (extension == "css") return "text/css";
    if (extension == "js" || extension == "mjs") return "text/javascript";
    if (extension == "json") return "application/json";
    if (extension == "woff2") return "font/woff2";
    if (extension == "svg") return "image/svg+xml";
    if (extension == "png") return "image/png";
    return "application/octet-stream";
}

juce::var noteVar (const lorenz::MidiEvent& event)
{
    auto* chaos = new juce::DynamicObject();
    chaos->setProperty ("id", event.eventId);
    chaos->setProperty ("timestamp", event.timestamp);
    chaos->setProperty ("direction", juce::String (event.direction));
    chaos->setProperty ("x", event.x);
    chaos->setProperty ("y", event.y);
    chaos->setProperty ("z", event.z);
    chaos->setProperty ("velocity", event.chaosVelocity);

    auto* note = new juce::DynamicObject();
    note->setProperty ("midi", event.midi);
    note->setProperty ("noteName", juce::String (event.noteName));
    note->setProperty ("velocity", event.velocity / 127.0);
    note->setProperty ("duration", event.duration);
    note->setProperty ("lobe", juce::String (event.lobe));
    note->setProperty ("voiceName", juce::String (event.voiceName));
    note->setProperty ("voiceId", juce::String (event.voiceId));
    note->setProperty ("direction", juce::String (event.direction));
    note->setProperty ("when", event.time);
    note->setProperty ("pan", event.pan);
    note->setProperty ("chaos", juce::var (chaos));
    return juce::var (note);
}

} // namespace

bool LorenzAudioProcessorEditor::Browser::pageAboutToLoad (const juce::String& newURL)
{
    return newURL.startsWith (getResourceProviderRoot());
}

juce::WebBrowserComponent::Options LorenzAudioProcessorEditor::makeOptions()
{
    auto options = juce::WebBrowserComponent::Options{}
                       .withBackend (juce::WebBrowserComponent::Options::Backend::webview2)
                       .withWinWebView2Options (juce::WebBrowserComponent::Options::WinWebView2{}
                                                    .withUserDataFolder (juce::File::getSpecialLocation (juce::File::tempDirectory)
                                                                             .getChildFile ("LorenzMIDI")))
                       .withNativeIntegrationEnabled()
                       .withKeepPageLoadedWhenBrowserIsHidden()
                       .withInitialisationData ("presetJson", lorenz().getPresetJson())
                       .withEventListener ("preset", [this] (const juce::var& payload)
                                           { lorenz().pushPresetFromUi (payload); })
                       .withEventListener ("ready", [this] (const juce::var&)
                                           { emitState(); })
                       .withResourceProvider ([this] (const auto& url)
                                              { return getResource (url); });
    return options;
}

LorenzAudioProcessorEditor::LorenzAudioProcessorEditor (LorenzAudioProcessor& owner)
    : AudioProcessorEditor (&owner), web (makeOptions())
{
    addAndMakeVisible (web);
    setResizable (true, true);
    setResizeLimits (720, 480, 1680, 1200);
    setSize (1100, 760);
    web.goToURL (juce::WebBrowserComponent::getResourceProviderRoot());
    startTimerHz (30);
}

LorenzAudioProcessorEditor::~LorenzAudioProcessorEditor() = default;

juce::File LorenzAudioProcessorEditor::webRoot() const
{
    const auto exe = juce::File::getSpecialLocation (juce::File::currentExecutableFile);
    const auto bundled = exe.getParentDirectory().getSiblingFile ("Resources").getChildFile ("web");
    if (bundled.getChildFile ("index.html").existsAsFile())
        return bundled;
    return juce::File (LORENZ_WEB_ROOT);
}

std::optional<juce::WebBrowserComponent::Resource> LorenzAudioProcessorEditor::getResource (const juce::String& url) const
{
    auto path = url == "/" ? juce::String ("index.html") : url.fromFirstOccurrenceOf ("/", false, false);
    if (path.isEmpty() || path.contains (".."))
        return std::nullopt;
    const auto file = webRoot().getChildFile (path);
    if (! file.existsAsFile())
        return std::nullopt;

    juce::MemoryBlock block;
    if (! file.loadFileAsData (block))
        return std::nullopt;
    std::vector<std::byte> data (static_cast<size_t> (block.getSize()));
    if (! data.empty())
        std::memcpy (data.data(), block.getData(), data.size());
    const auto extension = file.getFileExtension().substring (1).toLowerCase();
    return juce::WebBrowserComponent::Resource { std::move (data), mimeFor (extension) };
}

void LorenzAudioProcessorEditor::emitState()
{
    web.emitEventIfBrowserIsVisible ("state", lorenz().getPresetJson());
}

void LorenzAudioProcessorEditor::emitFrame()
{
    const auto frame = lorenz().takeViz();
    const auto epoch = lorenz().getStateEpoch();
    if (epoch != shownEpoch)
    {
        shownEpoch = epoch;
        emitState();
    }

    auto* payload = new juce::DynamicObject();
    payload->setProperty ("playing", frame.playing);
    payload->setProperty ("cleared", frame.cleared);
    payload->setProperty ("bpm", frame.bpm);
    payload->setProperty ("sequenceTime", frame.sequenceTime);
    payload->setProperty ("t", frame.t);
    payload->setProperty ("x", frame.x);
    payload->setProperty ("y", frame.y);
    payload->setProperty ("z", frame.z);
    payload->setProperty ("noteCount", frame.noteCount);
    payload->setProperty ("eventCount", frame.eventCount);

    juce::Array<juce::var> points;
    for (const auto& point : frame.points)
    {
        juce::Array<juce::var> tuple;
        tuple.add (point.x);
        tuple.add (point.y);
        tuple.add (point.z);
        tuple.add (point.t);
        points.add (juce::var (tuple));
    }
    payload->setProperty ("points", points);

    juce::Array<juce::var> notes;
    for (const auto& note : frame.notes)
        notes.add (noteVar (note));
    payload->setProperty ("notes", notes);

    web.emitEventIfBrowserIsVisible ("frame", juce::var (payload));
}

void LorenzAudioProcessorEditor::timerCallback()
{
    emitFrame();
}

void LorenzAudioProcessorEditor::evaluate (const juce::String& script, std::function<void (juce::String)> callback)
{
    web.evaluateJavascript (script, [callback] (juce::WebBrowserComponent::EvaluationResult result)
    {
        if (const auto* value = result.getResult())
            callback (value->toString());
        else if (const auto* error = result.getError())
            callback ("error: " + error->message);
        else
            callback ("error: empty");
    });
}

void LorenzAudioProcessorEditor::paint (juce::Graphics& g)
{
    g.fillAll (juce::Colour (0xff06080c));
}

void LorenzAudioProcessorEditor::resized()
{
    web.setBounds (getLocalBounds());
}
