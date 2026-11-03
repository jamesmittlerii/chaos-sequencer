// Lorenz MIDI effect
// Copyright (C) 2026 James Mittler II
// SPDX-License-Identifier: AGPL-3.0-or-later

#include "PluginEditor.hpp"
#include "PluginProcessor.hpp"

#include <cmath>
#include <cstring>
#include <fstream>
#include <iostream>
#include <sstream>
#include <string>
#include <vector>

namespace {

struct Note {
    double time = 0;
    int midi = 0;
    int velocity = 0;
};

struct Head : juce::AudioPlayHead {
    juce::Optional<juce::AudioPlayHead::PositionInfo> getPosition() const override { return info; }
    juce::AudioPlayHead::PositionInfo info;
};

struct Harness {
    LorenzAudioProcessor processor;
    Head head;
    double sampleRate = 44100;
    int block = 256;
    double time = 0;

    Harness()
    {
        processor.setRateAndBufferSizeDetails (sampleRate, block);
        processor.prepareToPlay (sampleRate, block);
        processor.setPlayHead (&head);
        head.info.setIsPlaying (false);
        head.info.setTimeInSeconds (0.0);
        head.info.setBpm (92.0);
    }

    juce::MidiBuffer step (bool playing)
    {
        head.info.setIsPlaying (playing);
        head.info.setTimeInSeconds (time);
        juce::AudioBuffer<float> audio (0, block);
        juce::MidiBuffer midi;
        processor.processBlock (audio, midi);
        if (playing)
            time += static_cast<double> (block) / sampleRate;
        return midi;
    }
};

int fail (const std::string& message)
{
    std::cerr << message << "\n";
    return 1;
}

std::vector<Note> noteOns (const juce::MidiBuffer& midi, double blockStart)
{
    std::vector<Note> notes;
    for (const auto meta : midi)
    {
        const auto message = meta.getMessage();
        if (! message.isNoteOn())
            continue;
        Note note;
        note.time = blockStart + static_cast<double> (meta.samplePosition) / 44100.0;
        note.midi = message.getNoteNumber();
        note.velocity = message.getVelocity();
        notes.push_back (note);
    }
    return notes;
}

bool hasController (const juce::MidiBuffer& midi, int number)
{
    for (const auto meta : midi)
    {
        const auto message = meta.getMessage();
        if (message.isController() && message.getControllerNumber() == number)
            return true;
    }
    return false;
}

std::vector<Note> loadFixture()
{
    std::ifstream in (LORENZ_FIXTURE);
    if (! in)
        throw std::runtime_error ("cannot open fixture");
    std::string line;
    std::getline (in, line);
    std::vector<Note> rows;
    while (std::getline (in, line))
    {
        if (line.empty())
            continue;
        std::replace (line.begin(), line.end(), ',', ' ');
        std::stringstream ss (line);
        Note row;
        double velocity = 0;
        double duration = 0;
        std::string voice;
        ss >> row.time >> row.midi >> velocity >> duration >> voice;
        row.velocity = static_cast<int> (std::lround (velocity * 127.0));
        rows.push_back (row);
    }
    return rows;
}

std::vector<Note> play (Harness& harness, double until)
{
    std::vector<Note> notes;
    while (harness.time < until - 1.0e-9)
    {
        const double start = harness.time;
        const auto midi = harness.step (true);
        const auto ons = noteOns (midi, start);
        notes.insert (notes.end(), ons.begin(), ons.end());
    }
    return notes;
}

} // namespace

static int runUi()
{
    juce::ScopedJuceInitialiser_GUI gui;
    LorenzAudioProcessor processor;
    juce::DocumentWindow window ("Lorenz", juce::Colours::black, juce::DocumentWindow::allButtons);
    auto* editor = processor.createEditor();
    window.setUsingNativeTitleBar (true);
    window.setContentOwned (editor, true);
    window.centreWithSize (1100, 760);
    window.setVisible (true);

    juce::String report = "pending";
    bool asked = false;
    const auto started = juce::Time::getMillisecondCounter();
    while (juce::Time::getMillisecondCounter() - started < 8000)
    {
        juce::MessageManager::getInstance()->runDispatchLoopUntil (150);
        if (! asked && juce::Time::getMillisecondCounter() - started > 2500)
        {
            asked = true;
            static_cast<LorenzAudioProcessorEditor*> (editor)->evaluate (
                "JSON.stringify({host:document.body.classList.contains('plugin-host'),presets:document.getElementById('catalogSelect').options.length,canvas:!!document.getElementById('attractor'),synth:getComputedStyle(document.querySelector('details.panel.browser-only')).display,play:getComputedStyle(document.getElementById('playBtn')).display,banner:getComputedStyle(document.querySelector('.plugin-only')).display})",
                [&report] (juce::String value) { report = value; });
        }
        if (report != "pending")
            break;
    }

    std::cout << report << "\n";
    return report.contains ("\"host\":true") && report.contains ("\"canvas\":true") ? 0 : 1;
}

