// Lorenz MIDI effect
// Copyright (C) 2026 James Mittler II
// SPDX-License-Identifier: AGPL-3.0-or-later

#include "Engine/ChaosEngine.hpp"

#include <algorithm>
#include <cmath>
#include <fstream>
#include <iomanip>
#include <iostream>
#include <sstream>
#include <string>
#include <vector>

namespace {

struct Row {
    double time = 0;
    int midi = 0;
    double velocity = 0;
    double duration = 0;
    std::string voice;
};

std::vector<Row> loadFixture (const std::string& path)
{
    std::ifstream in (path);
    if (! in)
        throw std::runtime_error ("cannot open " + path);
    std::string line;
    std::getline (in, line);
    std::vector<Row> rows;
    while (std::getline (in, line))
    {
        if (line.empty())
            continue;
        std::replace (line.begin(), line.end(), ',', ' ');
        std::stringstream ss (line);
        Row row;
        ss >> row.time >> row.midi >> row.velocity >> row.duration >> row.voice;
        rows.push_back (row);
    }
    return rows;
}

std::vector<lorenz::MidiEvent> noteOns (const std::vector<lorenz::MidiEvent>& events)
{
    std::vector<lorenz::MidiEvent> ons;
    for (const auto& event : events)
        if (event.kind == lorenz::MidiEvent::Kind::noteOn)
            ons.push_back (event);
    return ons;
}

} // namespace

int main (int argc, char** argv)
{
    const std::string path = argc > 1 ? argv[1] : LORENZ_FIXTURE;
    const auto fixture = loadFixture (path);

    lorenz::ChaosEngine engine;
    engine.setConfig (lorenz::Config::websiteDefault(), true);
    std::vector<lorenz::MidiEvent> midi;
    std::vector<lorenz::Point> points;
    if (! engine.renderTo (16.0, 2000000, midi, points))
    {
        std::cerr << "render did not catch up\n";
        return 1;
    }
    if (points.size() < 4000)
    {
        std::cerr << "trail has " << points.size() << " points; the curve would draw as chords\n";
        return 1;
    }
    const auto ons = noteOns (midi);
    if (ons.size() != fixture.size())
    {
        std::cerr << "note count " << ons.size() << " != fixture " << fixture.size() << "\n";
        const auto n = std::min (ons.size(), fixture.size());
        for (size_t i = 0; i < std::min<size_t> (n, 8); ++i)
            std::cerr << "  cpp " << ons[i].time << " midi " << ons[i].midi
                      << "  js " << fixture[i].time << " midi " << fixture[i].midi << "\n";
        return 1;
    }

    for (size_t i = 0; i < ons.size(); ++i)
    {
        const auto& got = ons[i];
        const auto& want = fixture[i];
        const int wantVelocity = std::clamp (static_cast<int> (std::lround (want.velocity * 127.0)), 1, 127);
        if (got.midi != want.midi || got.voiceId != want.voice || got.velocity != wantVelocity
            || std::abs (got.time - want.time) > 1e-4
            || std::abs (got.duration - want.duration) > 1e-3)
        {
            std::cerr << std::setprecision(12)
                      << "mismatch at " << i
                      << " dt=" << (got.time - want.time)
                      << " ddur=" << (got.duration - want.duration)
                      << " cppVel=" << got.velocity << " wantVel=" << wantVelocity
                      << " voice '" << got.voiceId << "' vs '" << want.voice << "'\n";
            return 1;
        }
    }

    lorenz::ChaosEngine chased;
    chased.setConfig (lorenz::Config::websiteDefault(), true);
    chased.beginSeek (8.0);
    std::vector<lorenz::MidiEvent> tailMidi;
    std::vector<lorenz::Point> tailPoints;
    if (! chased.renderTo (16.0, 2000000, tailMidi, tailPoints))
    {
        std::cerr << "seek render did not catch up\n";
        return 1;
    }
    const auto tail = noteOns (tailMidi);
    std::vector<lorenz::MidiEvent> directTail;
    for (const auto& event : ons)
        if (event.time >= 8.0)
            directTail.push_back (event);
    if (tail.size() != directTail.size())
    {
        std::cerr << "seek note count " << tail.size() << " != " << directTail.size() << "\n";
        return 1;
    }
    for (size_t i = 0; i < tail.size(); ++i)
    {
        if (tail[i].midi != directTail[i].midi || std::abs (tail[i].time - directTail[i].time) > 1e-4)
        {
            std::cerr << "seek mismatch at " << i << "\n";
            return 1;
        }
    }

    std::cout << "engine fixture ok (" << ons.size() << " notes)\n";
    return 0;
}
