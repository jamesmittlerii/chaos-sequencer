// Lorenz MIDI effect
// Copyright (C) 2026 James Mittler II
// SPDX-License-Identifier: AGPL-3.0-or-later

#include "PluginProcessor.hpp"

#include "PluginEditor.hpp"

#include <algorithm>
#include <cmath>

namespace {

bool has (const juce::var& obj, const char* key)
{
    if (auto* o = obj.getDynamicObject())
        return o->hasProperty (key);
    return false;
}

double number (const juce::var& obj, const char* key, double fallback)
{
    if (! has (obj, key))
        return fallback;
    return static_cast<double> (obj.getProperty (key, fallback));
}

int integer (const juce::var& obj, const char* key, int fallback)
{
    return static_cast<int> (std::lround (number (obj, key, fallback)));
}

bool flag (const juce::var& obj, const char* key, bool fallback)
{
    if (! has (obj, key))
        return fallback;
    const auto value = obj.getProperty (key, fallback);
    if (value.isBool())
        return static_cast<bool> (value);
    if (value.isString())
        return value.toString() == "true" || value.toString() == "1";
    return static_cast<double> (value) != 0;
}

juce::String text (const juce::var& obj, const char* key, const juce::String& fallback)
{
    if (! has (obj, key))
        return fallback;
    return obj.getProperty (key, fallback).toString();
}

void readLobe (lorenz::LobeConfig& lobe, const juce::var& params, const char* prefix)
{
    const auto oct = juce::String (prefix) + "Octave";
    const auto vel = juce::String (prefix) + "Vel";
    const auto dur = juce::String (prefix) + "Dur";
    const auto pan = juce::String (prefix) + "Pan";
    const auto filter = juce::String (prefix) + "Filter";
    const auto scale = juce::String (prefix) + "Scale";
    const auto weights = juce::String (prefix) + "Weights";
    lobe.octaveOffset = integer (params, oct.toRawUTF8(), lobe.octaveOffset);
    lobe.velocityScale = number (params, vel.toRawUTF8(), lobe.velocityScale);
    lobe.durationScale = number (params, dur.toRawUTF8(), lobe.durationScale);
    lobe.pan = number (params, pan.toRawUTF8(), lobe.pan);
    lobe.filter = number (params, filter.toRawUTF8(), lobe.filter);
    lobe.scale = text (params, scale.toRawUTF8(), lobe.scale).toStdString();
    lobe.weights = text (params, weights.toRawUTF8(), juce::String (lobe.weights)).toStdString();
}

} // namespace

LorenzAudioProcessor::LorenzAudioProcessor()
    : AudioProcessor (BusesProperties()
                          .withInput ("Input", juce::AudioChannelSet::stereo(), true)
                          .withOutput ("Output", juce::AudioChannelSet::stereo(), true))
{
    config = lorenz::Config::websiteDefault();
    presetJson = presetFromConfig (config);
    for (int ch = 0; ch < 16; ++ch)
        lastPan[ch] = -1;
    engine.setConfig (config, true);
}

LorenzAudioProcessor::~LorenzAudioProcessor() = default;

void LorenzAudioProcessor::prepareToPlay (double, int) {}
void LorenzAudioProcessor::releaseResources() {}

bool LorenzAudioProcessor::isBusesLayoutSupported (const BusesLayout& layouts) const
{
    // Live refuses an Fx VST3 that has no audio input ("no valid audio input bus").
    // The buses stay silent: processBlock clears them and the notes go out as MIDI.
    const auto in = layouts.getMainInputChannelSet();
    const auto out = layouts.getMainOutputChannelSet();
    if (in != out)
        return false;
    return in.isDisabled()
        || in == juce::AudioChannelSet::mono()
        || in == juce::AudioChannelSet::stereo();
}

