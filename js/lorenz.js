/**
 * LorenzAttractor — pure dynamical system.
 *
 * dx/dt = σ (y − x)
 * dy/dt = x (ρ − z) − y
 * dz/dt = x y − β z
 *
 * Contains no musical knowledge. Swap this class for another
 * chaotic flow (Rössler, Chua, Duffing) as long as step()
 * returns { x, y, z, t }.
 */
export const LORENZ_DEFAULTS = {
  sigma: 10,
  rho: 28,
  beta: 8 / 3,
  x: 0.1,
  y: 0,
  z: 0,
  dt: 0.01,
};

export class LorenzAttractor {
  constructor(params = {}) {
    this.setParams(params);
    this.reset();
  }

  setParams(params = {}) {
    this.sigma = params.sigma ?? this.sigma ?? LORENZ_DEFAULTS.sigma;
    this.rho = params.rho ?? this.rho ?? LORENZ_DEFAULTS.rho;
    this.beta = params.beta ?? this.beta ?? LORENZ_DEFAULTS.beta;
    this.dt = params.dt ?? this.dt ?? LORENZ_DEFAULTS.dt;
    if (params.x !== undefined) this.x0 = params.x;
    if (params.y !== undefined) this.y0 = params.y;
    if (params.z !== undefined) this.z0 = params.z;
    this.x0 ??= LORENZ_DEFAULTS.x;
    this.y0 ??= LORENZ_DEFAULTS.y;
    this.z0 ??= LORENZ_DEFAULTS.z;
  }

  reset(initial) {
    if (initial) {
      this.x0 = initial.x ?? this.x0;
      this.y0 = initial.y ?? this.y0;
      this.z0 = initial.z ?? this.z0;
    }
    this.x = this.x0;
    this.y = this.y0;
    this.z = this.z0;
    this.t = 0;
    return this.state();
  }

  derivatives(x, y, z) {
    return {
      dx: this.sigma * (y - x),
      dy: x * (this.rho - z) - y,
      dz: x * y - this.beta * z,
    };
  }

  /**
   * Classic RK4 step. Returns the new state.
   */
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
    const k4 = this.derivatives(
      x + dt * k3.dx,
      y + dt * k3.dy,
      z + dt * k3.dz,
    );

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
      dx: this.sigma * (this.y - this.x),
      dy: this.x * (this.rho - this.z) - this.y,
      dz: this.x * this.y - this.beta * this.z,
    };
  }

  clone() {
    const copy = new LorenzAttractor({
      sigma: this.sigma,
      rho: this.rho,
      beta: this.beta,
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
