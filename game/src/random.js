// Deterministic seeded random (mulberry32). Gameplay logic never depends on
// this for combat outcomes — it is only for cosmetic variation — so runs
// with different seeds still score identically.

export function createRandom(seed) {
  let a = (seed >>> 0) || 1;
  function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  return {
    seed: a,
    next,
    int(n) {
      return Math.floor(next() * n);
    },
    range(min, max) {
      return min + next() * (max - min);
    },
    pick(arr) {
      return arr[Math.floor(next() * arr.length)];
    },
  };
}
