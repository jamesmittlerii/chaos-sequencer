var Lorenz = (function(exports) {
	Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
	//#region js/attractors.js
	/**
	* Registry and fixed-step RK4 integrator for the supported chaotic flows.
	* Every system exposes the same { x, y, z, t, dx, dy, dz } state shape.
	*/
	var parameter = (label, value, min, max, step, digits = 2) => ({
		label,
		value,
		min,
		max,
		step,
		digits
	});
	var ATTRACTOR_SYSTEMS = {
		lorenz: {
			id: "lorenz",
			label: "Lorenz",
			initial: {
				x: .1,
				y: 0,
				z: 0
			},
			dt: .01,
			params: {
				sigma: parameter("σ sigma", 10, 1, 20, .1, 2),
				rho: parameter("ρ rho", 28, .5, 50, .1, 2),
				beta: parameter("β beta", 8 / 3, .2, 8, .01, 2)
			},
			bounds: {
				x: [-20, 20],
				y: [-27, 27],
				z: [1, 48],
				velocity: [8, 90],
				distance: [10, 48]
			},
			viewBounds: {
				x: [-25, 25],
				y: [-32, 32],
				z: [0, 52]
			},
			zThreshold: 25,
			derivatives: (x, y, z, p) => ({
				dx: p.sigma * (y - x),
				dy: x * (p.rho - z) - y,
				dz: x * y - p.beta * z
			})
		},
		chua: {
			id: "chua",
			label: "Chua's Circuit",
			initial: {
				x: .1,
				y: .1,
				z: .1
			},
			dt: .005,
			warmup: 5,
			params: {
				alpha: parameter("α alpha", 15.6, 5, 25, .1, 2),
				beta: parameter("β beta", 28, 10, 40, .1, 2),
				m0: parameter("m₀ inner slope", -1.143, -2, -.5, .001, 3),
				m1: parameter("m₁ outer slope", -.714, -1.5, -.2, .001, 3)
			},
			bounds: {
				x: [-2.5, 2.5],
				y: [-.5, .5],
				z: [-4, 4],
				velocity: [.8, 12],
				distance: [.3, 4.5]
			},
			viewBounds: {
				x: [-2.7, 2.7],
				y: [-.6, .6],
				z: [-4.3, 4.3]
			},
			zThreshold: 0,
			derivatives: (x, y, z, p) => {
				const h = p.m1 * x + .5 * (p.m0 - p.m1) * (Math.abs(x + 1) - Math.abs(x - 1));
				return {
					dx: p.alpha * (y - x - h),
					dy: x - y + z,
					dz: -p.beta * y
				};
			}
		},
		rossler: {
			id: "rossler",
			label: "Rössler",
			initial: {
				x: 1,
				y: 1,
				z: 1
			},
			dt: .01,
			params: {
				a: parameter("a", .2, .05, .5, .01, 2),
				b: parameter("b", .2, .05, .5, .01, 2),
				c: parameter("c", 5.7, 2, 10, .1, 2)
			},
			bounds: {
				x: [-10, 12],
				y: [-12, 9],
				z: [0, 22],
				velocity: [2, 60],
				distance: [2, 22]
			},
			viewBounds: {
				x: [-11, 13],
				y: [-13, 10],
				z: [-1, 23]
			},
			zThreshold: .5,
			derivatives: (x, y, z, p) => ({
				dx: -y - z,
				dy: x + p.a * y,
				dz: p.b + z * (x - p.c)
			})
		},
		thomas: {
			id: "thomas",
			label: "Thomas",
			initial: {
				x: 1,
				y: 0,
				z: 0
			},
			dt: .02,
			warmup: 30,
			params: { b: parameter("b", .208186, .1, .3, .001, 6) },
			bounds: {
				x: [-1.5, 4.2],
				y: [-1.5, 4.2],
				z: [-1.5, 4.2],
				velocity: [.05, 1.7],
				distance: [1, 5]
			},
			viewBounds: {
				x: [-1.8, 4.5],
				y: [-1.8, 4.5],
				z: [-1.8, 4.5]
			},
			zThreshold: 1,
			derivatives: (x, y, z, p) => ({
				dx: Math.sin(y) - p.b * x,
				dy: Math.sin(z) - p.b * y,
				dz: Math.sin(x) - p.b * z
			})
		},
		aizawa: {
			id: "aizawa",
			label: "Aizawa",
			initial: {
				x: .1,
				y: 0,
				z: 0
			},
			dt: .01,
			params: {
				a: parameter("a", .95, .5, 1.5, .01, 2),
				b: parameter("b", .7, .1, 1.2, .01, 2),
				c: parameter("c", .6, .1, 1.2, .01, 2),
				d: parameter("d", 3.5, 1, 6, .1, 2),
				e: parameter("e", .25, 0, 1, .01, 2),
				f: parameter("f", .1, 0, .5, .01, 2)
			},
			bounds: {
				x: [-1.6, 1.6],
				y: [-1.6, 1.6],
				z: [-.5, 2],
				velocity: [.7, 6],
				distance: [.1, 2.1]
			},
			viewBounds: {
				x: [-1.8, 1.8],
				y: [-1.8, 1.8],
				z: [-.7, 2.2]
			},
			zThreshold: .75,
			derivatives: (x, y, z, p) => ({
				dx: (z - p.b) * x - p.d * y,
				dy: p.d * x + (z - p.b) * y,
				dz: p.c + p.a * z - z ** 3 / 3 - (x ** 2 + y ** 2) * (1 + p.e * z) + p.f * z * x ** 3
			})
		},
		halvorsen: {
			id: "halvorsen",
			label: "Halvorsen",
			initial: {
				x: -5,
				y: 0,
				z: 0
			},
			dt: .002,
			params: { a: parameter("a", 1.4, 1, 2, .01, 2) },
			bounds: {
				x: [-14, 7],
				y: [-14, 7],
				z: [-14, 7],
				velocity: [8, 120],
				distance: [4, 17]
			},
			viewBounds: {
				x: [-15, 8],
				y: [-15, 8],
				z: [-15, 8]
			},
			zThreshold: -2,
			derivatives: (x, y, z, p) => ({
				dx: -p.a * x - 4 * y - 4 * z - y ** 2,
				dy: -p.a * y - 4 * z - 4 * x - z ** 2,
				dz: -p.a * z - 4 * x - 4 * y - x ** 2
			})
		},
		rabinovich: {
			id: "rabinovich",
			label: "Rabinovich–Fabrikant",
			initial: {
				x: -1,
				y: 0,
				z: .5
			},
			dt: .001,
			warmup: 236,
			params: {
				alpha: parameter("α alpha", 1.1, .05, 1.5, .01, 2),
				gamma: parameter("γ gamma", .87, .01, 1.2, .01, 2)
			},
			bounds: {
				x: [-2, 0],
				y: [-.5, 2.6],
				z: [0, 1.5],
				velocity: [.3, 4.7],
				distance: [1, 2.8]
			},
			viewBounds: {
				x: [-2.1, .1],
				y: [-.5, 2.6],
				z: [-.1, 1.6]
			},
			xCenter: -1.1,
			zThreshold: .5,
			derivatives: (x, y, z, p) => ({
				dx: y * (z - 1 + x ** 2) + p.gamma * x,
				dy: x * (3 * z + 1 - x ** 2) + p.gamma * y,
				dz: -2 * z * (p.alpha + x * y)
			})
		}
	};
	Object.keys(ATTRACTOR_SYSTEMS);
	var ChaoticAttractor = class ChaoticAttractor {
		constructor(systemId = "lorenz", config = {}) {
			this.setSystem(systemId, config);
		}
		setSystem(systemId, config = {}) {
			var _ATTRACTOR_SYSTEMS$sy, _config$dt, _config$x, _config$y, _config$z, _config$params;
			this.definition = (_ATTRACTOR_SYSTEMS$sy = ATTRACTOR_SYSTEMS[systemId]) !== null && _ATTRACTOR_SYSTEMS$sy !== void 0 ? _ATTRACTOR_SYSTEMS$sy : ATTRACTOR_SYSTEMS.lorenz;
			this.systemId = this.definition.id;
			this.params = Object.fromEntries(Object.entries(this.definition.params).map(([key, spec]) => [key, spec.value]));
			this.dt = (_config$dt = config.dt) !== null && _config$dt !== void 0 ? _config$dt : this.definition.dt;
			this.x0 = (_config$x = config.x) !== null && _config$x !== void 0 ? _config$x : this.definition.initial.x;
			this.y0 = (_config$y = config.y) !== null && _config$y !== void 0 ? _config$y : this.definition.initial.y;
			this.z0 = (_config$z = config.z) !== null && _config$z !== void 0 ? _config$z : this.definition.initial.z;
			this.setParams((_config$params = config.params) !== null && _config$params !== void 0 ? _config$params : config);
			return this.reset();
		}
		setParams(config = {}) {
			for (const key of Object.keys(this.definition.params)) if (config[key] !== void 0) this.params[key] = config[key];
			if (config.dt !== void 0) this.dt = config.dt;
			if (config.x !== void 0) this.x0 = config.x;
			if (config.y !== void 0) this.y0 = config.y;
			if (config.z !== void 0) this.z0 = config.z;
		}
		reset(initial = {}) {
			var _initial$x, _initial$y, _initial$z, _this$definition$warm;
			this.x0 = (_initial$x = initial.x) !== null && _initial$x !== void 0 ? _initial$x : this.x0;
			this.y0 = (_initial$y = initial.y) !== null && _initial$y !== void 0 ? _initial$y : this.y0;
			this.z0 = (_initial$z = initial.z) !== null && _initial$z !== void 0 ? _initial$z : this.z0;
			this.x = this.x0;
			this.y = this.y0;
			this.z = this.z0;
			this.t = 0;
			const warmupSteps = Math.round(((_this$definition$warm = this.definition.warmup) !== null && _this$definition$warm !== void 0 ? _this$definition$warm : 0) / this.dt);
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
			const k2 = this.derivatives(x + .5 * dt * k1.dx, y + .5 * dt * k1.dy, z + .5 * dt * k1.dz);
			const k3 = this.derivatives(x + .5 * dt * k2.dx, y + .5 * dt * k2.dy, z + .5 * dt * k2.dz);
			const k4 = this.derivatives(x + dt * k3.dx, y + dt * k3.dy, z + dt * k3.dz);
			this.x += dt / 6 * (k1.dx + 2 * k2.dx + 2 * k3.dx + k4.dx);
			this.y += dt / 6 * (k1.dy + 2 * k2.dy + 2 * k3.dy + k4.dy);
			this.z += dt / 6 * (k1.dz + 2 * k2.dz + 2 * k3.dz + k4.dz);
			this.t += dt;
			return this.state();
		}
		state() {
			return {
				x: this.x,
				y: this.y,
				z: this.z,
				t: this.t,
				...this.derivatives(this.x, this.y, this.z)
			};
		}
		clone() {
			const copy = new ChaoticAttractor(this.systemId, {
				...this.params,
				dt: this.dt,
				x: this.x0,
				y: this.y0,
				z: this.z0
			});
			copy.x = this.x;
			copy.y = this.y;
			copy.z = this.z;
			copy.t = this.t;
			return copy;
		}
	};
	//#endregion
	//#region js/chaos-analyzer.js
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
		var _prev$dx, _curr$dx, _prev$dy, _curr$dy, _prev$dz, _curr$dz;
		return {
			x: lerp(prev.x, curr.x, frac),
			y: lerp(prev.y, curr.y, frac),
			z: lerp(prev.z, curr.z, frac),
			t: lerp(prev.t, curr.t, frac),
			dx: lerp((_prev$dx = prev.dx) !== null && _prev$dx !== void 0 ? _prev$dx : 0, (_curr$dx = curr.dx) !== null && _curr$dx !== void 0 ? _curr$dx : 0, frac),
			dy: lerp((_prev$dy = prev.dy) !== null && _prev$dy !== void 0 ? _prev$dy : 0, (_curr$dy = curr.dy) !== null && _curr$dy !== void 0 ? _curr$dy : 0, frac),
			dz: lerp((_prev$dz = prev.dz) !== null && _prev$dz !== void 0 ? _prev$dz : 0, (_curr$dz = curr.dz) !== null && _curr$dz !== void 0 ? _curr$dz : 0, frac)
		};
	}
	var ChaosAnalyzer = class {
		constructor(options = {}) {
			var _options$zThreshold, _options$xThreshold;
			this.zThreshold = (_options$zThreshold = options.zThreshold) !== null && _options$zThreshold !== void 0 ? _options$zThreshold : 25;
			this.xThreshold = (_options$xThreshold = options.xThreshold) !== null && _options$xThreshold !== void 0 ? _options$xThreshold : 0;
			this.reset();
		}
		reset() {
			this.prev = null;
			this.eventCount = 0;
			this.lastEventTime = null;
			this.lastByType = /* @__PURE__ */ new Map();
		}
		setZThreshold(value) {
			this.zThreshold = value;
		}
		setConfig({ zThreshold, xThreshold } = {}) {
			if (zThreshold !== void 0) this.zThreshold = zThreshold;
			if (xThreshold !== void 0) this.xThreshold = xThreshold;
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
				distance
			};
			this._detectCrossing(events, prev, sample, "x", this.xThreshold, "x-crossing");
			this._detectCrossing(events, prev, sample, "y", 0, "y-crossing");
			this._detectExtrema(events, prev, sample, "x");
			this._detectExtrema(events, prev, sample, "y");
			this._detectExtrema(events, prev, sample, "z");
			this._detectThreshold(events, prev, sample, "z", this.zThreshold, "z-threshold");
			this.prev = sample;
			return events;
		}
		_emit(events, type, sample, extra) {
			const dtEvent = this.lastEventTime === null ? 0 : sample.t - this.lastEventTime;
			const dtType = this.lastByType.has(type) ? sample.t - this.lastByType.get(type) : 0;
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
				lobe: sample.x < this.xThreshold ? "A" : "B",
				...extra
			};
			this.lastEventTime = sample.t;
			this.lastByType.set(type, sample.t);
			events.push(event);
			return event;
		}
		_detectCrossing(events, prev, curr, axis, threshold, type) {
			const a = prev[axis];
			const b = curr[axis];
			if (a === threshold && b === threshold) return;
			const crossedUp = a < threshold && b >= threshold;
			if (!crossedUp && !(a > threshold && b <= threshold)) return;
			const denom = b - a;
			const interp = interpolateState(prev, curr, denom === 0 ? 0 : (threshold - a) / denom);
			interp.velocity = curr.velocity;
			interp.distance = hypot3(interp.x, interp.y, interp.z);
			interp[axis] = threshold;
			const direction = crossedUp ? "up" : "down";
			this._emit(events, type, interp, {
				axis,
				direction,
				lobe: direction === "up" ? "B" : "A"
			});
		}
		_detectExtrema(events, prev, curr, axis) {
			const dPrev = prev[`d${axis}`];
			const dCurr = curr[`d${axis}`];
			if (dPrev === void 0 || dCurr === void 0) return;
			if (dPrev === 0 || dCurr === 0) return;
			const isMax = dPrev > 0 && dCurr < 0;
			if (!isMax && !(dPrev < 0 && dCurr > 0)) return;
			const kind = isMax ? "max" : "min";
			this._emit(events, `${axis}-${kind}`, curr, {
				axis,
				direction: kind === "max" ? "down" : "up",
				extremum: kind
			});
		}
		_detectThreshold(events, prev, curr, axis, threshold, type) {
			const a = prev[axis];
			const b = curr[axis];
			const crossedUp = a < threshold && b >= threshold;
			if (!crossedUp && !(a > threshold && b <= threshold)) return;
			const denom = b - a;
			const interp = interpolateState(prev, curr, denom === 0 ? 0 : (threshold - a) / denom);
			interp.velocity = curr.velocity;
			interp.distance = hypot3(interp.x, interp.y, interp.z);
			interp[axis] = threshold;
			this._emit(events, type, interp, {
				axis,
				direction: crossedUp ? "up" : "down",
				threshold
			});
		}
	};
	//#endregion
	//#region js/musical-mapper.js
	/**
	* MusicalMapper — turns chaotic event features into musical parameters.
	*
	* Raw Lorenz coordinates are never used as MIDI note numbers.
	* Values are normalized into typical attractor ranges, then mapped
	* onto scale degrees, velocity, duration, and register.
	*/
	var NOTE_NAMES = [
		"C",
		"C#",
		"D",
		"D#",
		"E",
		"F",
		"F#",
		"G",
		"G#",
		"A",
		"A#",
		"B"
	];
	var SCALES = {
		chromatic: [
			0,
			1,
			2,
			3,
			4,
			5,
			6,
			7,
			8,
			9,
			10,
			11
		],
		major: [
			0,
			2,
			4,
			5,
			7,
			9,
			11
		],
		minor: [
			0,
			2,
			3,
			5,
			7,
			8,
			10
		],
		"pentatonic-major": [
			0,
			2,
			4,
			7,
			9
		],
		"pentatonic-minor": [
			0,
			3,
			5,
			7,
			10
		],
		"whole-tone": [
			0,
			2,
			4,
			6,
			8,
			10
		]
	};
	/** Typical bounds of the classic chaotic Lorenz attractor. */
	var LORENZ_BOUNDS = {
		y: [-27, 27],
		z: [1, 48],
		velocity: [8, 90],
		distance: [10, 48],
		x: [-20, 20]
	};
	var DEFAULT_LOBE = {
		octaveOffset: 0,
		velocityScale: 1,
		durationScale: 1,
		filterCutoff: 1800,
		pan: 0,
		waveform: null,
		scale: null,
		rootOffset: 0,
		degreeWeights: null
	};
	function clamp$1(v, lo, hi) {
		return Math.min(hi, Math.max(lo, v));
	}
	function normalize$1(value, [lo, hi]) {
		if (hi === lo) return .5;
		return clamp$1((value - lo) / (hi - lo), 0, 1);
	}
	function noteNameToMidi(name, octave = 4) {
		const i = NOTE_NAMES.indexOf(name);
		if (i < 0) throw new Error(`Unknown note name: ${name}`);
		return (octave + 1) * 12 + i;
	}
	function midiToFreq(midi) {
		return 440 * 2 ** ((midi - 69) / 12);
	}
	function midiToName(midi) {
		const n = (midi % 12 + 12) % 12;
		const oct = Math.floor(midi / 12) - 1;
		return `${NOTE_NAMES[n]}${oct}`;
	}
	function weightedDegree(norm, scale, weights) {
		if (!weights || weights.length !== scale.length) {
			const idx = Math.min(scale.length - 1, Math.floor(norm * scale.length));
			return {
				degree: idx,
				interval: scale[idx]
			};
		}
		const bag = [];
		for (let i = 0; i < weights.length; i++) {
			const w = Math.max(0, Math.round(weights[i] * 4));
			for (let k = 0; k < w; k++) bag.push(i);
		}
		if (bag.length === 0) {
			const idx = Math.min(scale.length - 1, Math.floor(norm * scale.length));
			return {
				degree: idx,
				interval: scale[idx]
			};
		}
		const idx = bag[Math.min(bag.length - 1, Math.floor(norm * bag.length))];
		return {
			degree: idx,
			interval: scale[idx]
		};
	}
	var MusicalMapper = class {
		constructor(config = {}) {
			this.setConfig(config);
		}
		setConfig(config = {}) {
			var _ref, _config$rootName, _ref2, _config$rootOctave, _ref3, _config$scaleName, _ref4, _config$octaveRange, _ref5, _config$durationRange, _ref6, _config$velocityRange, _ref7, _config$xCenter;
			this.rootName = (_ref = (_config$rootName = config.rootName) !== null && _config$rootName !== void 0 ? _config$rootName : this.rootName) !== null && _ref !== void 0 ? _ref : "C";
			this.rootOctave = (_ref2 = (_config$rootOctave = config.rootOctave) !== null && _config$rootOctave !== void 0 ? _config$rootOctave : this.rootOctave) !== null && _ref2 !== void 0 ? _ref2 : 3;
			this.scaleName = (_ref3 = (_config$scaleName = config.scaleName) !== null && _config$scaleName !== void 0 ? _config$scaleName : this.scaleName) !== null && _ref3 !== void 0 ? _ref3 : "pentatonic-minor";
			this.octaveRange = (_ref4 = (_config$octaveRange = config.octaveRange) !== null && _config$octaveRange !== void 0 ? _config$octaveRange : this.octaveRange) !== null && _ref4 !== void 0 ? _ref4 : [2, 5];
			this.durationRange = (_ref5 = (_config$durationRange = config.durationRange) !== null && _config$durationRange !== void 0 ? _config$durationRange : this.durationRange) !== null && _ref5 !== void 0 ? _ref5 : [.08, .55];
			this.velocityRange = (_ref6 = (_config$velocityRange = config.velocityRange) !== null && _config$velocityRange !== void 0 ? _config$velocityRange : this.velocityRange) !== null && _ref6 !== void 0 ? _ref6 : [.15, .95];
			this.bounds = {
				...LORENZ_BOUNDS,
				...config.bounds
			};
			this.xCenter = (_ref7 = (_config$xCenter = config.xCenter) !== null && _config$xCenter !== void 0 ? _config$xCenter : this.xCenter) !== null && _ref7 !== void 0 ? _ref7 : 0;
			this.lobeA = {
				...DEFAULT_LOBE,
				...this.lobeA,
				...config.lobeA
			};
			this.lobeB = {
				...DEFAULT_LOBE,
				...this.lobeB,
				...config.lobeB
			};
		}
		lobeConfig(lobe) {
			return lobe === "A" ? this.lobeA : this.lobeB;
		}
		map(chaosEvent) {
			var _chaosEvent$lobe, _SCALES$scaleName, _lobeCfg$pan, _lobeCfg$filterCutoff;
			const lobe = (_chaosEvent$lobe = chaosEvent.lobe) !== null && _chaosEvent$lobe !== void 0 ? _chaosEvent$lobe : chaosEvent.x < this.xCenter ? "A" : "B";
			const lobeCfg = this.lobeConfig(lobe);
			const scaleName = lobeCfg.scale || this.scaleName;
			const scale = (_SCALES$scaleName = SCALES[scaleName]) !== null && _SCALES$scaleName !== void 0 ? _SCALES$scaleName : SCALES["pentatonic-minor"];
			const yNorm = normalize$1(chaosEvent.y, this.bounds.y);
			const zNorm = normalize$1(chaosEvent.z, this.bounds.z);
			const velNorm = normalize$1(chaosEvent.velocity, this.bounds.velocity);
			const distNorm = normalize$1(chaosEvent.distance, this.bounds.distance);
			const { degree, interval } = weightedDegree(yNorm, scale, lobeCfg.degreeWeights);
			const [octLo, octHi] = this.octaveRange;
			const octaves = Math.max(0, octHi - octLo);
			const register = octLo + Math.round(distNorm * octaves) + (lobeCfg.octaveOffset || 0);
			const midi = clamp$1(noteNameToMidi(this.rootName, 0) + (lobeCfg.rootOffset || 0) + register * 12 + interval, 12, 108);
			const [vLo, vHi] = this.velocityRange;
			const velocity = clamp$1((vLo + zNorm * (vHi - vLo)) * (lobeCfg.velocityScale || 1), .01, 1);
			const [dLo, dHi] = this.durationRange;
			const duration = clamp$1((dHi - velNorm * (dHi - dLo)) * (lobeCfg.durationScale || 1), .03, 4);
			return {
				timestamp: chaosEvent.timestamp,
				midi,
				noteName: midiToName(midi),
				frequency: midiToFreq(midi),
				velocity,
				duration,
				octave: register,
				degree,
				scaleName,
				lobe,
				pan: clamp$1((_lobeCfg$pan = lobeCfg.pan) !== null && _lobeCfg$pan !== void 0 ? _lobeCfg$pan : 0, -1, 1),
				filter: (_lobeCfg$filterCutoff = lobeCfg.filterCutoff) !== null && _lobeCfg$filterCutoff !== void 0 ? _lobeCfg$filterCutoff : 1800,
				waveform: lobeCfg.waveform,
				source: chaosEvent
			};
		}
	};
	//#endregion
	//#region js/engine.js
	/**
	* ChaosEngine — advances the attractor, detects events, maps them,
	* and hands notes to the scheduler / audio engine.
	*
	* render(start, end) is the clock-agnostic contract. Times are in the
	* same seconds domain as Sequencer.simulationToAudio. The web app calls
	* it from a lookahead tick. A plugin calls it once per audio block.
	*/
	var ChaosEngine = class {
		constructor({ attractor, analyzer, generator, mappers, sequencer, audio, midi, clock, onNote, onPoint }) {
			this.attractor = attractor;
			this.analyzer = analyzer;
			this.generator = generator;
			this.mappers = mappers;
			this.sequencer = sequencer;
			this.audio = audio !== null && audio !== void 0 ? audio : null;
			this.midi = midi !== null && midi !== void 0 ? midi : null;
			this.clock = clock !== null && clock !== void 0 ? clock : { now: () => {
				var _this$audio$currentTi, _this$audio;
				return (_this$audio$currentTi = (_this$audio = this.audio) === null || _this$audio === void 0 ? void 0 : _this$audio.currentTime) !== null && _this$audio$currentTi !== void 0 ? _this$audio$currentTi : 0;
			} };
			this.onNote = onNote;
			this.onPoint = onPoint;
			this.running = false;
			this.timer = null;
			this.lookahead = .12;
			this.intervalMs = 25;
			this.modulateFilter = 0;
			this.modulatePan = 0;
			this.modulateFm = 0;
			this.internalAudioEnabled = true;
			this.bounds = {
				x: [-20, 20],
				z: [1, 48],
				velocity: [8, 90]
			};
			this.pending = [];
			this.cursor = 0;
		}
		start() {
			const t0 = this.clock.now() + .08;
			this._resetPerformance();
			this.sequencer.reset(t0);
			this.pending = [];
			this.cursor = t0;
			this.running = true;
			this._tick();
			this._arm();
		}
		pause() {
			var _this$midi;
			this.running = false;
			if (this.timer) {
				clearInterval(this.timer);
				this.timer = null;
			}
			(_this$midi = this.midi) === null || _this$midi === void 0 || _this$midi.stopAll();
		}
		resume() {
			if (this.running) return;
			this.running = true;
			this._arm();
		}
		stop() {
			var _this$audio2;
			this.pause();
			(_this$audio2 = this.audio) === null || _this$audio2 === void 0 || _this$audio2.stopAll();
		}
		/**
		* Drop the trajectory and fast-forward to `audioTime` without emitting.
		* `audioTime` uses the sequencer clock (simulationToAudio).
		*/
		seek(audioTime) {
			this._resetPerformance();
			this.pending = [];
			this.sequencer.occupied.clear();
			this._advanceUntil(audioTime, false);
			this.cursor = audioTime;
		}
		/**
		* Advance through [start, end) and return noteOn / noteOff events whose
		* times fall in that window. A start that is not the current cursor
		* resimulates from the seed up to `start` before emitting.
		*/
		render(start, end) {
			if (end <= start) return [];
			if (Math.abs(start - this.cursor) > 1e-4) this.seek(start);
			this._advanceUntil(end, true);
			const out = [];
			const keep = [];
			for (const event of this.pending) {
				if (event.time < start) continue;
				if (event.time < end) out.push(event);
				else keep.push(event);
			}
			this.pending = keep;
			this.cursor = end;
			out.sort((a, b) => a.time - b.time || kindOrder(a.kind) - kindOrder(b.kind));
			return out;
		}
		_arm() {
			if (this.timer) clearInterval(this.timer);
			this.timer = setInterval(() => this._tick(), this.intervalMs);
		}
		_tick() {
			if (!this.running) return;
			if (this.audio && !this.audio.ctx) return;
			const horizon = this.clock.now() + this.lookahead;
			const events = this.render(this.cursor, horizon);
			for (const event of events) this._dispatch(event);
		}
		_resetPerformance() {
			this.attractor.reset();
			this.analyzer.reset();
			this.generator.reset();
		}
		_advanceUntil(endAudio, emit) {
			let guard = 0;
			while (this.sequencer.simulationToAudio(this.attractor.t) < endAudio && guard < 2e5) {
				guard++;
				const state = this.attractor.step();
				if (emit && this.onPoint) this.onPoint(state);
				const chaosEvents = this.analyzer.push(state);
				if (emit) this._processChaosEvents(chaosEvents);
				else for (const chaos of chaosEvents) this.generator.generate(chaos);
			}
		}
		_processChaosEvents(chaosEvents) {
			for (const chaos of chaosEvents) this._processCandidates(this.generator.generate(chaos), chaos);
		}
		_processCandidates(candidates, chaos) {
			for (const candidate of candidates) {
				var _this$mappers$get;
				const mapper = (_this$mappers$get = this.mappers.get(candidate.voiceId)) !== null && _this$mappers$get !== void 0 ? _this$mappers$get : this.mappers.values().next().value;
				const note = this._enrich(candidate, mapper.map(chaos), chaos);
				this._queueNote(note, chaos.timestamp);
			}
		}
		_queueNote(note, timestamp) {
			const when = this.sequencer.schedule(timestamp);
			if (!this.sequencer.claimSlot(note.voiceId, when)) return;
			this.pending.push({
				kind: "noteOn",
				time: when,
				note
			}, {
				kind: "noteOff",
				time: when + note.duration,
				note
			});
		}
		_dispatch(event) {
			var _this$midi2;
			if (event.kind !== "noteOn") return;
			const now = this.clock.now();
			const when = event.time;
			if (when < now - .02) return;
			const scheduledWhen = Math.max(when, now + .005);
			if (this.internalAudioEnabled && this.audio) this.audio.play(event.note, scheduledWhen);
			(_this$midi2 = this.midi) === null || _this$midi2 === void 0 || _this$midi2.play(event.note, scheduledWhen, now);
			if (this.onNote) this.onNote(event.note, when);
		}
		_enrich(candidate, mapped, chaos) {
			var _mapped$frequency;
			const xNorm = normalize(chaos.x, this.bounds.x);
			const zNorm = normalize(chaos.z, this.bounds.z);
			const pan = clamp(mapped.pan + (xNorm * 2 - 1) * this.modulatePan, -1, 1);
			const filter = mapped.filter + zNorm * this.modulateFilter * 4200;
			const fm = this.modulateFm * normalize(chaos.velocity, this.bounds.velocity);
			return {
				...mapped,
				voiceId: candidate.voiceId,
				voiceName: candidate.voiceName,
				instrument: candidate.instrument,
				waveform: candidate.waveform || mapped.waveform,
				pan,
				filter,
				fmAmount: fm,
				frequency: (_mapped$frequency = mapped.frequency) !== null && _mapped$frequency !== void 0 ? _mapped$frequency : midiToFreq(mapped.midi),
				eventNumber: chaos.id,
				direction: chaos.direction,
				chaos
			};
		}
	};
	function kindOrder(kind) {
		if (kind === "noteOff") return 0;
		if (kind === "cc") return 1;
		return 2;
	}
	function clamp(v, lo, hi) {
		return Math.min(hi, Math.max(lo, v));
	}
	function normalize(value, [lo, hi]) {
		if (lo === hi) return .5;
		return clamp((value - lo) / (hi - lo), 0, 1);
	}
	//#endregion
	//#region js/rng.js
	/**
	* String hash so identically-lengthed voice IDs still diverge.
	*/
	function hashString(str) {
		let h = 2166136261;
		for (const char of str) {
			h ^= char.codePointAt(0);
			h = Math.imul(h, 16777619);
		}
		return h >>> 0;
	}
	function createRng(seed) {
		let a = seed >>> 0;
		return function next() {
			a = a + 1831565813 >>> 0;
			let t = Math.imul(a ^ a >>> 15, 1 | a);
			t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
			return ((t ^ t >>> 14) >>> 0) / 4294967296;
		};
	}
	//#endregion
	//#region js/event-generator.js
	var DEFAULT_VOICE = {
		id: "voice-1",
		name: "Bass",
		enabled: true,
		eventTypes: ["x-crossing"],
		densityMode: "all",
		nth: 1,
		probability: 1,
		velocityThreshold: 0,
		customMetric: "distance",
		customThreshold: 0,
		instrument: "bass",
		waveform: "triangle"
	};
	var EventGenerator = class {
		constructor(voices = [DEFAULT_VOICE], seed = 1) {
			this.voices = voices.map((v) => ({
				...DEFAULT_VOICE,
				...v
			}));
			this.setSeed(seed);
		}
		setSeed(seed) {
			this.seed = seed >>> 0;
			this.reset();
		}
		setVoices(voices) {
			this.voices = voices.map((v) => ({
				...DEFAULT_VOICE,
				...v
			}));
			this.reset();
		}
		reset() {
			this.counts = /* @__PURE__ */ new Map();
			this.rngs = /* @__PURE__ */ new Map();
			for (const voice of this.voices) {
				this.counts.set(voice.id, 0);
				this.rngs.set(voice.id, createRng(this.seed ^ hashString(voice.id)));
			}
		}
		generate(chaosEvent) {
			const out = [];
			for (const voice of this.voices) {
				if (!voice.enabled) continue;
				if (!voice.eventTypes.includes(chaosEvent.type)) continue;
				if (!this._accept(voice, chaosEvent)) continue;
				out.push({
					voiceId: voice.id,
					voiceName: voice.name,
					instrument: voice.instrument,
					waveform: voice.waveform,
					chaos: chaosEvent
				});
			}
			return out;
		}
		_accept(voice, event) {
			const n = (this.counts.get(voice.id) || 0) + 1;
			this.counts.set(voice.id, n);
			switch (voice.densityMode) {
				case "nth": return n % Math.max(1, Math.trunc(voice.nth)) === 0;
				case "probability": return this.rngs.get(voice.id)() < clamp01(voice.probability);
				case "velocity-threshold": return event.velocity >= voice.velocityThreshold;
				case "custom-threshold": {
					let metric = event[voice.customMetric];
					if (voice.customMetric === "y") metric = Math.abs(event.y);
					return typeof metric === "number" && metric >= voice.customThreshold;
				}
				default: return true;
			}
		}
	};
	function clamp01(v) {
		return Math.min(1, Math.max(0, Number(v) || 0));
	}
	//#endregion
	//#region js/sequencer.js
	/**
	* Sequencer — maps Lorenz time onto the audio clock, optionally
	* blending chaotic onsets toward a quantized grid.
	*
	* timingInfluence:
	*   0 → 100% chaotic (raw Lorenz event times)
	*   1 → 100% quantized
	*/
	var GRID_DIVISIONS = {
		"1/4": 1,
		"1/8": .5,
		"1/16": .25,
		triplets: 1 / 3
	};
	var Sequencer = class {
		constructor(options = {}) {
			var _options$bpm, _options$grid, _options$quantize, _options$timingInflue, _options$speed;
			this.bpm = (_options$bpm = options.bpm) !== null && _options$bpm !== void 0 ? _options$bpm : 90;
			this.grid = (_options$grid = options.grid) !== null && _options$grid !== void 0 ? _options$grid : "1/8";
			this.quantize = (_options$quantize = options.quantize) !== null && _options$quantize !== void 0 ? _options$quantize : false;
			this.timingInfluence = (_options$timingInflue = options.timingInfluence) !== null && _options$timingInflue !== void 0 ? _options$timingInflue : 0;
			this.speed = (_options$speed = options.speed) !== null && _options$speed !== void 0 ? _options$speed : 1.2;
			this.audioStart = 0;
			this.occupied = /* @__PURE__ */ new Set();
		}
		setConfig(config = {}) {
			if (config.bpm !== void 0) this.bpm = config.bpm;
			if (config.grid !== void 0) this.grid = config.grid;
			if (config.quantize !== void 0) this.quantize = config.quantize;
			if (config.timingInfluence !== void 0) this.timingInfluence = config.timingInfluence;
			if (config.speed !== void 0) this.speed = config.speed;
		}
		reset(audioStart) {
			this.audioStart = audioStart;
			this.occupied.clear();
		}
		/**
		* Simulation timestamp (system time of the ODE) → AudioContext time.
		*/
		simulationToAudio(simulationT) {
			return this.audioStart + simulationT / Math.max(.05, this.speed);
		}
		schedule(simulationT) {
			const chaotic = this.simulationToAudio(simulationT);
			if (!this.quantize || this.timingInfluence <= 0) return chaotic;
			const quantized = this.quantizeTime(chaotic);
			const influence = Math.max(0, Math.min(1, this.timingInfluence));
			return chaotic * (1 - influence) + quantized * influence;
		}
		quantizeTime(audioTime) {
			var _GRID_DIVISIONS$this$;
			const grid = 60 / Math.max(20, this.bpm) * ((_GRID_DIVISIONS$this$ = GRID_DIVISIONS[this.grid]) !== null && _GRID_DIVISIONS$this$ !== void 0 ? _GRID_DIVISIONS$this$ : .5);
			const elapsed = audioTime - this.audioStart;
			const snapped = Math.round(elapsed / grid) * grid;
			return this.audioStart + Math.max(0, snapped);
		}
		/**
		* Avoid stacking many notes on the exact same grid slot for one voice.
		* Returns false if this slot was already used.
		*/
		claimSlot(voiceId, audioTime, window = 5e-4) {
			const key = `${voiceId}:${audioTime.toFixed(4)}`;
			if (this.occupied.has(key)) return false;
			this.occupied.add(key);
			if (this.occupied.size > 4e3) {
				const first = this.occupied.values().next().value;
				this.occupied.delete(first);
			}
			return true;
		}
	};
	//#endregion
	//#region m4l/pipeline.js
	/**
	* Headless Lorenz device for Max for Live (and Node tests).
	* Reuses the same js/ pipeline as the website — MIDI only, no Web Audio.
	*/
	function normalizePreset(preset) {
		const source = preset && typeof preset === "object" ? preset : {};
		const params = { ...source.params || source };
		params.systemId || (params.systemId = "lorenz");
		if (!params.attractorParams || typeof params.attractorParams !== "object") {
			var _params$sigma, _params$rho, _params$beta;
			params.attractorParams = params.systemId === "lorenz" ? {
				sigma: (_params$sigma = params.sigma) !== null && _params$sigma !== void 0 ? _params$sigma : 10,
				rho: (_params$rho = params.rho) !== null && _params$rho !== void 0 ? _params$rho : 28,
				beta: (_params$beta = params.beta) !== null && _params$beta !== void 0 ? _params$beta : 8 / 3
			} : {};
		}
		delete params.sigma;
		delete params.rho;
		delete params.beta;
		return {
			...source,
			v: 2,
			params
		};
	}
	var VOICE_RANGES = {
		"voice-1": {
			octaveRange: [2, 4],
			durationRange: [.18, .72],
			name: "Bass",
			eventTypes: ["x-crossing"]
		},
		"voice-2": {
			octaveRange: [4, 6],
			durationRange: [.06, .32],
			name: "Lead",
			eventTypes: ["y-max", "y-min"]
		},
		"voice-3": {
			octaveRange: [3, 5],
			durationRange: [.04, .11],
			name: "Perc",
			eventTypes: ["z-threshold"]
		}
	};
	var DEFAULT_CHANNELS = {
		"voice-1": 1,
		"voice-2": 2,
		"voice-3": 10
	};
	function degreeWeights(kind, scaleName) {
		var _SCALES$scaleName;
		const n = ((_SCALES$scaleName = SCALES[scaleName]) !== null && _SCALES$scaleName !== void 0 ? _SCALES$scaleName : SCALES.minor).length;
		if (kind === "tonic") return Array.from({ length: n }, (_, i) => i === 0 || i === Math.floor(n / 2) ? 3 : 1);
		if (kind === "color") return Array.from({ length: n }, (_, i) => i === 0 ? 1 : 2);
		return Array.from({ length: n }, () => 1);
	}
	function defaultParams() {
		return {
			systemId: "lorenz",
			attractorParams: {
				sigma: 10,
				rho: 28,
				beta: 2.6667
			},
			dt: .01,
			speed: 2.6,
			x0: .1,
			y0: 0,
			z0: 0,
			root: "C",
			scale: "pentatonic-minor",
			lobeAOctave: 0,
			lobeBOctave: 1,
			lobeAVel: .85,
			lobeBVel: 1.15,
			lobeADur: 1.2,
			lobeBDur: .8,
			lobeAPan: -.35,
			lobeBPan: .35,
			lobeAFilter: 900,
			lobeBFilter: 2400,
			lobeAScale: "",
			lobeBScale: "",
			lobeAWeights: "tonic",
			lobeBWeights: "even",
			quantize: false,
			grid: "1/8",
			bpm: 92,
			timingInfluence: 0,
			densityMode: "all",
			nth: 1,
			probability: 1,
			velocityThreshold: 0,
			customMetric: "distance",
			customThreshold: 0,
			zThreshold: 25,
			voice1Enable: true,
			voice2Enable: false,
			voice3Enable: false,
			midiChannel1: 1,
			midiChannel2: 2,
			midiChannel3: 10,
			modulatePan: 0,
			modulateFilter: 0,
			modulateFm: 0
		};
	}
	/**
	* @param {object} [options]
	* @param {(event: object) => void} [options.onMidi] called with { kind, time, channel, midi, velocity, note }
	*/
	function createLorenzDevice(options = {}) {
		var _options$onMidi;
		const params = { ...defaultParams() };
		const attractor = new ChaoticAttractor("lorenz");
		const analyzer = new ChaosAnalyzer();
		const sequencer = new Sequencer();
		const mappers = /* @__PURE__ */ new Map([
			["voice-1", new MusicalMapper({ ...VOICE_RANGES["voice-1"] })],
			["voice-2", new MusicalMapper({ ...VOICE_RANGES["voice-2"] })],
			["voice-3", new MusicalMapper({ ...VOICE_RANGES["voice-3"] })]
		]);
		const generator = new EventGenerator([], 1);
		let clockSeconds = 0;
		const engine = new ChaosEngine({
			attractor,
			analyzer,
			generator,
			mappers,
			sequencer,
			clock: { now: () => clockSeconds }
		});
		engine.internalAudioEnabled = false;
		const channels = { ...DEFAULT_CHANNELS };
		let onMidi = (_options$onMidi = options.onMidi) !== null && _options$onMidi !== void 0 ? _options$onMidi : null;
		function voicesFromParams() {
			const density = {
				densityMode: params.densityMode,
				nth: params.nth,
				probability: params.probability,
				velocityThreshold: params.velocityThreshold,
				customMetric: params.customMetric,
				customThreshold: params.customThreshold
			};
			return [
				{
					id: "voice-1",
					name: "Bass",
					enabled: Boolean(params.voice1Enable),
					eventTypes: VOICE_RANGES["voice-1"].eventTypes,
					instrument: "bass",
					waveform: "triangle",
					...density
				},
				{
					id: "voice-2",
					name: "Lead",
					enabled: Boolean(params.voice2Enable),
					eventTypes: VOICE_RANGES["voice-2"].eventTypes,
					instrument: "lead",
					waveform: "sawtooth",
					...density
				},
				{
					id: "voice-3",
					name: "Perc",
					enabled: Boolean(params.voice3Enable),
					eventTypes: VOICE_RANGES["voice-3"].eventTypes,
					instrument: "perc",
					waveform: "noise",
					...density
				}
			];
		}
		function applyParams() {
			var _ATTRACTOR_SYSTEMS$sy, _definition$xCenter, _definition$xCenter2;
			const systemId = params.systemId || "lorenz";
			const definition = (_ATTRACTOR_SYSTEMS$sy = ATTRACTOR_SYSTEMS[systemId]) !== null && _ATTRACTOR_SYSTEMS$sy !== void 0 ? _ATTRACTOR_SYSTEMS$sy : ATTRACTOR_SYSTEMS.lorenz;
			const attractorConfig = {
				...params.attractorParams || {},
				dt: params.dt,
				x: params.x0,
				y: params.y0,
				z: params.z0
			};
			if (attractor.systemId !== systemId) attractor.setSystem(systemId, attractorConfig);
			else attractor.setParams(attractorConfig);
			analyzer.setConfig({
				zThreshold: params.zThreshold,
				xThreshold: (_definition$xCenter = definition.xCenter) !== null && _definition$xCenter !== void 0 ? _definition$xCenter : 0
			});
			engine.bounds = definition.bounds;
			engine.modulatePan = params.modulatePan || 0;
			engine.modulateFilter = params.modulateFilter || 0;
			engine.modulateFm = params.modulateFm || 0;
			const scaleName = params.scale || "pentatonic-minor";
			const shared = {
				rootName: params.root || "C",
				scaleName,
				bounds: definition.bounds,
				xCenter: (_definition$xCenter2 = definition.xCenter) !== null && _definition$xCenter2 !== void 0 ? _definition$xCenter2 : 0,
				lobeA: {
					octaveOffset: params.lobeAOctave,
					velocityScale: params.lobeAVel,
					durationScale: params.lobeADur,
					pan: params.lobeAPan,
					filterCutoff: params.lobeAFilter,
					scale: params.lobeAScale || null,
					degreeWeights: degreeWeights(params.lobeAWeights || "even", params.lobeAScale || scaleName)
				},
				lobeB: {
					octaveOffset: params.lobeBOctave,
					velocityScale: params.lobeBVel,
					durationScale: params.lobeBDur,
					pan: params.lobeBPan,
					filterCutoff: params.lobeBFilter,
					scale: params.lobeBScale || null,
					degreeWeights: degreeWeights(params.lobeBWeights || "even", params.lobeBScale || scaleName)
				}
			};
			for (const [id, ranges] of Object.entries(VOICE_RANGES)) mappers.get(id).setConfig({
				...shared,
				octaveRange: ranges.octaveRange,
				durationRange: ranges.durationRange
			});
			generator.setVoices(voicesFromParams());
			sequencer.setConfig({
				bpm: params.bpm,
				grid: params.grid,
				quantize: Boolean(params.quantize),
				timingInfluence: params.timingInfluence,
				speed: params.speed
			});
			channels["voice-1"] = Number(params.midiChannel1) || 1;
			channels["voice-2"] = Number(params.midiChannel2) || 2;
			channels["voice-3"] = Number(params.midiChannel3) || 10;
		}
		function emit(event) {
			var _channels$event$note$;
			const channel = (_channels$event$note$ = channels[event.note.voiceId]) !== null && _channels$event$note$ !== void 0 ? _channels$event$note$ : 1;
			const midi = {
				kind: event.kind,
				time: event.time,
				channel,
				midi: event.note.midi,
				velocity: event.kind === "noteOn" ? Math.round(event.note.velocity * 127) : 0,
				note: event.note
			};
			if (onMidi) onMidi(midi);
			return midi;
		}
		applyParams();
		sequencer.reset(0);
		engine.cursor = 0;
		return {
			get params() {
				return { ...params };
			},
			get cursor() {
				return engine.cursor;
			},
			setOnMidi(fn) {
				onMidi = fn;
			},
			/** Apply a website/plugin `v:2` preset (or a flat params object). */
			loadPreset(preset, { reset = true } = {}) {
				const normalized = normalizePreset(preset);
				Object.assign(params, defaultParams(), normalized.params);
				applyParams();
				if (reset) this.reset();
				return this.capturePreset(normalized.name);
			},
			capturePreset(name = "M4L") {
				return {
					v: 2,
					name,
					params: {
						...params,
						attractorParams: { ...params.attractorParams || {} }
					}
				};
			},
			set(key, value) {
				if (key === "attractorParams" && value && typeof value === "object") params.attractorParams = {
					...params.attractorParams,
					...value
				};
				else params[key] = value;
				applyParams();
			},
			setBpm(bpm) {
				params.bpm = bpm;
				sequencer.setConfig({ bpm });
			},
			/**
			* Reset the trajectory so simulation t=0 maps to `audioTime`
			* (Live playhead seconds from sequence origin).
			*/
			beginAt(audioTime = 0) {
				clockSeconds = audioTime;
				attractor.reset();
				analyzer.reset();
				generator.reset();
				engine.pending = [];
				sequencer.reset(audioTime);
				engine.cursor = audioTime;
			},
			reset() {
				this.beginAt(0);
			},
			/** Drop trajectory and restart from seed at the current cursor. */
			restartHere() {
				this.beginAt(engine.cursor);
			},
			perturb() {
				params.x0 = (Number(params.x0) || 0) + 1e-6;
				attractor.setParams({
					x: params.x0,
					y: params.y0,
					z: params.z0
				});
				this.restartHere();
			},
			/**
			* Advance the device clock to `endSeconds` and return MIDI events in range.
			* Times are seconds from sequence origin (same contract as ChaosEngine.render).
			*/
			render(endSeconds) {
				clockSeconds = endSeconds;
				const start = engine.cursor;
				if (endSeconds <= start) return [];
				return engine.render(start, endSeconds).map(emit);
			},
			/** Render a fixed window from the current cursor (metro / lookahead mode). */
			renderLookahead(horizonSeconds = .1) {
				return this.render(engine.cursor + horizonSeconds);
			},
			systemIds() {
				return Object.keys(ATTRACTOR_SYSTEMS);
			}
		};
	}
	//#endregion
	exports.ATTRACTOR_SYSTEMS = ATTRACTOR_SYSTEMS;
	exports.createLorenzDevice = createLorenzDevice;
	exports.defaultParams = defaultParams;
	return exports;
})({});
