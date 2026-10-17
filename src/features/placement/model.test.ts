import { describe, expect, it } from 'vitest';

import { isValidFleet } from '@/game';

import {
  dropPreview,
  grabOffset,
  initialPlacement,
  isComplete,
  originFromGrab,
  placementReducer,
  shipAt,
  unplacedShips,
  type PlacementAction,
  type PlacementState,
} from './model';

const run = (...actions: PlacementAction[]): PlacementState =>
  actions.reduce(placementReducer, initialPlacement);

describe('yerleştirme modeli', () => {
  it('başlangıç: boş filo, ilk gemi (galleon) seçili, yatay', () => {
    expect(initialPlacement).toMatchObject({
      fleet: [],
      selected: 'galleon',
      orientation: 'horizontal',
    });
  });

  it('yeni gemi yerleşince sıradaki gemi seçilir', () => {
    const s = run({ type: 'drop', ship: 'galleon', origin: { row: 0, col: 0 } });
    expect(s.fleet).toHaveLength(1);
    expect(s.selected).toBe('frigate');
    expect(unplacedShips(s.fleet)).toEqual(['frigate', 'corvette', 'brig', 'sloop']);
  });

  it('taşınan gemi seçili kalır ve yönünü korur', () => {
    const s = run(
      { type: 'rotate' }, // galleon elde, dikey
      { type: 'drop', ship: 'galleon', origin: { row: 0, col: 0 } },
      { type: 'drop', ship: 'galleon', origin: { row: 2, col: 5 } },
    );
    expect(s.fleet).toEqual([
      { ship: 'galleon', origin: { row: 2, col: 5 }, orientation: 'vertical' },
    ]);
    expect(s.selected).toBe('galleon');
  });

  it('geçersiz bırakma filoyu değiştirmez, sebebi kaydeder', () => {
    const base = run({ type: 'drop', ship: 'galleon', origin: { row: 0, col: 0 } });
    expect(
      placementReducer(base, { type: 'drop', ship: 'frigate', origin: { row: 1, col: 0 } }),
    ).toMatchObject({
      fleet: base.fleet,
      problem: 'touching',
    });
    expect(
      placementReducer(base, { type: 'drop', ship: 'frigate', origin: { row: 0, col: 2 } }).problem,
    ).toBe('overlap');
    expect(
      placementReducer(base, { type: 'drop', ship: 'frigate', origin: { row: 5, col: 8 } }).problem,
    ).toBe('out_of_bounds');
  });

  it('başarılı işlem eski sorunu temizler', () => {
    const bad = run({ type: 'drop', ship: 'galleon', origin: { row: 0, col: 8 } });
    expect(bad.problem).toBe('out_of_bounds');
    expect(
      placementReducer(bad, { type: 'drop', ship: 'galleon', origin: { row: 0, col: 0 } }).problem,
    ).toBeNull();
  });

  it('döndür: elde tutulan gemide yönü, yerleşmiş gemide gemiyi çevirir', () => {
    expect(run({ type: 'rotate' }).orientation).toBe('vertical');
    const s = run(
      { type: 'drop', ship: 'galleon', origin: { row: 3, col: 3 } },
      { type: 'rotate', ship: 'galleon' },
    );
    expect(s.fleet[0]?.orientation).toBe('vertical');
    expect(s.selected).toBe('galleon');
  });

  it('döndürülemeyen gemi yerinde kalır, sorun bildirilir', () => {
    const s = run(
      { type: 'select', ship: 'galleon' },
      { type: 'rotate' },
      { type: 'drop', ship: 'galleon', origin: { row: 0, col: 0 } }, // A1–A5 dikey
      { type: 'drop', ship: 'sloop', origin: { row: 1, col: 2 } }, // yatay C2–D2
    );
    const r = placementReducer(s, { type: 'rotate', ship: 'galleon' });
    expect(r.fleet).toEqual(s.fleet);
    expect(r.problem).toBe('touching');
  });

  it('seçili yokken döndürme etkisiz', () => {
    const s = run({ type: 'select', ship: null });
    expect(placementReducer(s, { type: 'rotate' })).toBe(s);
  });

  it('kaldır: gemi filodan çıkar ve seçilir', () => {
    const s = run(
      { type: 'drop', ship: 'galleon', origin: { row: 0, col: 0 } },
      { type: 'remove', ship: 'galleon' },
    );
    expect(s.fleet).toEqual([]);
    expect(s.selected).toBe('galleon');
  });

  it('rastgele diz: tam ve geçerli filo; temizle: başa döner, yön korunur', () => {
    const r = run({ type: 'random', seed: 5 });
    expect(isComplete(r.fleet)).toBe(true);
    expect(isValidFleet(r.fleet)).toBe(true);
    expect(r.selected).toBeNull();
    const c = placementReducer({ ...r, orientation: 'vertical' }, { type: 'clear' });
    expect(c).toEqual({ ...initialPlacement, orientation: 'vertical' });
  });

  it('elle tüm filo yerleşince tamam', () => {
    const s = run(
      { type: 'drop', ship: 'galleon', origin: { row: 0, col: 0 } },
      { type: 'drop', ship: 'frigate', origin: { row: 2, col: 0 } },
      { type: 'drop', ship: 'corvette', origin: { row: 4, col: 0 } },
      { type: 'drop', ship: 'brig', origin: { row: 6, col: 0 } },
      { type: 'drop', ship: 'sloop', origin: { row: 8, col: 0 } },
    );
    expect(isComplete(s.fleet)).toBe(true);
    expect(isValidFleet(s.fleet)).toBe(true);
    expect(s.selected).toBeNull();
  });
});

describe('önizleme ve sürükleme yardımcıları', () => {
  it('önizleme: taşan hücreler çizilmez, geçersiz işaretlenir', () => {
    const p = dropPreview(initialPlacement, 'galleon', { row: 0, col: 7 });
    expect(p.cells).toHaveLength(3);
    expect(p.valid).toBe(false);
    expect(dropPreview(initialPlacement, 'galleon', { row: 0, col: 0 }).valid).toBe(true);
  });

  it('shipAt ve grabOffset', () => {
    const s = run({ type: 'drop', ship: 'galleon', origin: { row: 2, col: 1 } });
    const p = shipAt(s.fleet, { row: 2, col: 4 });
    expect(p?.ship).toBe('galleon');
    expect(grabOffset(p!, { row: 2, col: 4 })).toBe(3);
    expect(shipAt(s.fleet, { row: 3, col: 4 })).toBeNull();
  });

  it('originFromGrab: tutma noktası sabit kalır', () => {
    expect(originFromGrab({ row: 5, col: 6 }, 3, 'horizontal')).toEqual({ row: 5, col: 3 });
    expect(originFromGrab({ row: 5, col: 6 }, 2, 'vertical')).toEqual({ row: 3, col: 6 });
  });
});
