/**
 * Visualizer — chaotic trajectory, event markers, and a note timeline.
 * Driven by recorded samples; playback cursor follows the audio clock.
 */

const LOBE_A = { stroke: "rgba(46, 196, 182, 0.85)", fill: "#2ec4b6" };
const LOBE_B = { stroke: "rgba(255, 107, 53, 0.85)", fill: "#ff6b35" };
const EVENT_COLORS = {
  "x-crossing": "#ffffff",
  "y-crossing": "#c9f0ff",
  "y-max": "#ffe066",
  "y-min": "#ffe066",
  "x-max": "#b197fc",
  "x-min": "#b197fc",
  "z-max": "#ff99c8",
  "z-min": "#ff99c8",
  "z-threshold": "#f72585",
};

const VOICE_COLORS = {
  "voice-1": "#2ec4b6",
  "voice-2": "#ffd166",
  "voice-3": "#f72585",
};

export class Visualizer {
  constructor({ attractor, timeline }) {
    this.attractorCanvas = attractor;
    this.timelineCanvas = timeline;
    this.actx = attractor.getContext("2d");
    this.tctx = timeline.getContext("2d");
    this.projection = "xy";
    this.points = [];
    this.events = [];
    this.notes = [];
    this.maxPoints = 4500;
    this.maxEvents = 120;
    this.maxNotes = 240;
    this.playbackT = 0;
    this.systemLabel = "Lorenz";
    this.viewBounds = { x: [-25, 25], y: [-32, 32], z: [0, 52] };
    this.xCenter = 0;
    this.current = null;
    this.visiblePoints = [];
    this.visibleEvents = [];
    this.viewYaw = 0;
    this.viewPitch = 0;
    this.dragPointer = null;
    this.dpr = 1;
    this._bindRotationControls();
    this._resize();
    window.addEventListener("resize", () => this._resize());
  }

