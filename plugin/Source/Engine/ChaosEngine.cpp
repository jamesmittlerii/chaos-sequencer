// Lorenz MIDI effect
// Copyright (C) 2026 James Mittler II
// SPDX-License-Identifier: AGPL-3.0-or-later

#include "ChaosEngine.hpp"

#include <algorithm>
#include <cmath>
#include <cstdio>
#include <unordered_map>

namespace lorenz {
namespace {

constexpr double kPi = 3.14159265358979323846;

double clamp (double v, double lo, double hi)
{
    return std::min (hi, std::max (lo, v));
}

double normalize (double value, double lo, double hi)
{
    if (hi == lo)
        return 0.5;
    return clamp ((value - lo) / (hi - lo), 0.0, 1.0);
}

double hypot3 (double x, double y, double z)
{
    return std::hypot (x, std::hypot (y, z));
}

uint32_t imul (uint32_t a, uint32_t b)
{
    return static_cast<uint32_t> (static_cast<int32_t> (a) * static_cast<int32_t> (b));
}

uint32_t hashString (const std::string& text)
{
    uint32_t h = 2166136261u;
    for (unsigned char c : text)
    {
        h ^= c;
        h = imul (h, 16777619u);
    }
    return h;
}

uint32_t hashSeed (double x, double y, double z)
{
    const double s = std::floor (x * 1e6) * 374761393.0
                   + std::floor (y * 1e6) * 668265263.0
                   + std::floor (z * 1e6) * 1274126177.0;
    double m = std::fmod (s, 4294967296.0);
    if (m < 0)
        m += 4294967296.0;
    return static_cast<uint32_t> (m);
}

uint32_t rngNext (uint32_t& a)
{
    a += 0x6d2b79f5u;
    uint32_t t = imul (a ^ (a >> 15), 1u | a);
    t = (t + imul (t ^ (t >> 7), 61u | t)) ^ t;
    return t ^ (t >> 14);
}

int noteIndex (const std::string& name)
{
    static const char* names[] = { "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B" };
    for (int i = 0; i < 12; ++i)
        if (name == names[i])
            return i;
    return 0;
}

std::string midiName (int midi)
{
    static const char* names[] = { "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B" };
    const int n = ((midi % 12) + 12) % 12;
    const int oct = midi / 12 - 1;
    return std::string (names[n]) + std::to_string (oct);
}

const std::vector<int>& scaleIntervals (const std::string& name)
{
    static const std::unordered_map<std::string, std::vector<int>> scales = {
        { "chromatic", { 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11 } },
        { "major", { 0, 2, 4, 5, 7, 9, 11 } },
        { "minor", { 0, 2, 3, 5, 7, 8, 10 } },
        { "pentatonic-major", { 0, 2, 4, 7, 9 } },
        { "pentatonic-minor", { 0, 3, 5, 7, 10 } },
        { "whole-tone", { 0, 2, 4, 6, 8, 10 } },
    };
    const auto it = scales.find (name);
    if (it == scales.end())
        return scales.at ("pentatonic-minor");
    return it->second;
}

std::vector<int> degreeWeights (const std::string& kind, const std::string& scaleName)
{
    const auto& scale = scaleIntervals (scaleName);
    std::vector<int> weights (scale.size(), 1);
    if (kind == "tonic")
    {
        const int mid = static_cast<int> (scale.size() / 2);
        for (size_t i = 0; i < weights.size(); ++i)
            weights[i] = (static_cast<int> (i) == 0 || static_cast<int> (i) == mid) ? 3 : 1;
    }
    else if (kind == "color")
    {
        for (size_t i = 0; i < weights.size(); ++i)
            weights[i] = i == 0 ? 1 : 2;
    }
    return weights;
}

struct Bounds { double x0, x1, y0, y1, z0, z1, v0, v1, d0, d1; };

struct SystemDef {
    const char* id;
    double x, y, z, dt, warmup, zThreshold, xCenter;
    Bounds bounds;
};

const SystemDef& systemDef (const std::string& id)
{
    static const SystemDef systems[] = {
        { "lorenz", 0.1, 0, 0, 0.01, 0, 25, 0, { -20, 20, -27, 27, 1, 48, 8, 90, 10, 48 } },
        { "chua", 0.1, 0.1, 0.1, 0.005, 5, 0, 0, { -2.5, 2.5, -0.5, 0.5, -4, 4, 0.8, 12, 0.3, 4.5 } },
        { "rossler", 1, 1, 1, 0.01, 0, 0.5, 0, { -10, 12, -12, 9, 0, 22, 2, 60, 2, 22 } },
        { "thomas", 1, 0, 0, 0.02, 30, 1, 0, { -1.5, 4.2, -1.5, 4.2, -1.5, 4.2, 0.05, 1.7, 1, 5 } },
        { "aizawa", 0.1, 0, 0, 0.01, 0, 0.75, 0, { -1.6, 1.6, -1.6, 1.6, -0.5, 2, 0.7, 6, 0.1, 2.1 } },
        { "halvorsen", -5, 0, 0, 0.002, 0, -2, 0, { -14, 7, -14, 7, -14, 7, 8, 120, 4, 17 } },
        { "rabinovich", -1, 0, 0.5, 0.001, 236, 0.5, -1.1, { -2, 0, -0.5, 2.6, 0, 1.5, 0.3, 4.7, 1, 2.8 } },
    };
    for (const auto& system : systems)
        if (id == system.id)
            return system;
    return systems[0];
}

int typeIndex (const std::string& type)
{
    static const char* types[] = {
        "x-crossing", "y-crossing", "x-max", "x-min", "y-max", "y-min", "z-max", "z-min", "z-threshold"
    };
    for (int i = 0; i < 9; ++i)
        if (type == types[i])
            return i;
    return 0;
}

double gridDivision (const std::string& grid)
{
    if (grid == "1/4") return 1;
    if (grid == "1/16") return 0.25;
    if (grid == "triplets") return 1.0 / 3.0;
    return 0.5;
}

} // namespace

Config Config::websiteDefault()
{
    Config config;
    config.lobeA.octaveOffset = 0;
    config.lobeA.velocityScale = 0.85;
    config.lobeA.durationScale = 1.2;
    config.lobeA.pan = -0.35;
    config.lobeA.filter = 900;
    config.lobeA.weights = "tonic";
    config.lobeB.octaveOffset = 1;
    config.lobeB.velocityScale = 1.15;
    config.lobeB.durationScale = 0.8;
    config.lobeB.pan = 0.35;
    config.lobeB.filter = 2400;
    config.lobeB.weights = "even";
    return config;
}

void ChaosEngine::setConfig (const Config& config, bool reset)
{
    const bool systemChanged = config.systemId != config_.systemId;
    config_ = config;
    const auto& system = systemDef (config_.systemId);
    if (config_.dt <= 0)
        config_.dt = system.dt;
    dt_ = config_.dt;
    x0_ = config_.x0;
    y0_ = config_.y0;
    z0_ = config_.z0;
    rebuildVoices();
    if (reset || systemChanged || ! hasPrev_)
        resetTrajectory();
}

void ChaosEngine::rebuildVoices()
{
    const uint32_t seed = hashSeed (config_.x0, config_.y0, config_.z0);
    voices_.clear();
    auto add = [&] (const char* id, const char* name, bool enabled, int channel,
                    std::initializer_list<const char*> types, int octLo, int octHi, double dLo, double dHi)
    {
        VoiceRuntime voice;
        voice.id = id;
        voice.name = name;
        voice.enabled = enabled;
        voice.channel = std::clamp (channel, 1, 16);
        for (const char* type : types)
            voice.eventTypes.emplace_back (type);
        voice.octaveLo = octLo;
        voice.octaveHi = octHi;
        voice.durationLo = dLo;
        voice.durationHi = dHi;
        voice.count = 0;
        voice.rng = seed ^ hashString (voice.id);
        voices_.push_back (std::move (voice));
    };
    add ("voice-1", "Bass", config_.voice1.enabled, config_.voice1.channel, { "x-crossing" }, 2, 4, 0.18, 0.72);
    add ("voice-2", "Lead", config_.voice2.enabled, config_.voice2.channel, { "y-max", "y-min" }, 4, 6, 0.06, 0.32);
    add ("voice-3", "Perc", config_.voice3.enabled, config_.voice3.channel, { "z-threshold" }, 3, 5, 0.04, 0.11);
}

void ChaosEngine::resetTrajectory()
{
    const auto& system = systemDef (config_.systemId);
    state_.x = x0_;
    state_.y = y0_;
    state_.z = z0_;
    state_.t = 0;
    const int warmup = static_cast<int> (std::lround ((system.warmup) / dt_));
    for (int i = 0; i < warmup; ++i)
        step();
    state_.t = 0;
    const auto deriv = derivative (state_.x, state_.y, state_.z);
    state_.dx = deriv.dx;
    state_.dy = deriv.dy;
    state_.dz = deriv.dz;
    hasPrev_ = false;
    eventCount_ = 0;
    hasLastEvent_ = false;
    for (int i = 0; i < 16; ++i)
        hasLastByType_[i] = false;
    for (auto& voice : voices_)
    {
        voice.count = 0;
        voice.rng = hashSeed (config_.x0, config_.y0, config_.z0) ^ hashString (voice.id);
    }
    pending_.clear();
    slots_.clear();
    hasLatest_ = false;
}

void ChaosEngine::beginSeek (double audioTime)
{
    if (voices_.empty())
        setConfig (config_, true);
    resetTrajectory();
    chasing_ = true;
    chaseTarget_ = std::max (0.0, audioTime);
    cursor_ = 0;
}

ChaosEngine::State ChaosEngine::derivative (double x, double y, double z) const
{
    const auto& p = config_;
    State d;
    if (p.systemId == "chua")
    {
        const double h = p.m1 * x + 0.5 * (p.m0 - p.m1) * (std::abs (x + 1) - std::abs (x - 1));
        d.dx = p.alpha * (y - x - h);
        d.dy = x - y + z;
        d.dz = -p.beta * y;
    }
    else if (p.systemId == "rossler")
    {
        d.dx = -y - z;
        d.dy = x + p.a * y;
        d.dz = p.b + z * (x - p.c);
    }
    else if (p.systemId == "thomas")
    {
        d.dx = std::sin (y) - p.b * x;
        d.dy = std::sin (z) - p.b * y;
        d.dz = std::sin (x) - p.b * z;
    }
    else if (p.systemId == "aizawa")
    {
        d.dx = (z - p.b) * x - p.d * y;
        d.dy = p.d * x + (z - p.b) * y;
        d.dz = p.c + p.a * z - (z * z * z) / 3.0 - (x * x + y * y) * (1 + p.e * z) + p.f * z * x * x * x;
    }
    else if (p.systemId == "halvorsen")
    {
        d.dx = -p.a * x - 4 * y - 4 * z - y * y;
        d.dy = -p.a * y - 4 * z - 4 * x - z * z;
        d.dz = -p.a * z - 4 * x - 4 * y - x * x;
    }
    else if (p.systemId == "rabinovich")
    {
        d.dx = y * (z - 1 + x * x) + p.gamma * x;
        d.dy = x * (3 * z + 1 - x * x) + p.gamma * y;
        d.dz = -2 * z * (p.alpha + x * y);
    }
    else
    {
        d.dx = p.sigma * (y - x);
        d.dy = x * (p.rho - z) - y;
        d.dz = x * y - p.beta * z;
    }
    return d;
}

ChaosEngine::State ChaosEngine::step()
{
    const double dt = dt_;
    const double x = state_.x, y = state_.y, z = state_.z;
    const auto k1 = derivative (x, y, z);
    const auto k2 = derivative (x + 0.5 * dt * k1.dx, y + 0.5 * dt * k1.dy, z + 0.5 * dt * k1.dz);
    const auto k3 = derivative (x + 0.5 * dt * k2.dx, y + 0.5 * dt * k2.dy, z + 0.5 * dt * k2.dz);
    const auto k4 = derivative (x + dt * k3.dx, y + dt * k3.dy, z + dt * k3.dz);
    state_.x += (dt / 6) * (k1.dx + 2 * k2.dx + 2 * k3.dx + k4.dx);
    state_.y += (dt / 6) * (k1.dy + 2 * k2.dy + 2 * k3.dy + k4.dy);
    state_.z += (dt / 6) * (k1.dz + 2 * k2.dz + 2 * k3.dz + k4.dz);
    state_.t += dt;
    const auto now = derivative (state_.x, state_.y, state_.z);
    state_.dx = now.dx;
    state_.dy = now.dy;
    state_.dz = now.dz;
    return state_;
}

void ChaosEngine::pushAnalyzer (const State& state, bool emit, std::vector<ChaosEvent>& out)
{
    if (! hasPrev_)
    {
        prev_ = state;
        hasPrev_ = true;
        return;
    }

    const double dt = state.t - prev_.t == 0 ? 1e-9 : state.t - prev_.t;
    const double velocity = hypot3 (state.x - prev_.x, state.y - prev_.y, state.z - prev_.z) / dt;
    const double distance = hypot3 (state.x, state.y, state.z);
    State curr = state;
    curr.velocity = velocity;
    curr.distance = distance;
    const double xThreshold = systemDef (config_.systemId).xCenter;

    auto emitEvent = [&] (const std::string& type, const State& sample, const std::string& direction, const std::string& lobe)
    {
        if (! emit)
            return;
        const int index = typeIndex (type);
        ChaosEvent event;
        event.id = ++eventCount_;
        event.type = type;
        event.timestamp = sample.t;
        event.x = sample.x;
        event.y = sample.y;
        event.z = sample.z;
        event.velocity = sample.velocity;
        event.distance = sample.distance;
        event.direction = direction;
        event.lobe = lobe.empty() ? (sample.x < xThreshold ? "A" : "B") : lobe;
        hasLastEvent_ = true;
        lastEventTime_ = sample.t;
        hasLastByType_[index] = true;
        lastByType_[index] = sample.t;
        out.push_back (event);
    };

    auto crossing = [&] (double a, double b, double threshold, char axis, const char* type)
    {
        if (a == threshold && b == threshold)
            return;
        const bool up = a < threshold && b >= threshold;
        const bool down = a > threshold && b <= threshold;
        if (! up && ! down)
            return;
        const double denom = b - a;
        const double frac = denom == 0 ? 0 : (threshold - a) / denom;
        State sample = curr;
        sample.x = prev_.x + (curr.x - prev_.x) * frac;
        sample.y = prev_.y + (curr.y - prev_.y) * frac;
        sample.z = prev_.z + (curr.z - prev_.z) * frac;
        sample.t = prev_.t + (curr.t - prev_.t) * frac;
        sample.velocity = curr.velocity;
        sample.distance = hypot3 (sample.x, sample.y, sample.z);
        if (axis == 'x') sample.x = threshold;
        if (axis == 'y') sample.y = threshold;
        if (axis == 'z') sample.z = threshold;
        const std::string lobe = std::string (type).find ("threshold") != std::string::npos
                                    ? (sample.x < xThreshold ? "A" : "B")
                                    : (up ? "B" : "A");
        emitEvent (type, sample, up ? "up" : "down", lobe);
    };

    crossing (prev_.x, curr.x, xThreshold, 'x', "x-crossing");
    crossing (prev_.y, curr.y, 0, 'y', "y-crossing");

    auto extremum = [&] (double dPrev, double dCurr, char axis)
    {
        if (dPrev == 0 || dCurr == 0)
            return;
        const bool isMax = dPrev > 0 && dCurr < 0;
        const bool isMin = dPrev < 0 && dCurr > 0;
        if (! isMax && ! isMin)
            return;
        std::string type;
        type.push_back (axis);
        type += isMax ? "-max" : "-min";
        emitEvent (type, curr, isMax ? "down" : "up", "");
    };

    extremum (prev_.dx, curr.dx, 'x');
    extremum (prev_.dy, curr.dy, 'y');
    extremum (prev_.dz, curr.dz, 'z');
    crossing (prev_.z, curr.z, config_.zThreshold, 'z', "z-threshold");
    prev_ = curr;
}

bool ChaosEngine::accept (int voiceIndex, const ChaosEvent& event)
{
    auto& voice = voices_[static_cast<size_t> (voiceIndex)];
    if (! voice.enabled)
        return false;
    if (std::find (voice.eventTypes.begin(), voice.eventTypes.end(), event.type) == voice.eventTypes.end())
        return false;
    const int n = ++voice.count;
    if (config_.densityMode == "nth")
        return n % std::max (1, config_.nth) == 0;
    if (config_.densityMode == "probability")
    {
        const uint32_t next = rngNext (voice.rng);
        return (static_cast<double> (next) / 4294967296.0) < clamp (config_.probability, 0.0, 1.0);
    }
    if (config_.densityMode == "velocity-threshold")
        return event.velocity >= config_.velocityThreshold;
    if (config_.densityMode == "custom-threshold")
    {
        double metric = event.distance;
        if (config_.customMetric == "velocity") metric = event.velocity;
        else if (config_.customMetric == "z") metric = event.z;
        else if (config_.customMetric == "y") metric = std::abs (event.y);
        return metric >= config_.customThreshold;
    }
    return true;
}

ChaosEngine::Note ChaosEngine::mapNote (int voiceIndex, const ChaosEvent& event) const
{
    const auto& voice = voices_[static_cast<size_t> (voiceIndex)];
    const auto& system = systemDef (config_.systemId);
    const bool lobeA = event.lobe == "A";
    const auto& lobe = lobeA ? config_.lobeA : config_.lobeB;
    const std::string scaleName = lobe.scale.empty() ? config_.scale : lobe.scale;
    const auto& scale = scaleIntervals (scaleName);
    const auto weights = degreeWeights (lobe.weights, scaleName);
    const double yNorm = normalize (event.y, system.bounds.y0, system.bounds.y1);
    const double zNorm = normalize (event.z, system.bounds.z0, system.bounds.z1);
    const double velNorm = normalize (event.velocity, system.bounds.v0, system.bounds.v1);
    const double distNorm = normalize (event.distance, system.bounds.d0, system.bounds.d1);

    std::vector<int> bag;
    for (size_t i = 0; i < weights.size() && i < scale.size(); ++i)
    {
        const int w = std::max (0, static_cast<int> (std::lround (weights[i] * 4.0)));
        for (int k = 0; k < w; ++k)
            bag.push_back (static_cast<int> (i));
    }
    int degree = 0;
    if (bag.empty())
        degree = std::min (static_cast<int> (scale.size()) - 1, static_cast<int> (std::floor (yNorm * static_cast<double> (scale.size()))));
    else
        degree = bag[static_cast<size_t> (std::min (static_cast<int> (bag.size()) - 1, static_cast<int> (std::floor (yNorm * static_cast<double> (bag.size())))))];
    const int interval = scale[static_cast<size_t> (std::clamp (degree, 0, static_cast<int> (scale.size()) - 1))];

    const int octaves = std::max (0, voice.octaveHi - voice.octaveLo);
    const int register_ = voice.octaveLo + static_cast<int> (std::lround (distNorm * octaves)) + lobe.octaveOffset;
    const int rootMidi = (0 + 1) * 12 + noteIndex (config_.root);
    const int midi = static_cast<int> (clamp (rootMidi + register_ * 12 + interval, 12, 108));
    const double velocityScale = lobe.velocityScale == 0 ? 1 : lobe.velocityScale;
    const double durationScale = lobe.durationScale == 0 ? 1 : lobe.durationScale;
    const double velocity = clamp ((0.15 + zNorm * (0.95 - 0.15)) * velocityScale, 0.01, 1);
    const double duration = clamp ((voice.durationHi - velNorm * (voice.durationHi - voice.durationLo)) * durationScale, 0.03, 4);
    const double xNorm = normalize (event.x, system.bounds.x0, system.bounds.x1);
    const double pan = clamp (clamp (lobe.pan, -1.0, 1.0) + (xNorm * 2 - 1) * config_.modulatePan, -1.0, 1.0);

    Note note;
    note.duration = duration;
    note.midi = midi;
    note.velocity = velocity;
    note.pan = pan;
    note.voiceId = voice.id;
    note.voiceName = voice.name;
    note.noteName = midiName (midi);
    note.lobe = event.lobe;
    note.direction = event.direction;
    note.eventId = event.id;
    note.timestamp = event.timestamp;
    note.x = event.x;
    note.y = event.y;
    note.z = event.z;
    note.chaosVelocity = event.velocity;
    return note;
}

double ChaosEngine::simulationToAudio (double simulationT) const
{
    return simulationT / std::max (0.05, config_.speed);
}

double ChaosEngine::schedule (double simulationT) const
{
    const double chaotic = simulationToAudio (simulationT);
    if (! config_.quantize || config_.timingInfluence <= 0)
        return chaotic;
    const double beat = 60.0 / std::max (20.0, config_.bpm);
    const double grid = beat * gridDivision (config_.grid);
    const double snapped = std::round (chaotic / grid) * grid;
    const double quantized = std::max (0.0, snapped);
    const double influence = clamp (config_.timingInfluence, 0.0, 1.0);
    return chaotic * (1 - influence) + quantized * influence;
}

bool ChaosEngine::claimSlot (const std::string& voiceId, double audioTime)
{
    char buf[96];
    std::snprintf (buf, sizeof (buf), "%s:%.4f", voiceId.c_str(), audioTime);
    const std::string key = buf;
    if (std::find (slots_.begin(), slots_.end(), key) != slots_.end())
        return false;
    slots_.push_back (key);
    if (slots_.size() > 4000)
        slots_.erase (slots_.begin());
    return true;
}

void ChaosEngine::queueNote (const Note& note, double timestamp)
{
    Note queued = note;
    queued.time = schedule (timestamp);
    if (! claimSlot (queued.voiceId, queued.time))
        return;
    pending_.push_back ({ MidiEvent::Kind::noteOn, queued.time, queued });
    pending_.push_back ({ MidiEvent::Kind::noteOff, queued.time + queued.duration, queued });
}

bool ChaosEngine::advance (double endAudio, bool emit, int& stepsLeft, std::vector<Point>& points)
{
    while (simulationToAudio (state_.t) < endAudio)
    {
        if (stepsLeft <= 0)
            return false;
        --stepsLeft;
        const auto state = step();
        if (emit)
        {
            // Every integration step. A 60 Hz sample turns the wings into chords.
            Point point { state.x, state.y, state.z, state.t };
            points.push_back (point);
            latest_ = point;
            hasLatest_ = true;
            std::vector<ChaosEvent> events;
            pushAnalyzer (state, true, events);
            for (const auto& event : events)
            {
                for (int i = 0; i < static_cast<int> (voices_.size()); ++i)
                {
                    if (! accept (i, event))
                        continue;
                    queueNote (mapNote (i, event), event.timestamp);
                }
            }
        }
        else
        {
            std::vector<ChaosEvent> events;
            pushAnalyzer (state, true, events);
            for (const auto& event : events)
                for (int i = 0; i < static_cast<int> (voices_.size()); ++i)
                    accept (i, event);
        }
    }
    return true;
}

bool ChaosEngine::renderTo (double endAudio, int maxSteps, std::vector<MidiEvent>& midi, std::vector<Point>& points)
{
    if (voices_.empty())
        setConfig (config_, true);
    int stepsLeft = std::max (1, maxSteps);
    const double windowStart = cursor_;

    if (chasing_)
    {
        if (! advance (chaseTarget_, false, stepsLeft, points))
            return false;
        chasing_ = false;
        cursor_ = chaseTarget_;
    }

    if (endAudio < cursor_ - 1e-4)
    {
        beginSeek (std::max (0.0, endAudio));
        if (! advance (chaseTarget_, false, stepsLeft, points))
            return false;
        chasing_ = false;
        cursor_ = chaseTarget_;
        return true;
    }

    if (! advance (endAudio, true, stepsLeft, points))
    {
        const double reached = simulationToAudio (state_.t);
        for (auto it = pending_.begin(); it != pending_.end();)
        {
            if (it->time < windowStart)
            {
                it = pending_.erase (it);
                continue;
            }
            if (it->time < reached)
            {
                MidiEvent event;
                event.kind = it->kind;
                event.time = it->time;
                event.channel = 1;
                for (const auto& voice : voices_)
                    if (voice.id == it->note.voiceId)
                        event.channel = voice.channel;
                event.midi = it->note.midi;
                event.velocity = std::clamp (static_cast<int> (std::lround (it->note.velocity * 127.0)), 1, 127);
                event.duration = it->note.duration;
                event.pan = it->note.pan;
                event.voiceId = it->note.voiceId;
                event.voiceName = it->note.voiceName;
                event.noteName = it->note.noteName;
                event.lobe = it->note.lobe;
                event.direction = it->note.direction;
                event.eventId = it->note.eventId;
                event.timestamp = it->note.timestamp;
                event.x = it->note.x;
                event.y = it->note.y;
                event.z = it->note.z;
                event.chaosVelocity = it->note.chaosVelocity;
                midi.push_back (event);
                it = pending_.erase (it);
            }
            else
            {
                ++it;
            }
        }
        cursor_ = reached;
        std::sort (midi.begin(), midi.end(), [] (const MidiEvent& a, const MidiEvent& b)
        {
            if (a.time != b.time)
                return a.time < b.time;
            return a.kind == MidiEvent::Kind::noteOff && b.kind != MidiEvent::Kind::noteOff;
        });
        return false;
    }

    for (auto it = pending_.begin(); it != pending_.end();)
    {
        if (it->time < windowStart)
        {
            it = pending_.erase (it);
            continue;
        }
        if (it->time < endAudio)
        {
            MidiEvent event;
            event.kind = it->kind;
            event.time = it->time;
            event.channel = 1;
            for (const auto& voice : voices_)
                if (voice.id == it->note.voiceId)
                    event.channel = voice.channel;
            event.midi = it->note.midi;
            event.velocity = std::clamp (static_cast<int> (std::lround (it->note.velocity * 127.0)), 1, 127);
            event.duration = it->note.duration;
            event.pan = it->note.pan;
            event.voiceId = it->note.voiceId;
            event.voiceName = it->note.voiceName;
            event.noteName = it->note.noteName;
            event.lobe = it->note.lobe;
            event.direction = it->note.direction;
            event.eventId = it->note.eventId;
            event.timestamp = it->note.timestamp;
            event.x = it->note.x;
            event.y = it->note.y;
            event.z = it->note.z;
            event.chaosVelocity = it->note.chaosVelocity;
            midi.push_back (event);
            it = pending_.erase (it);
        }
        else
        {
            ++it;
        }
    }
    cursor_ = endAudio;
    std::sort (midi.begin(), midi.end(), [] (const MidiEvent& a, const MidiEvent& b)
    {
        if (a.time != b.time)
            return a.time < b.time;
        return a.kind == MidiEvent::Kind::noteOff && b.kind != MidiEvent::Kind::noteOff;
    });
    return true;
}

} // namespace lorenz