juce::String LorenzAudioProcessor::presetFromConfig (const lorenz::Config& source) const
{
    auto* params = new juce::DynamicObject();
    params->setProperty ("systemId", juce::String (source.systemId));
    auto* attractor = new juce::DynamicObject();
    if (source.systemId == "chua")
    {
        attractor->setProperty ("alpha", source.alpha);
        attractor->setProperty ("beta", source.beta);
        attractor->setProperty ("m0", source.m0);
        attractor->setProperty ("m1", source.m1);
    }
    else if (source.systemId == "rossler")
    {
        attractor->setProperty ("a", source.a);
        attractor->setProperty ("b", source.b);
        attractor->setProperty ("c", source.c);
    }
    else if (source.systemId == "thomas" || source.systemId == "halvorsen")
    {
        attractor->setProperty (source.systemId == "thomas" ? "b" : "a", source.systemId == "thomas" ? source.b : source.a);
    }
    else if (source.systemId == "aizawa")
    {
        attractor->setProperty ("a", source.a);
        attractor->setProperty ("b", source.b);
        attractor->setProperty ("c", source.c);
        attractor->setProperty ("d", source.d);
        attractor->setProperty ("e", source.e);
        attractor->setProperty ("f", source.f);
    }
    else if (source.systemId == "rabinovich")
    {
        attractor->setProperty ("alpha", source.alpha);
        attractor->setProperty ("gamma", source.gamma);
    }
    else
    {
        attractor->setProperty ("sigma", source.sigma);
        attractor->setProperty ("rho", source.rho);
        attractor->setProperty ("beta", source.beta);
    }
    params->setProperty ("attractorParams", juce::var (attractor));
    params->setProperty ("dt", source.dt);
    params->setProperty ("speed", source.speed);
    params->setProperty ("x0", source.x0);
    params->setProperty ("y0", source.y0);
    params->setProperty ("z0", source.z0);
    params->setProperty ("root", juce::String (source.root));
    params->setProperty ("scale", juce::String (source.scale));
    params->setProperty ("lobeAOctave", source.lobeA.octaveOffset);
    params->setProperty ("lobeBOctave", source.lobeB.octaveOffset);
    params->setProperty ("lobeAVel", source.lobeA.velocityScale);
    params->setProperty ("lobeBVel", source.lobeB.velocityScale);
    params->setProperty ("lobeADur", source.lobeA.durationScale);
    params->setProperty ("lobeBDur", source.lobeB.durationScale);
    params->setProperty ("lobeAPan", source.lobeA.pan);
    params->setProperty ("lobeBPan", source.lobeB.pan);
    params->setProperty ("lobeAFilter", source.lobeA.filter);
    params->setProperty ("lobeBFilter", source.lobeB.filter);
    params->setProperty ("lobeAScale", juce::String (source.lobeA.scale));
    params->setProperty ("lobeBScale", juce::String (source.lobeB.scale));
    params->setProperty ("lobeAWeights", juce::String (source.lobeA.weights));
    params->setProperty ("lobeBWeights", juce::String (source.lobeB.weights));
    params->setProperty ("quantize", source.quantize);
    params->setProperty ("grid", juce::String (source.grid));
    params->setProperty ("bpm", source.bpm);
    params->setProperty ("timingInfluence", source.timingInfluence);
    params->setProperty ("densityMode", juce::String (source.densityMode));
    params->setProperty ("nth", source.nth);
    params->setProperty ("probability", source.probability);
    params->setProperty ("velocityThreshold", source.velocityThreshold);
    params->setProperty ("customMetric", juce::String (source.customMetric));
    params->setProperty ("customThreshold", source.customThreshold);
    params->setProperty ("zThreshold", source.zThreshold);
    params->setProperty ("voice1Enable", source.voice1.enabled);
    params->setProperty ("voice2Enable", source.voice2.enabled);
    params->setProperty ("voice3Enable", source.voice3.enabled);
    params->setProperty ("midiChannel1", source.voice1.channel);
    params->setProperty ("midiChannel2", source.voice2.channel);
    params->setProperty ("midiChannel3", source.voice3.channel);
    params->setProperty ("modulatePan", source.modulatePan);
    params->setProperty ("projection", "xy");
    params->setProperty ("diagnostics", true);

    auto* root = new juce::DynamicObject();
    root->setProperty ("v", 2);
    root->setProperty ("name", "Lorenz");
    root->setProperty ("params", juce::var (params));
    return juce::JSON::toString (juce::var (root));
}

