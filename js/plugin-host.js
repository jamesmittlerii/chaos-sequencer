/**
 * Plugin view. The native processor owns the sequencer; this page
 * only mirrors controls, the attractor, and the diagnostic log.
 */

export function installPluginHost({
  backend,
  visualizer,
  capture,
  adopt,
  setReadout,
  hudFrom,
  pushDebug,
  refreshRangeOutputs,
  num,
}) {
  document.body.classList.add("plugin-host");
  setReadout("waiting for host play");

  let applying = false;

  const applyState = (payload) => {
    const text = typeof payload === "string" ? payload : JSON.stringify(payload);
    let preset;
    try {
      preset = JSON.parse(text);
    } catch {
      return;
    }
    applying = true;
    adopt(preset, { writeUrl: false, echo: false });
    applying = false;
  };

  const initial = window.__JUCE__?.initialisationData?.presetJson?.[0];
  if (initial)
    applyState(initial);

  const clearHostTrail = () => {
    visualizer.reset();
    const body = document.getElementById("debugBody");
    if (body)
      body.innerHTML = "";
  };

  const applyPoints = (points) => {
    if (!Array.isArray(points))
      return;
    for (const point of points)
      visualizer.addPoint({ x: point[0], y: point[1], z: point[2], t: point[3] });
  };

  const applyNotes = (notes) => {
    if (!Array.isArray(notes))
      return;
    for (const note of notes) {
      visualizer.addNote(note, note.when);
      visualizer.addEvent(note.chaos);
      pushDebug(note);
      setReadout(
        `${note.noteName}  vel ${note.velocity.toFixed(2)}  ${Math.round(note.duration * 1000)}ms  lobe ${note.lobe}  ${note.direction ?? ""}  ${note.voiceName}`,
      );
    }
  };

  const applyPlayback = (frame) => {
    if (frame.t == null)
      return;
    visualizer.setPlayback(frame.t);
    hudFrom({ x: frame.x, y: frame.y, z: frame.z, t: frame.t });
  };

  const applyTransport = (frame) => {
    if (frame.playing === false && (!frame.notes || frame.notes.length === 0))
      setReadout("waiting for host play");
  };

  const applyBpm = (frame) => {
    if (frame.bpm == null || applying)
      return;
    const bpm = document.getElementById("bpm");
    const out = document.getElementById("bpmOut");
    if (!bpm || Number(bpm.value) === Number(frame.bpm))
      return;
    applying = true;
    const rounded = String(Math.round(frame.bpm));
    bpm.value = rounded;
    if (out)
      out.textContent = rounded;
    refreshRangeOutputs();
    applying = false;
  };

  const applyCounts = (frame) => {
    const notes = document.getElementById("hudNotes");
    const events = document.getElementById("hudEvents");
    if (notes && frame.noteCount != null)
      notes.textContent = String(frame.noteCount);
    if (events && frame.eventCount != null)
      events.textContent = String(frame.eventCount);
  };

  const applyFrame = (frame) => {
    if (!frame || typeof frame !== "object")
      return;
    if (frame.cleared)
      clearHostTrail();
    applyPoints(frame.points);
    applyNotes(frame.notes);
    applyPlayback(frame);
    visualizer.draw(frame.sequenceTime ?? 0);
    applyTransport(frame);
    applyBpm(frame);
    applyCounts(frame);
  };

  backend.addEventListener("state", applyState);
  backend.addEventListener("frame", applyFrame);

  backend.emitEvent("ready", {});
  requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));

  return {
    publish(restart) {
      if (applying)
        return;
      backend.emitEvent("preset", { restart: Boolean(restart), preset: capture() });
    },
    ignoredNum: num,
  };
}
