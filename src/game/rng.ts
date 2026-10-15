/**
 * Deterministik, serileştirilebilir rastgelelik (mulberry32).
 * Durum tek bir 32 bit tamsayıdır; GameState içinde saklanabilir.
 */

/** Saf adım: [0,1) aralığında değer ve bir sonraki durum. */
export function rngStep(state: number): { value: number; state: number } {
  const next = (state + 0x6d2b79f5) | 0;
  let t = next;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return { value, state: next };
}

/** Herhangi bir sayı/dizeyi 32 bit tohuma çevirir. */
export function toSeed(input: number | string): number {
  if (typeof input === 'number') return input | 0;
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h = Math.imul(h ^ input.charCodeAt(i), 16777619);
  }
  return h | 0;
}

/** Yapay zekâ ve rastgele dizme gibi motor dışı yardımcılar için değişken sarmalayıcı. */
export type Rng = {
  /** [0,1) */
  next(): number;
  /** [0, n) tamsayı */
  int(n: number): number;
  pick<T>(items: readonly T[]): T;
  shuffle<T>(items: readonly T[]): T[];
  /** Serileştirme için mevcut durum. */
  readonly state: number;
};

export function createRng(seed: number | string): Rng {
  let state = toSeed(seed);
  const rng: Rng = {
    next() {
      const r = rngStep(state);
      state = r.state;
      return r.value;
    },
    int(n) {
      return Math.floor(rng.next() * n);
    },
    pick(items) {
      if (items.length === 0) throw new Error('pick: boş dizi');
      return items[rng.int(items.length)] as (typeof items)[number];
    },
    shuffle(items) {
      const out = items.slice();
      for (let i = out.length - 1; i > 0; i--) {
        const j = rng.int(i + 1);
        [out[i], out[j]] = [out[j] as (typeof out)[number], out[i] as (typeof out)[number]];
      }
      return out;
    },
    get state() {
      return state;
    },
  };
  return rng;
}
