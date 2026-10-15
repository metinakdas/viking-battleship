import { describe, expect, it } from 'vitest';

import { createRng, rngStep, toSeed } from './rng';

describe('rng', () => {
  it('aynı tohum aynı dizi', () => {
    const a = createRng(123);
    const b = createRng(123);
    for (let i = 0; i < 50; i++) expect(a.next()).toBe(b.next());
  });

  it('değerler [0,1) aralığında, int sınırlar içinde', () => {
    const r = createRng('x');
    for (let i = 0; i < 1000; i++) {
      const v = r.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
      const n = r.int(7);
      expect(Number.isInteger(n) && n >= 0 && n < 7).toBe(true);
    }
  });

  it('saf adım ile sarmalayıcı aynı sonucu verir; durum serileştirilebilir', () => {
    const r = createRng(9);
    const first = r.next();
    expect(rngStep(toSeed(9)).value).toBe(first);
    const resumed = createRng(r.state);
    expect(resumed.next()).toBe(r.next());
  });

  it('dize tohumları farklı', () => {
    expect(toSeed('ABC123')).not.toBe(toSeed('ABC124'));
    expect(toSeed('ABC123')).toBe(toSeed('ABC123'));
  });

  it('pick ve shuffle', () => {
    const r = createRng(1);
    expect(() => r.pick([])).toThrow();
    const items = [1, 2, 3, 4, 5, 6];
    const shuffled = r.shuffle(items);
    expect([...shuffled].sort()).toEqual(items);
    expect(items).toEqual([1, 2, 3, 4, 5, 6]);
    expect(items).toContain(r.pick(items));
  });

  it('kabaca düzgün dağılım', () => {
    const r = createRng(2024);
    const buckets = new Array(10).fill(0);
    for (let i = 0; i < 10000; i++) buckets[r.int(10)]++;
    for (const b of buckets) expect(b).toBeGreaterThan(850);
  });
});