lorenz::Config LorenzAudioProcessor::configFromPreset (const juce::var& preset) const
{
    auto next = lorenz::Config::websiteDefault();
    const auto params = preset.getProperty ("params", preset);
    if (! params.isObject())
        return next;

    next.systemId = text (params, "systemId", "lorenz").toStdString();
    const auto attractor = params.getProperty ("attractorParams", {});
    if (attractor.isObject())
    {
        auto take = [&] (const char* key, double& dest)
        {
            if (has (attractor, key))
                dest = number (attractor, key, dest);
        };
        take ("sigma", next.sigma);
        take ("rho", next.rho);
        take ("beta", next.beta);
        take ("alpha", next.alpha);
        take ("gamma", next.gamma);
        take ("m0", next.m0);
        take ("m1", next.m1);
        take ("a", next.a);
        take ("b", next.b);
        take ("c", next.c);
        take ("d", next.d);
        take ("e", next.e);
        take ("f", next.f);
    }

    next.dt = number (params, "dt", next.dt);
    next.speed = number (params, "speed", next.speed);
    next.x0 = number (params, "x0", next.x0);
    next.y0 = number (params, "y0", next.y0);
    next.z0 = number (params, "z0", next.z0);
    next.root = text (params, "root", "C").toStdString();
    next.scale = text (params, "scale", "pentatonic-minor").toStdString();
    readLobe (next.lobeA, params, "lobeA");
    readLobe (next.lobeB, params, "lobeB");
    next.quantize = flag (params, "quantize", next.quantize);
    next.grid = text (params, "grid", "1/8").toStdString();
    next.bpm = number (params, "bpm", next.bpm);
    next.timingInfluence = number (params, "timingInfluence", next.timingInfluence);
    next.densityMode = text (params, "densityMode", "all").toStdString();
    next.nth = std::max (1, integer (params, "nth", next.nth));
    next.probability = number (params, "probability", next.probability);
    next.velocityThreshold = number (params, "velocityThreshold", next.velocityThreshold);
    next.customMetric = text (params, "customMetric", "distance").toStdString();
    next.customThreshold = number (params, "customThreshold", next.customThreshold);
    next.zThreshold = number (params, "zThreshold", next.zThreshold);
    next.voice1.enabled = flag (params, "voice1Enable", next.voice1.enabled);
    next.voice2.enabled = flag (params, "voice2Enable", next.voice2.enabled);
    next.voice3.enabled = flag (params, "voice3Enable", next.voice3.enabled);
    next.voice1.channel = std::clamp (integer (params, "midiChannel1", next.voice1.channel), 1, 16);
    next.voice2.channel = std::clamp (integer (params, "midiChannel2", next.voice2.channel), 1, 16);
    next.voice3.channel = std::clamp (integer (params, "midiChannel3", next.voice3.channel), 1, 16);
    next.modulatePan = number (params, "modulatePan", next.modulatePan);
    return next;
}

void LorenzAudioProcessor::pushPresetFromUi (const juce::var& payload)
{
    if (! payload.isObject())
        return;
    const bool restart = flag (payload, "restart", false);
    const auto preset = payload.getProperty ("preset", {});
    if (! preset.isObject())
        return;

    const auto json = juce::JSON::toString (preset);
    const auto next = configFromPreset (preset);
    const std::lock_guard<std::mutex> lock (mutex);
    presetJson = json;
    config = next;
    mode = restart ? ApplyMode::restartHere : ApplyMode::live;
    ++revision;
}

juce::String LorenzAudioProcessor::getPresetJson() const
{
    const std::lock_guard<std::mutex> lock (mutex);
    return presetJson;
}

int LorenzAudioProcessor::getStateEpoch() const
{
    const std::lock_guard<std::mutex> lock (mutex);
    return stateEpoch;
}

