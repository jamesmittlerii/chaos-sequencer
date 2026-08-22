/**
 * Registry and fixed-step RK4 integrator for the supported chaotic flows.
 * Every system exposes the same { x, y, z, t, dx, dy, dz } state shape.
 */

const parameter = (label, value, min, max, step, digits = 2) => ({
  label,
  value,
  min,
  max,
  step,
  digits,
});

export const ATTRACTOR_SYSTEMS = {
  lorenz: {
    id: "lorenz",
    label: "Lorenz",
    initial: { x: 0.1, y: 0, z: 0 },
    dt: 0.01,
    params: {
      sigma: parameter("σ sigma", 10, 1, 20, 0.1, 2),
      rho: parameter("ρ rho", 28, 0.5, 50, 0.1, 2),
      beta: parameter("β beta", 8 / 3, 0.2, 8, 0.01, 2),
    },
    bounds: {
      x: [-20, 20],
      y: [-27, 27],
      z: [1, 48],
      velocity: [8, 90],
      distance: [10, 48],
    },
    viewBounds: { x: [-25, 25], y: [-32, 32], z: [0, 52] },
    zThreshold: 25,
    derivatives: (x, y, z, p) => ({
      dx: p.sigma * (y - x),
      dy: x * (p.rho - z) - y,
      dz: x * y - p.beta * z,
    }),
  },
  chua: {
    id: "chua",
    label: "Chua's Circuit",
    initial: { x: 0.1, y: 0.1, z: 0.1 },
    dt: 0.005,
    warmup: 5,
    params: {
      alpha: parameter("α alpha", 15.6, 5, 25, 0.1, 2),
      beta: parameter("β beta", 28, 10, 40, 0.1, 2),
      m0: parameter("m₀ inner slope", -1.143, -2, -0.5, 0.001, 3),
      m1: parameter("m₁ outer slope", -0.714, -1.5, -0.2, 0.001, 3),
    },
    bounds: {
      x: [-2.5, 2.5],
      y: [-0.5, 0.5],
      z: [-4, 4],
      velocity: [0.8, 12],
      distance: [0.3, 4.5],
    },
    viewBounds: { x: [-2.7, 2.7], y: [-0.6, 0.6], z: [-4.3, 4.3] },
    zThreshold: 0,
    derivatives: (x, y, z, p) => {
      const h = p.m1 * x + 0.5 * (p.m0 - p.m1) * (Math.abs(x + 1) - Math.abs(x - 1));
      return {
        dx: p.alpha * (y - x - h),
        dy: x - y + z,
        dz: -p.beta * y,
      };
    },
  },
  rossler: {
    id: "rossler",
    label: "Rössler",
    initial: { x: 1, y: 1, z: 1 },
    dt: 0.01,
    params: {
      a: parameter("a", 0.2, 0.05, 0.5, 0.01, 2),
      b: parameter("b", 0.2, 0.05, 0.5, 0.01, 2),
      c: parameter("c", 5.7, 2, 10, 0.1, 2),
    },
    bounds: {
      x: [-10, 12],
      y: [-12, 9],
      z: [0, 22],
      velocity: [2, 60],
      distance: [2, 22],
    },
    viewBounds: { x: [-11, 13], y: [-13, 10], z: [-1, 23] },
    zThreshold: 0.5,
    derivatives: (x, y, z, p) => ({
      dx: -y - z,
      dy: x + p.a * y,
      dz: p.b + z * (x - p.c),
    }),
  },
  thomas: {
    id: "thomas",
    label: "Thomas",
    initial: { x: 1, y: 0, z: 0 },
    dt: 0.02,
    warmup: 30,
    params: {
      b: parameter("b", 0.208186, 0.1, 0.3, 0.001, 6),
    },
    bounds: {
      x: [-1.5, 4.2],
      y: [-1.5, 4.2],
      z: [-1.5, 4.2],
      velocity: [0.05, 1.7],
      distance: [1, 5],
    },
    viewBounds: { x: [-1.8, 4.5], y: [-1.8, 4.5], z: [-1.8, 4.5] },
    zThreshold: 1,
    derivatives: (x, y, z, p) => ({
      dx: Math.sin(y) - p.b * x,
      dy: Math.sin(z) - p.b * y,
      dz: Math.sin(x) - p.b * z,
    }),
  },
  aizawa: {
    id: "aizawa",
    label: "Aizawa",
    initial: { x: 0.1, y: 0, z: 0 },
    dt: 0.01,
    params: {
      a: parameter("a", 0.95, 0.5, 1.5, 0.01, 2),
      b: parameter("b", 0.7, 0.1, 1.2, 0.01, 2),
      c: parameter("c", 0.6, 0.1, 1.2, 0.01, 2),
      d: parameter("d", 3.5, 1, 6, 0.1, 2),
      e: parameter("e", 0.25, 0, 1, 0.01, 2),
      f: parameter("f", 0.1, 0, 0.5, 0.01, 2),
    },
    bounds: {
      x: [-1.6, 1.6],
      y: [-1.6, 1.6],
      z: [-0.5, 2],
      velocity: [0.7, 6],
      distance: [0.1, 2.1],
    },
    viewBounds: { x: [-1.8, 1.8], y: [-1.8, 1.8], z: [-0.7, 2.2] },
    zThreshold: 0.75,
    derivatives: (x, y, z, p) => ({
      dx: (z - p.b) * x - p.d * y,
      dy: p.d * x + (z - p.b) * y,
      dz:
        p.c +
        p.a * z -
        z ** 3 / 3 -
        (x ** 2 + y ** 2) * (1 + p.e * z) +
        p.f * z * x ** 3,
    }),
  },
  halvorsen: {
    id: "halvorsen",
    label: "Halvorsen",
    initial: { x: -5, y: 0, z: 0 },
    dt: 0.002,
    params: {
      a: parameter("a", 1.4, 1, 2, 0.01, 2),
    },
    bounds: {
      x: [-14, 7],
      y: [-14, 7],
      z: [-14, 7],
      velocity: [8, 120],
      distance: [4, 17],
    },
    viewBounds: { x: [-15, 8], y: [-15, 8], z: [-15, 8] },
    zThreshold: -2,
    derivatives: (x, y, z, p) => ({
      dx: -p.a * x - 4 * y - 4 * z - y ** 2,
      dy: -p.a * y - 4 * z - 4 * x - z ** 2,
      dz: -p.a * z - 4 * x - 4 * y - x ** 2,
    }),
  },
  rabinovich: {
    id: "rabinovich",
    label: "Rabinovich–Fabrikant",
    initial: { x: -1, y: 0, z: 0.5 },
    dt: 0.001,
    warmup: 236,
    params: {
      alpha: parameter("α alpha", 1.1, 0.05, 1.5, 0.01, 2),
      gamma: parameter("γ gamma", 0.87, 0.01, 1.2, 0.01, 2),
    },
    bounds: {
      x: [-2, 0],
      y: [-0.5, 2.6],
      z: [0, 1.5],
      velocity: [0.3, 4.7],
      distance: [1, 2.8],
    },
    viewBounds: { x: [-2.1, 0.1], y: [-0.5, 2.6], z: [-0.1, 1.6] },
    xCenter: -1.1,
    zThreshold: 0.5,
    derivatives: (x, y, z, p) => ({
      dx: y * (z - 1 + x ** 2) + p.gamma * x,
      dy: x * (3 * z + 1 - x ** 2) + p.gamma * y,
      dz: -2 * z * (p.alpha + x * y),
    }),
  },
};