int main (int argc, char** argv)
{
    if (argc > 1 && std::string (argv[1]) == "--ui")
        return runUi();

    if (! juce::MessageManager::getInstance()->isThisTheMessageThread())
        return fail ("message thread was not running");

    const auto fixture = loadFixture();
    Harness harness;
    if (harness.processor.getTotalNumInputChannels() != 2 || harness.processor.getTotalNumOutputChannels() != 2)
        return fail ("expected silent stereo buses so Ableton can open the VST3");
    if (! harness.processor.isMidiEffect() || ! harness.processor.producesMidi() || harness.processor.acceptsMidi())
        return fail ("MIDI effect flags are wrong");

    // The editor is never created. Playback has to come from processBlock.
    auto notes = play (harness, 16.0);
    if (notes.size() != fixture.size())
        return fail ("editor-closed note count " + std::to_string (notes.size())
                     + " != " + std::to_string (fixture.size()));
    for (size_t i = 0; i < notes.size(); ++i)
    {
        if (notes[i].midi != fixture[i].midi || notes[i].velocity != fixture[i].velocity)
            return fail ("note " + std::to_string (i) + " midi/velocity mismatch");
        if (std::abs (notes[i].time - fixture[i].time) > 1.0e-3)
            return fail ("note " + std::to_string (i) + " time mismatch");
    }

    bool sawPan = false;
    {
        Harness pan;
        while (pan.time < 4.0 && ! sawPan)
            sawPan = hasController (pan.step (true), 10);
    }
    if (! sawPan)
        return fail ("lobe pan was not sent as CC 10");

    const auto stopped = harness.step (false);
    if (! hasController (stopped, 123))
        return fail ("transport stop did not send all-notes-off");

    Harness jumped;
    play (jumped, 1.0);
    jumped.time = 8.0;
    auto tail = play (jumped, 16.0);
    std::vector<Note> expectedTail;
    for (const auto& note : notes)
        if (note.time >= 8.0 - 1.0e-3)
            expectedTail.push_back (note);
    if (tail.size() != expectedTail.size())
        return fail ("seek tail count " + std::to_string (tail.size())
                     + " != " + std::to_string (expectedTail.size()));
    for (size_t i = 0; i < tail.size(); ++i)
    {
        if (tail[i].midi != expectedTail[i].midi)
            return fail ("seek changed a pitch");
        if (std::abs (tail[i].time - expectedTail[i].time) > 2.0e-3)
            return fail ("seek time mismatch");
    }

    Harness looped;
    play (looped, 3.0);
    looped.time = 0.0;
    const double loopBlock = looped.time;
    const auto loopMidi = looped.step (true);
    if (! hasController (loopMidi, 123))
        return fail ("loop did not send all-notes-off");
    auto restarted = noteOns (loopMidi, loopBlock);
    auto loopedNotes = play (looped, 2.0);
    restarted.insert (restarted.end(), loopedNotes.begin(), loopedNotes.end());
    if (restarted.size() < 1 || restarted[0].midi != notes[0].midi)
        return fail ("loop did not chase from the seed");

    auto quantize = [] (double bpm)
    {
        const char* json = R"({"v":2,"name":"Grid","params":{"quantize":true,"grid":"1/4","timingInfluence":1,"bpm":60}})";
        Harness grid;
        grid.processor.setStateInformation (json, static_cast<int> (std::strlen (json)));
        grid.head.info.setBpm (bpm);
        return play (grid, 12.0);
    };
    const auto slow = quantize (60.0);
    const auto fast = quantize (120.0);
    if (slow.empty() || fast.empty())
        return fail ("quantized transport produced no notes");
    if (std::abs (slow[0].time - fast[0].time) < 0.02)
        return fail ("host tempo did not move the quantize grid");

    Harness state;
    const char* wide = R"({"v":2,"name":"Wide","params":{"speed":4.2}})";
    state.processor.setStateInformation (wide, static_cast<int> (std::strlen (wide)));
    juce::MemoryBlock stored;
    state.processor.getStateInformation (stored);
    const auto restored = juce::JSON::parse (juce::String::fromUTF8 (static_cast<const char*> (stored.getData()), static_cast<int> (stored.getSize())));
    if (restored.getProperty ("name", {}).toString() != "Wide")
        return fail ("state chunk dropped the preset name");
    if (std::abs (static_cast<double> (restored.getProperty ("params", {}).getProperty ("speed", 0)) - 4.2) > 1.0e-6)
        return fail ("state chunk dropped the speed");

    std::ifstream presetFile (std::string (LORENZ_PRESETS) + "/default.json");
    std::stringstream presetText;
    presetText << presetFile.rdbuf();
    const auto presetString = presetText.str();
    if (presetString.find ("\"name\"") == std::string::npos)
        return fail ("factory preset missing");
    Harness factory;
    factory.processor.setStateInformation (presetString.data(), static_cast<int> (presetString.size()));
    const auto factoryNotes = play (factory, 8.0);
    if (factoryNotes.empty())
        return fail ("factory preset produced no notes");
    if (! factory.processor.getPresetJson().contains ("Default"))
        return fail ("factory preset was not stored");

    Harness live;
    play (live, 1.0);
    const double before = live.processor.takeViz().t;
    auto* payload = new juce::DynamicObject();
    payload->setProperty ("restart", false);
    payload->setProperty ("preset", juce::JSON::parse (live.processor.getPresetJson()));
    payload->getProperty ("preset").getDynamicObject()->getProperty ("params").getDynamicObject()->setProperty ("lobeAVel", 1.4);
    live.processor.pushPresetFromUi (juce::var (payload));
    play (live, live.time + 0.5);
    const double continued = live.processor.takeViz().t;
    if (! (continued > before + 0.5))
        return fail ("a live edit restarted the trajectory");

    Harness again;
    play (again, 1.0);
    auto* restart = new juce::DynamicObject();
    restart->setProperty ("restart", true);
    restart->setProperty ("preset", juce::JSON::parse (again.processor.getPresetJson()));
    again.processor.pushPresetFromUi (juce::var (restart));
    play (again, again.time + 0.3);
    if (again.processor.takeViz().t > 1.0)
        return fail ("reset did not rebase the sequence to the playhead");

    std::cout << "host transport ok (editor closed, " << notes.size() << " notes)\n";
    return 0;
}
