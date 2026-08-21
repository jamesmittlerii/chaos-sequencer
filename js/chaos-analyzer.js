/**
 * ChaosAnalyzer — extracts discrete musical-candidate events from a
 * continuous chaotic trajectory. Knows nothing about notes, scales,
 * or audio; it only describes the geometry of the flow.
 */

function hypot3(x, y, z) {
  return Math.hypot(x, y, z);
}

function lerp(a, b, f) {
  return a + (b - a) * f;
}

function interpolateState(prev, curr, frac) {
  return {
    x: lerp(prev.x, curr.x, frac),
    y: lerp(prev.y, curr.y, frac),
    z: lerp(prev.z, curr.z, frac),
    t: lerp(prev.t, curr.t, frac),
    dx: lerp(prev.dx ?? 0, curr.dx ?? 0, frac),
    dy: lerp(prev.dy ?? 0, curr.dy ?? 0, frac),
    dz: lerp(prev.dz ?? 0, curr.dz ?? 0, frac),
  };
}

export class ChaosAnalyzer {
  constructor(options = {}) {
    this.zThreshold = options.zThreshold ?? 25;
    this.reset();
  }

  reset() {
    this.prev = null;
    this.eventCount = 0;
    this.lastEventTime = null;
    this.lastByType = new Map();
  }

  setZThreshold(value) {
    this.zThreshold = value;
  }

  push(state) {
    const events = [];
    const prev = this.prev;
    if (!prev) {
      this.prev = { ...state };
      return events;
    }

    const dt = state.t - prev.t || 1e-9;
    const velocity = hypot3(state.x - prev.x, state.y - prev.y, state.z - prev.z) / dt;
    const distance = hypot3(state.x, state.y, state.z);

    const sample = {
      ...state,
      velocity,
      distance,
    };

    this._detectZeroCrossing(events, prev, sample, "x", "x-crossing");
    this._detectZeroCrossing(events, prev, sample, "y", "y-crossing");
    this._detectExtrema(events, prev, sample, "x");
    this._detectExtrema(events, prev, sample, "y");
    this._detectExtrema(events, prev, sample, "z");
    this._detectThreshold(events, prev, sample, "z", this.zThreshold, "z-threshold");

    this.prev = sample;
    return events;
  }

  _emit(events, type, sample, extra) {
    const dtEvent =
      this.lastEventTime === null ? 0 : sample.t - this.lastEventTime;
    const dtType = this.lastByType.has(type)
      ? sample.t - this.lastByType.get(type)
      : 0;

    const event = {
      id: ++this.eventCount,
      type,
      timestamp: sample.t,
      x: sample.x,
      y: sample.y,
      z: sample.z,
      velocity: sample.velocity,
      distance: sample.distance,
      dt: dtEvent,
      dtType,
      lobe: sample.x < 0 ? "A" : "B",
      ...extra,
    };

    this.lastEventTime = sample.t;
    this.lastByType.set(type, sample.t);
    events.push(event);
    return event;
  }

  _detectZeroCrossing(events, prev, curr, axis, type) {
    const a = prev[axis];
    const b = curr[axis];
    if (a === 0 && b === 0) return;
    const crossedUp = a < 0 && b >= 0;
    const crossedDown = a > 0 && b <= 0;
    if (!crossedUp && !crossedDown) return;

    const denom = b - a;
    const frac = denom === 0 ? 0 : -a / denom;
    const interp = interpolateState(prev, curr, frac);
    interp.velocity = curr.velocity;
    interp.distance = hypot3(interp.x, interp.y, interp.z);
    interp[axis] = 0;

    const direction = crossedUp ? "up" : "down";
    this._emit(events, type, interp, {
      axis,
      direction,
      lobe: direction === "up" ? "B" : "A",
    });
  }

  _detectExtrema(events, prev, curr, axis) {
    const dPrev = prev[`d${axis}`];
    const dCurr = curr[`d${axis}`];
    if (dPrev === undefined || dCurr === undefined) return;
    if (dPrev === 0 || dCurr === 0) return;

    const isMax = dPrev > 0 && dCurr < 0;
    const isMin = dPrev < 0 && dCurr > 0;
    if (!isMax && !isMin) return;

    const kind = isMax ? "max" : "min";
    this._emit(events, `${axis}-${kind}`, curr, {
      axis,
      direction: kind === "max" ? "down" : "up",
      extremum: kind,
    });
  }

  _detectThreshold(events, prev, curr, axis, threshold, type) {
    const a = prev[axis];
    const b = curr[axis];
    const crossedUp = a < threshold && b >= threshold;
    const crossedDown = a > threshold && b <= threshold;
    if (!crossedUp && !crossedDown) return;

    const denom = b - a;
    const frac = denom === 0 ? 0 : (threshold - a) / denom;
    const interp = interpolateState(prev, curr, frac);
    interp.velocity = curr.velocity;
    interp.distance = hypot3(interp.x, interp.y, interp.z);
    interp[axis] = threshold;

    this._emit(events, type, interp, {
      axis,
      direction: crossedUp ? "up" : "down",
      threshold,
    });
  }
}