  _bindRotationControls() {
    const canvas = this.attractorCanvas;
    canvas.addEventListener("pointerdown", (event) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      this.dragPointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
      canvas.setPointerCapture(event.pointerId);
      canvas.classList.add("dragging");
    });
    canvas.addEventListener("pointermove", (event) => {
      if (this.dragPointer?.id !== event.pointerId) return;
      const dx = event.clientX - this.dragPointer.x;
      const dy = event.clientY - this.dragPointer.y;
      this.viewYaw += dx * 0.008;
      this.viewPitch += dy * 0.008;
      this.dragPointer.x = event.clientX;
      this.dragPointer.y = event.clientY;
    });
    const stopDragging = (event) => {
      if (this.dragPointer?.id !== event.pointerId) return;
      this.dragPointer = null;
      canvas.classList.remove("dragging");
    };
    canvas.addEventListener("pointerup", stopDragging);
    canvas.addEventListener("pointercancel", stopDragging);
    canvas.addEventListener("lostpointercapture", stopDragging);
    canvas.addEventListener("dblclick", () => {
      this.viewYaw = 0;
      this.viewPitch = 0;
    });
  }

  reset() {
    this.points = [];
    this.events = [];
    this.notes = [];
    this.current = null;
    this.playbackT = 0;
  }

  addPoint(state) {
    this.points.push(state);
    this.current = state;
    if (this.points.length > this.maxPoints) {
      this.points.splice(0, this.points.length - this.maxPoints);
    }
  }

  addEvent(chaos) {
    this.events.push(chaos);
    if (this.events.length > this.maxEvents) this.events.shift();
  }

  addNote(note, audioTime) {
    this.notes.push({ ...note, audioTime });
    if (this.notes.length > this.maxNotes) this.notes.shift();
  }

  setSystem(definition) {
    this.systemLabel = definition.label;
    this.viewBounds = definition.viewBounds;
    this.xCenter = definition.xCenter ?? 0;
  }

  setPlayback(simulationT) {
    this.playbackT = simulationT;
  }

  draw(nowAudio = 0) {
    const cut = this.playbackT;
    this.visiblePoints = this.points.filter((p) => p.t <= cut + 1e-9);
    this.visibleEvents = this.events.filter((e) => e.timestamp <= cut + 1e-9);
    this.current = this.visiblePoints.at(-1) ?? null;
    this._drawAttractor();
    this._drawTimeline(nowAudio);
  }

  _resize() {
    this._fit(this.attractorCanvas);
    this._fit(this.timelineCanvas);
  }

  _fit(canvas) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.dpr = dpr;
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(1, Math.floor(rect.width * dpr));
    const h = Math.max(1, Math.floor(rect.height * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
  }

  _projectPoint(p) {
    const centerX = (this.viewBounds.x[0] + this.viewBounds.x[1]) / 2;
    const centerY = (this.viewBounds.y[0] + this.viewBounds.y[1]) / 2;
    const centerZ = (this.viewBounds.z[0] + this.viewBounds.z[1]) / 2;
    const x = p.x - centerX;
    const y = p.y - centerY;
    const z = p.z - centerZ;
    const pitch = this.viewPitch + (this.projection === "xz" ? -Math.PI / 2 : 0);
    const cosYaw = Math.cos(this.viewYaw);
    const sinYaw = Math.sin(this.viewYaw);
    const cosPitch = Math.cos(pitch);
    const sinPitch = Math.sin(pitch);
    const rotatedX = x * cosYaw + z * sinYaw;
    const rotatedZ = -x * sinYaw + z * cosYaw;
    return {
      x: rotatedX,
      y: y * cosPitch - rotatedZ * sinPitch,
    };
  }

  _projectedBounds() {
    const [xLo, xHi] = this.viewBounds.x;
    const [yLo, yHi] = this.viewBounds.y;
    const [zLo, zHi] = this.viewBounds.z;
    const corners = [];
    for (const x of [xLo, xHi]) {
      for (const y of [yLo, yHi]) {
        for (const z of [zLo, zHi]) corners.push(this._projectPoint({ x, y, z }));
      }
    }
    return {
      x: [Math.min(...corners.map((p) => p.x)), Math.max(...corners.map((p) => p.x))],
      y: [Math.min(...corners.map((p) => p.y)), Math.max(...corners.map((p) => p.y))],
    };
  }

  _mapPoint(p, w, h) {
    const pad = 28 * this.dpr;
    const usableW = w - pad * 2;
    const usableH = h - pad * 2;
    const projected = this._projectPoint(p);
    const [xLo, xHi] = this.renderBounds.x;
    const [yLo, yHi] = this.renderBounds.y;
    const dataX = projected.x - xLo;
    const dataY = yHi - projected.y;
    const rangeW = xHi - xLo;
    const rangeH = yHi - yLo;
    // Uniform scale so tall/narrow canvases (phones) don't stretch the attractor.
    const scale = Math.min(usableW / rangeW, usableH / rangeH);
    const drawnW = rangeW * scale;
    const drawnH = rangeH * scale;
    const ox = pad + (usableW - drawnW) / 2;
    const oy = pad + (usableH - drawnH) / 2;
    return {
      x: ox + dataX * scale,
      y: oy + dataY * scale,
    };
  }

  _drawPresetCenterLine(ctx, w, h) {
    if (Math.abs(this.viewYaw) >= 1e-9 || Math.abs(this.viewPitch) >= 1e-9) return;
    const origin = this._mapPoint({ x: this.xCenter, y: 0, z: 0 }, w, h);
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = this.dpr;
    ctx.beginPath();
    ctx.moveTo(origin.x, 0);
    ctx.lineTo(origin.x, h);
    ctx.stroke();
  }

  _drawTrajectory(ctx, w, h) {
    const pts = this.visiblePoints;
    if (pts.length <= 1) return;
    ctx.lineWidth = 1.15 * this.dpr;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    let i = 1;
    while (i < pts.length) {
      const negative = pts[i].x < this.xCenter;
      const lobe = negative ? LOBE_A : LOBE_B;
      const alpha = 0.14 + 0.72 * (i / pts.length);
      ctx.strokeStyle = lobe.stroke.replace("0.85", alpha.toFixed(3));
      ctx.beginPath();
      const start = this._mapPoint(pts[i - 1], w, h);
      ctx.moveTo(start.x, start.y);
      while (i < pts.length && (pts[i].x < this.xCenter) === negative) {
        const p = this._mapPoint(pts[i], w, h);
        ctx.lineTo(p.x, p.y);
        i++;
      }
      ctx.stroke();
    }
  }

  _drawAttractorEvents(ctx, w, h) {
    for (const ev of this.visibleEvents) {
      const { x, y } = this._mapPoint(ev, w, h);
      ctx.beginPath();
      ctx.arc(x, y, 4.5 * this.dpr, 0, Math.PI * 2);
      ctx.strokeStyle = EVENT_COLORS[ev.type] ?? "#fff";
      ctx.lineWidth = 1.4 * this.dpr;
      ctx.stroke();
    }
  }

  _drawCurrentPoint(ctx, w, h) {
    if (!this.current) return;
    const { x, y } = this._mapPoint(this.current, w, h);
    const lobe = this.current.x < this.xCenter ? LOBE_A : LOBE_B;
    ctx.beginPath();
    ctx.arc(x, y, 10 * this.dpr, 0, Math.PI * 2);
    ctx.fillStyle = lobe.fill + "33";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, y, 3.6 * this.dpr, 0, Math.PI * 2);
    ctx.fillStyle = "#fff";
    ctx.fill();
  }

  _drawAttractorLabels(ctx, h) {
    const isPresetView = Math.abs(this.viewYaw) < 1e-9 && Math.abs(this.viewPitch) < 1e-9;
    let axes = "3D view";
    if (isPresetView) axes = this.projection === "xz" ? "X / Z" : "X / Y";
    ctx.fillStyle = "rgba(230,236,245,0.45)";
    ctx.font = `${11 * this.dpr}px "IBM Plex Mono", ui-monospace, monospace`;
    ctx.fillText(`${axes}  ·  ${this.systemLabel}  ·  drag to rotate`, 14 * this.dpr, 18 * this.dpr);
    const centerLabel = Number(this.xCenter.toFixed(2));
    ctx.fillStyle = LOBE_A.fill;
    ctx.fillText(`lobe A  x<${centerLabel}`, 14 * this.dpr, h - 16 * this.dpr);
    ctx.fillStyle = LOBE_B.fill;
    ctx.fillText(`lobe B  x>${centerLabel}`, 120 * this.dpr, h - 16 * this.dpr);
  }

  _drawAttractor() {
    const ctx = this.actx;
    const w = this.attractorCanvas.width;
    const h = this.attractorCanvas.height;
    ctx.clearRect(0, 0, w, h);

    ctx.fillStyle = "#07090d";
    ctx.fillRect(0, 0, w, h);
    this._grid(ctx, w, h);
    this.renderBounds = this._projectedBounds();
    this._drawPresetCenterLine(ctx, w, h);
    this._drawTrajectory(ctx, w, h);
    this._drawAttractorEvents(ctx, w, h);
    this._drawCurrentPoint(ctx, w, h);
    this._drawAttractorLabels(ctx, h);
  }

  _drawTimeline(nowAudio) {
    const ctx = this.tctx;
    const w = this.timelineCanvas.width;
    const h = this.timelineCanvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#07090d";
    ctx.fillRect(0, 0, w, h);
    this._grid(ctx, w, h, 8);

    const windowSec = 8;
    const t1 = nowAudio;
    const t0 = t1 - windowSec;
    const padL = 36 * this.dpr;
    const padR = 12 * this.dpr;
    const padT = 16 * this.dpr;
    const padB = 18 * this.dpr;

    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.beginPath();
    ctx.moveTo(padL, padT);
    ctx.lineTo(padL, h - padB);
    ctx.stroke();

    const midiLo = 24;
    const midiHi = 96;
    const xAt = (t) => padL + ((t - t0) / windowSec) * (w - padL - padR);
    const yAt = (midi) =>
      padT + (1 - (midi - midiLo) / (midiHi - midiLo)) * (h - padT - padB);

    ctx.fillStyle = "rgba(230,236,245,0.4)";
    ctx.font = `${10 * this.dpr}px "IBM Plex Mono", ui-monospace, monospace`;
    ctx.fillText("timeline", 10 * this.dpr, 14 * this.dpr);

    for (const note of this.notes) {
      const start = note.audioTime;
      const end = start + note.duration;
      if (end < t0 || start > t1 + 0.5) continue;
      const x = xAt(start);
      const width = Math.max(2 * this.dpr, xAt(end) - x);
      const y = yAt(note.midi);
      const nh = Math.max(2 * this.dpr, 5 * this.dpr * note.velocity);
      ctx.fillStyle = VOICE_COLORS[note.voiceId] ?? "#fff";
      ctx.globalAlpha = 0.35 + 0.65 * note.velocity;
      ctx.fillRect(x, y - nh / 2, width, nh);
      ctx.globalAlpha = 1;
    }

    const nowX = xAt(t1);
    ctx.strokeStyle = "rgba(255,255,255,0.55)";
    ctx.lineWidth = this.dpr;
    ctx.beginPath();
    ctx.moveTo(nowX, padT);
    ctx.lineTo(nowX, h - padB);
    ctx.stroke();
  }

  _grid(ctx, w, h, cells = 10) {
    ctx.strokeStyle = "rgba(255,255,255,0.035)";
    ctx.lineWidth = this.dpr;
    const step = Math.max(w, h) / cells;
    ctx.beginPath();
    for (let x = 0; x <= w; x += step) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
    }
    for (let y = 0; y <= h; y += step) {
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
    }
    ctx.stroke();
  }
}