export const ATTRACTOR_IDS = Object.keys(ATTRACTOR_SYSTEMS);

export class ChaoticAttractor {
  constructor(systemId = "lorenz", config = {}) {
    this.setSystem(systemId, config);
  }

  setSystem(systemId, config = {}) {
    this.definition = ATTRACTOR_SYSTEMS[systemId] ?? ATTRACTOR_SYSTEMS.lorenz;
    this.systemId = this.definition.id;
    this.params = Object.fromEntries(
      Object.entries(this.definition.params).map(([key, spec]) => [key, spec.value]),
    );
    this.dt = config.dt ?? this.definition.dt;
    this.x0 = config.x ?? this.definition.initial.x;
    this.y0 = config.y ?? this.definition.initial.y;
    this.z0 = config.z ?? this.definition.initial.z;
    this.setParams(config.params ?? config);
    return this.reset();
  }

  setParams(config = {}) {
    for (const key of Object.keys(this.definition.params)) {
      if (config[key] !== undefined) this.params[key] = config[key];
    }
    if (config.dt !== undefined) this.dt = config.dt;
    if (config.x !== undefined) this.x0 = config.x;
    if (config.y !== undefined) this.y0 = config.y;
    if (config.z !== undefined) this.z0 = config.z;
  }

  reset(initial = {}) {
    this.x0 = initial.x ?? this.x0;
    this.y0 = initial.y ?? this.y0;
    this.z0 = initial.z ?? this.z0;
    this.x = this.x0;
    this.y = this.y0;
    this.z = this.z0;
    this.t = 0;
    const warmupSteps = Math.round((this.definition.warmup ?? 0) / this.dt);
    for (let i = 0; i < warmupSteps; i++) this.step();
    this.t = 0;
    return this.state();
  }

  derivatives(x, y, z) {
    return this.definition.derivatives(x, y, z, this.params);
  }

  step(dt = this.dt) {
    const { x, y, z } = this;
    const k1 = this.derivatives(x, y, z);
    const k2 = this.derivatives(
      x + 0.5 * dt * k1.dx,
      y + 0.5 * dt * k1.dy,
      z + 0.5 * dt * k1.dz,
    );
    const k3 = this.derivatives(
      x + 0.5 * dt * k2.dx,
      y + 0.5 * dt * k2.dy,
      z + 0.5 * dt * k2.dz,
    );
    const k4 = this.derivatives(x + dt * k3.dx, y + dt * k3.dy, z + dt * k3.dz);

    this.x += (dt / 6) * (k1.dx + 2 * k2.dx + 2 * k3.dx + k4.dx);
    this.y += (dt / 6) * (k1.dy + 2 * k2.dy + 2 * k3.dy + k4.dy);
    this.z += (dt / 6) * (k1.dz + 2 * k2.dz + 2 * k3.dz + k4.dz);
    this.t += dt;
    return this.state();
  }

  state() {
    return {
      x: this.x,
      y: this.y,
      z: this.z,
      t: this.t,
      ...this.derivatives(this.x, this.y, this.z),
    };
  }

  clone() {
    const copy = new ChaoticAttractor(this.systemId, {
      ...this.params,
      dt: this.dt,
      x: this.x0,
      y: this.y0,
      z: this.z0,
    });
    copy.x = this.x;
    copy.y = this.y;
    copy.z = this.z;
    copy.t = this.t;
    return copy;
  }
}
