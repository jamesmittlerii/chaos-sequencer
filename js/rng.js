/**
 * String hash so identically-lengthed voice IDs still diverge.
 */
export function hashString(str) {
  let h = 2166136261;
  for (const char of str) {
    h ^= char.codePointAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Tiny deterministic PRNG (Mulberry32).
 * Used only when a voice explicitly enables probability-based density.
 */
export function hashSeed(x, y, z) {
  const s =
    Math.floor(x * 1e6) * 374761393 +
    Math.floor(y * 1e6) * 668265263 +
    Math.floor(z * 1e6) * 1274126177;
  return s >>> 0;
}

export function createRng(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
