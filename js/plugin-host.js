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

  backend.addEventListener("state", applyState);
  backend.addEventListener("frame", (frame) => {
    if (!frame || typeof frame !== "object")
      return;
    if (frame.cleared) {
      visualizer.reset();
      const body = document.getElementById("debugBody");
      if (body)
        body.innerHTML = "";
    }
    if (Array.isArray(frame.points)) {
      for (const point of frame.points)
        visualizer.addPoint({ x: point[0], y: point[1], z: point[2], t: point[3] });
    }
    if (Array.isArray(frame.notes)) {
      for (const note of frame.notes) {
        visualizer.addNote(note, note.when);
        visualizer.addEvent(note.chaos);
        pushDebug(note);
        setReadout(
          `${note.noteName}  vel ${note.velocity.toFixed(2)}  ${Math.round(note.duration * 1000)}ms  lobe ${note.lobe}  ${note.direction ?? ""}  ${note.voiceName}`,
        );
      }
    }
    if (frame.t != null) {
      visualizer.setPlayback(frame.t);
      hudFrom({ x: frame.x, y: frame.y, z: frame.z, t: frame.t });
    }
    visualizer.draw(frame.sequenceTime ?? 0);
    if (frame.playing === false && (!frame.notes || frame.notes.length === 0))
      setReadout("waiting for host play");
    if (frame.bpm != null && !applying) {
      const bpm = document.getElementById("bpm");
      const out = document.getElementById("bpmOut");
      if (bpm && Number(bpm.value) !== Number(frame.bpm)) {
        applying = true;
        bpm.value = String(Math.round(frame.bpm));
        if (out)
          out.textContent = String(Math.round(frame.bpm));
        refreshRangeOutputs();
        applying = false;
      }
    }
    const notes = document.getElementById("hudNotes");
    const events = document.getElementById("hudEvents");
    if (notes && frame.noteCount != null)
      notes.textContent = String(frame.noteCount);
    if (events && frame.eventCount != null)
      events.textContent = String(frame.eventCount);
  });

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
