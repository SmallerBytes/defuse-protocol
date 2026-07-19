/**
 * Deterministic seeded RNG (mulberry32) so every game is reproducible
 * from its seed string. Used by all module generators.
 */

function hashSeed(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}

function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

class Rng {
  constructor(seed) {
    this.seed = String(seed);
    this._next = mulberry32(hashSeed(this.seed));
  }

  /** Float in [0, 1) */
  float() {
    return this._next();
  }

  /** Integer in [min, max] inclusive */
  int(min, max) {
    return min + Math.floor(this.float() * (max - min + 1));
  }

  /** Random element of an array */
  pick(arr) {
    return arr[this.int(0, arr.length - 1)];
  }

  /** Fisher-Yates shuffle (returns a new array) */
  shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = this.int(0, i);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /** n distinct elements from an array */
  sample(arr, n) {
    return this.shuffle(arr).slice(0, n);
  }

  /** true with probability p */
  chance(p) {
    return this.float() < p;
  }

  /** Derive a child RNG (e.g. one per module) without disturbing this stream */
  child(label) {
    return new Rng(this.seed + '::' + label);
  }
}

/** Random human-friendly seed like "CRIMSON-FOX-42" */
function randomSeed() {
  const ADJ = ['CRIMSON', 'SILENT', 'RAPID', 'HOLLOW', 'AMBER', 'FROZEN', 'NEON', 'RUSTY', 'PRIME', 'VIVID'];
  const NOUN = ['FOX', 'RELAY', 'CIRCUIT', 'ANVIL', 'COMET', 'SPARK', 'VAULT', 'PYLON', 'ROTOR', 'SIGNAL'];
  const r = Math.random;
  return `${ADJ[Math.floor(r() * ADJ.length)]}-${NOUN[Math.floor(r() * NOUN.length)]}-${Math.floor(r() * 90 + 10)}`;
}

module.exports = { Rng, randomSeed, hashSeed };
