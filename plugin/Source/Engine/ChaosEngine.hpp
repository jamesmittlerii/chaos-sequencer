// Lorenz MIDI effect
// Copyright (C) 2026 James Mittler II
// SPDX-License-Identifier: AGPL-3.0-or-later

#pragma once

#include <cstdint>
#include <string>
#include <vector>

namespace lorenz {

struct LobeConfig {
    int octaveOffset = 0;
    double velocityScale = 1;
    double durationScale = 1;
    double pan = 0;
    double filter = 1800;
    std::string scale;
    std::string weights = "even";
};

struct VoiceConfig {
    bool enabled = false;
    int channel = 1;
};

/** Musical setup. Mirrors a website preset, minus the synth. */
struct Config {
    std::string systemId = "lorenz";
    double sigma = 10, rho = 28, beta = 8.0 / 3.0;
    double alpha = 15.6, m0 = -1.143, m1 = -0.714;
    double a = 0.2, b = 0.2, c = 5.7, d = 3.5, e = 0.25, f = 0.1;
    double gamma = 0.87;
    double dt = 0.01;
    double speed = 2.6;
    double x0 = 0.1, y0 = 0, z0 = 0;
    std::string root = "C";
    std::string scale = "pentatonic-minor";
    LobeConfig lobeA {};
    LobeConfig lobeB {};
    bool quantize = false;
    std::string grid = "1/8";
    double bpm = 92;
    double timingInfluence = 0;
    std::string densityMode = "all";
    int nth = 1;
    double probability = 1;
    double velocityThreshold = 0;
    std::string customMetric = "distance";
    double customThreshold = 0;
    double zThreshold = 25;
    VoiceConfig voice1 { true, 1 };
    VoiceConfig voice2 { false, 2 };
    VoiceConfig voice3 { false, 10 };
    double modulatePan = 0;

    static Config websiteDefault();
};

struct Point {
    double x = 0, y = 0, z = 0, t = 0;
};

struct MidiEvent {
    enum class Kind { noteOn, noteOff };
    Kind kind = Kind::noteOn;
    double time = 0;
    int channel = 1;
    int midi = 0;
    int velocity = 0;
    double duration = 0;
    double pan = 0;
    std::string voiceId;
    std::string voiceName;
    std::string noteName;
    std::string lobe;
    std::string direction;
    int eventId = 0;
    double timestamp = 0;
    double x = 0, y = 0, z = 0, chaosVelocity = 0;
};

/**
 * Clock-agnostic chaotic sequencer.
 *
 * Audio time 0 is the sequence origin. renderTo() advances through that
 * clock and appends note events. beginSeek() resimulates from the seed
 * without emitting, which is how a transport jump stays deterministic.
 */
class ChaosEngine {
public:
    void setConfig (const Config& config, bool reset);
    void setBpm (double bpm) { config_.bpm = bpm; }
    void beginSeek (double audioTime);
    bool renderTo (double endAudio, int maxSteps, std::vector<MidiEvent>& midi, std::vector<Point>& points);

    double cursor() const { return cursor_; }
    bool chasing() const { return chasing_; }
    double chaseTarget() const { return chaseTarget_; }
    const Point& latest() const { return latest_; }
    bool hasLatest() const { return hasLatest_; }

private:
    struct State {
        double x = 0, y = 0, z = 0, t = 0, dx = 0, dy = 0, dz = 0;
        double velocity = 0, distance = 0;
    };

    struct ChaosEvent {
        int id = 0;
        std::string type;
        double timestamp = 0;
        double x = 0, y = 0, z = 0, velocity = 0, distance = 0;
        std::string direction;
        std::string lobe;
    };

    struct Note {
        double time = 0;
        double duration = 0;
        int midi = 0;
        double velocity = 0;
        double pan = 0;
        std::string voiceId, voiceName, noteName, lobe, direction;
        int eventId = 0;
        double timestamp = 0;
        double x = 0, y = 0, z = 0, chaosVelocity = 0;
    };

    struct Pending {
        MidiEvent::Kind kind;
        double time = 0;
        Note note;
    };

    void resetTrajectory();
    void rebuildVoices();
    bool advance (double endAudio, bool emit, int& stepsLeft, std::vector<Point>& points);
    State derivative (double x, double y, double z) const;
    State step();
    void pushAnalyzer (const State& state, bool emit, std::vector<ChaosEvent>& out);
    bool accept (int voiceIndex, const ChaosEvent& event);
    Note mapNote (int voiceIndex, const ChaosEvent& event) const;
    void queueNote (const Note& note, double timestamp);
    bool claimSlot (const std::string& voiceId, double audioTime);
    double simulationToAudio (double simulationT) const;
    double schedule (double simulationT) const;

    Config config_ {};
    State state_ {};
    double x0_ = 0.1, y0_ = 0, z0_ = 0, dt_ = 0.01;
    bool hasPrev_ = false;
    State prev_ {};
    int eventCount_ = 0;
    double lastEventTime_ = 0;
    bool hasLastEvent_ = false;
    double lastByType_[16] {};
    bool hasLastByType_[16] {};

    struct VoiceRuntime {
        std::string id;
        std::string name;
        bool enabled = false;
        int channel = 1;
        std::vector<std::string> eventTypes;
        int octaveLo = 2, octaveHi = 4;
        double durationLo = 0.18, durationHi = 0.72;
        int count = 0;
        uint32_t rng = 1;
    };

    std::vector<VoiceRuntime> voices_;
    std::vector<Pending> pending_;
    std::vector<std::string> slots_;
    double cursor_ = 0;
    bool chasing_ = false;
    double chaseTarget_ = 0;
    Point latest_ {};
    bool hasLatest_ = false;
};

} // namespace lorenz
