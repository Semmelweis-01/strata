// Deterministic PRNG primitives: same seed, same stream, on every platform.
// FNV-1a 32-bit over UTF-16 code units (stable across platforms and runs).

const FNV_OFFSET = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

/**
 * 32-bit unsigned hash of a string.
 * @param {string} str
 * @returns {number} uint32
 */
export function hash32(str) {
  const s = typeof str === 'string' ? str : String(str);
  let h = FNV_OFFSET;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i) & 0xff;
    h = Math.imul(h, FNV_PRIME);
  }
  return h >>> 0;
}

/**
 * mulberry32: tiny deterministic PRNG returning floats in [0, 1).
 * @param {number} seed uint32-ish seed
 * @returns {() => number}
 */
export function mulberry32(seed) {
  let a = (seed >>> 0) || 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1) >>> 0;
    t = (t ^ (t + Math.imul(t ^ (t >>> 7), t | 61))) >>> 0;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