LorenzAudioProcessor::Viz LorenzAudioProcessor::takeViz()
{
    const std::lock_guard<std::mutex> lock (vizMutex);
    Viz out = std::move (viz);
    viz = {};
    viz.noteCount = out.noteCount;
    viz.eventCount = out.eventCount;
    viz.bpm = out.bpm;
    viz.sequenceTime = out.sequenceTime;
    viz.t = out.t;
    viz.x = out.x;
    viz.y = out.y;
    viz.z = out.z;
    viz.playing = out.playing;
    return out;
}

void LorenzAudioProcessor::getStateInformation (juce::MemoryBlock& destData)
{
    const auto json = getPresetJson();
    destData.replaceAll (json.toRawUTF8(), json.getNumBytesAsUTF8());
}

void LorenzAudioProcessor::setStateInformation (const void* data, int sizeInBytes)
{
    const auto json = juce::String::fromUTF8 (static_cast<const char*> (data), sizeInBytes);
    const auto parsed = juce::JSON::parse (json);
    if (! parsed.isObject())
        return;
    const auto next = configFromPreset (parsed);
    const std::lock_guard<std::mutex> lock (mutex);
    presetJson = json;
    config = next;
    mode = ApplyMode::replaceState;
    ++revision;
    ++stateEpoch;
}

void LorenzAudioProcessor::addAllNotesOff (juce::MidiBuffer& midi)
{
    for (int channel = 1; channel <= 16; ++channel)
    {
        for (int note = 0; note < 128; ++note)
        {
            if (! held[channel - 1][note])
                continue;
            midi.addEvent (juce::MidiMessage::noteOff (channel, note), 0);
            held[channel - 1][note] = false;
        }
        midi.addEvent (juce::MidiMessage::allNotesOff (channel), 0);
        midi.addEvent (juce::MidiMessage::allSoundOff (channel), 0);
        lastPan[channel - 1] = -1;
    }
}

void LorenzAudioProcessor::processBlock (juce::AudioBuffer<float>& buffer, juce::MidiBuffer& midi)
{
    midi.clear();
    buffer.clear();
    const int numSamples = buffer.getNumSamples();
    const double sampleRate = getSampleRate();
    if (numSamples <= 0 || sampleRate <= 0)
        return;

    lorenz::Config blockConfig;
    ApplyMode blockMode = ApplyMode::live;
    int blockRevision = appliedRevision;
    {
        const std::lock_guard<std::mutex> lock (mutex);
        blockConfig = config;
        blockMode = mode;
        blockRevision = revision;
        mode = ApplyMode::live;
    }

    double playhead = 0;
    double bpm = blockConfig.bpm;
    bool playing = false;
    if (auto* head = getPlayHead())
    {
        if (const auto position = head->getPosition())
        {
            playing = position->getIsPlaying();
            if (const auto hostBpm = position->getBpm())
                bpm = *hostBpm > 0 ? *hostBpm : bpm;
            if (const auto seconds = position->getTimeInSeconds())
                playhead = *seconds;
            else if (const auto ppq = position->getPpqPosition())
                playhead = *ppq * 60.0 / std::max (1.0, bpm);
        }
    }
    blockConfig.bpm = bpm;

    if (blockRevision != appliedRevision)
    {
        if (blockMode == ApplyMode::restartHere)
            origin = playhead;
        else if (blockMode == ApplyMode::replaceState)
            origin = 0;

        const bool reset = blockMode != ApplyMode::live;
        engine.setConfig (blockConfig, reset);
        if (reset)
        {
            addAllNotesOff (midi);
            noteCount = 0;
            engine.beginSeek (blockMode == ApplyMode::restartHere ? 0.0 : std::max (0.0, playhead - origin));
            const std::lock_guard<std::mutex> lock (vizMutex);
            viz.cleared = true;
            viz.noteCount = 0;
            viz.eventCount = 0;
            viz.points.clear();
            viz.notes.clear();
        }
        appliedRevision = blockRevision;
    }
    else
    {
        engine.setBpm (bpm);
    }

    const double blockSeconds = static_cast<double> (numSamples) / sampleRate;
    const double sequenceStart = std::max (0.0, playhead - origin);
    const auto discontinuous = [&] ()
    {
        const double target = engine.chasing() ? engine.chaseTarget() : engine.cursor();
        const double gap = sequenceStart - target;
        // A normal callback is continuous. Anything further back is a loop or
        // scrub, and anything more than a few blocks ahead is a seek. Falling
        // a little behind the playhead just keeps rendering; re-seeking there
        // would restart a long chase forever.
        const double forwardSlack = std::max (0.25, blockSeconds * 4.0);
        return gap < -1.0e-3 || gap > forwardSlack;
    };

    if (! playing)
    {
        if (wasPlaying)
            addAllNotesOff (midi);
        wasPlaying = false;
        if (discontinuous())
            engine.beginSeek (sequenceStart);
        const std::lock_guard<std::mutex> lock (vizMutex);
        viz.playing = false;
        viz.bpm = bpm;
        viz.sequenceTime = sequenceStart;
        return;
    }

    wasPlaying = true;
    if (discontinuous())
    {
        addAllNotesOff (midi);
        engine.beginSeek (sequenceStart);
        const std::lock_guard<std::mutex> lock (vizMutex);
        viz.cleared = true;
        viz.points.clear();
    }

    const double blockEnd = sequenceStart + static_cast<double> (numSamples) / sampleRate;
    std::vector<lorenz::MidiEvent> events;
    std::vector<lorenz::Point> points;
    engine.renderTo (blockEnd, 8000, events, points);

    for (const auto& event : events)
    {
        if (event.time < sequenceStart - 0.02)
            continue;
        const int offset = std::clamp (static_cast<int> (std::lround ((event.time - sequenceStart) * sampleRate)), 0, numSamples - 1);
        const int channel = std::clamp (event.channel, 1, 16);
        const int note = std::clamp (event.midi, 0, 127);
        if (event.kind == lorenz::MidiEvent::Kind::noteOn)
        {
            const int pan = std::clamp (static_cast<int> (std::lround ((event.pan + 1.0) * 63.5)), 0, 127);
            if (pan != lastPan[channel - 1])
            {
                midi.addEvent (juce::MidiMessage::controllerEvent (channel, 10, pan), offset);
                lastPan[channel - 1] = pan;
            }
            midi.addEvent (juce::MidiMessage::noteOn (channel, note, static_cast<juce::uint8> (event.velocity)), offset);
            held[channel - 1][note] = true;
            ++noteCount;
        }
        else
        {
            midi.addEvent (juce::MidiMessage::noteOff (channel, note), offset);
            held[channel - 1][note] = false;
        }
    }

    const std::lock_guard<std::mutex> lock (vizMutex);
    viz.playing = true;
    viz.bpm = bpm;
    viz.sequenceTime = blockEnd;
    viz.noteCount = noteCount;
    if (engine.hasLatest())
    {
        viz.t = engine.latest().t;
        viz.x = engine.latest().x;
        viz.y = engine.latest().y;
        viz.z = engine.latest().z;
    }
    viz.points.insert (viz.points.end(), points.begin(), points.end());
    constexpr size_t maxTrail = 4500;
    if (viz.points.size() > maxTrail)
        viz.points.erase (viz.points.begin(), viz.points.begin() + static_cast<std::ptrdiff_t> (viz.points.size() - maxTrail));
    for (const auto& event : events)
    {
        if (event.kind != lorenz::MidiEvent::Kind::noteOn)
            continue;
        viz.eventCount = std::max (viz.eventCount, event.eventId);
        viz.notes.push_back (event);
        if (viz.notes.size() > 48)
            viz.notes.erase (viz.notes.begin());
    }
}

juce::AudioProcessorEditor* LorenzAudioProcessor::createEditor()
{
    return new LorenzAudioProcessorEditor (*this);
}

juce::AudioProcessor* JUCE_CALLTYPE createPluginFilter()
{
    return new LorenzAudioProcessor();
}
