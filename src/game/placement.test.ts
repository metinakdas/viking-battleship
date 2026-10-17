import { describe, expect, it } from 'vitest';

import { cellIndex, shipCells, shipHalo } from './board';
import {
  allPlacementsFor,
  canPlaceShip,
  checkShipPlacement,
  isValidFleet,
  placeShip,
  randomFleet,
  removeShip,
  rotateShip,
} from './placement';
import { FLEET } from './rules';
import { createRng } from './rng';
import { FLEET_A } from './test-utils';
import type { Fleet, Placement } from './types';

const sloopAt = (
  row: number,
  col: number,
  orientation: Placement['orientation'] = 'horizontal',
): Placement => ({
  ship: 'sloop',
  origin: { row, col },
  orientation,
});

describe('tek gemi yerleştirme', () => {
  const galleon: Fleet = [
    { ship: 'galleon', origin: { row: 4, col: 2 }, orientation: 'horizontal' },
  ]; // C5–G5

  it('boş tahtaya geçerli', () => {
    expect(checkShipPlacement([], sloopAt(0, 0))).toBeNull();
  });

  it('taşma reddedilir', () => {
    expect(checkShipPlacement([], sloopAt(0, 9))).toBe('out_of_bounds');
    expect(checkShipPlacement([], sloopAt(9, 0, 'vertical'))).toBe('out_of_bounds');
    expect(checkShipPlacement([], sloopAt(-1, 0))).toBe('out_of_bounds');
  });

  it('üst üste binme reddedilir', () => {
    expect(checkShipPlacement(galleon, sloopAt(4, 5))).toBe('overlap');
    expect(checkShipPlacement(galleon, sloopAt(3, 4, 'vertical'))).toBe('overlap');
  });

  it('kenardan temas reddedilir', () => {
    expect(checkShipPlacement(galleon, sloopAt(3, 3))).toBe('touching'); // hemen üstü
    expect(checkShipPlacement(galleon, sloopAt(4, 7))).toBe('touching'); // kıçın ucu
  });

  it('çaprazdan temas da reddedilir', () => {
    expect(checkShipPlacement(galleon, sloopAt(5, 7))).toBe('touching'); // H6 ↘ G5
    expect(checkShipPlacement(galleon, sloopAt(2, 1, 'vertical'))).toBe('touching'); // B3–B4: B4 ↘ C5
    expect(canPlaceShip(galleon, sloopAt(2, 0, 'vertical'))).toBe(true); // A3–A4: B5 boş, değmez
  });

  it('bir hücre boşlukla geçerli', () => {
    expect(canPlaceShip(galleon, sloopAt(2, 2))).toBe(true); // C3–D3, araya 4. satır girer
    expect(canPlaceShip(galleon, sloopAt(4, 8))).toBe(true); // I5–J5
    expect(canPlaceShip(galleon, sloopAt(6, 0))).toBe(true);
  });

  it('aynı tür gemi taşınırken kendi eski yeri engel sayılmaz', () => {
    const fleet: Fleet = [sloopAt(0, 0)];
    expect(canPlaceShip(fleet, sloopAt(0, 1))).toBe(true);
    expect(placeShip(fleet, sloopAt(5, 5))).toEqual([sloopAt(5, 5)]);
  });

  it('placeShip geçersizde null, removeShip çıkarır', () => {
    expect(placeShip(galleon, sloopAt(4, 5))).toBeNull();
    expect(removeShip(FLEET_A, 'sloop')).toHaveLength(4);
  });
});

describe('döndürme', () => {
  it('ortadaki gemi baş hücresi etrafında döner', () => {
    const fleet = rotateShip([sloopAt(3, 3)], 'sloop');
    expect(fleet).toEqual([sloopAt(3, 3, 'vertical')]);
  });

  it('kenardaki gemi taşınca içeri kaydırılır', () => {
    const fleet = rotateShip(
      [{ ship: 'galleon', origin: { row: 8, col: 0 }, orientation: 'horizontal' }],
      'galleon',
    );
    expect(fleet).toEqual([
      { ship: 'galleon', origin: { row: 5, col: 0 }, orientation: 'vertical' },
    ]);
  });

  it('hiçbir kaydırma sığmazsa null', () => {
    // Dikey galleon 1. satır, hemen altında yatay şalupa: yataya dönünce her kaydırmada temas eder.
    const fleet: Fleet = [
      { ship: 'galleon', origin: { row: 0, col: 0 }, orientation: 'vertical' },
      { ship: 'sloop', origin: { row: 1, col: 2 }, orientation: 'vertical' },
    ];
    expect(rotateShip(fleet, 'galleon')).toBeNull();
  });

  it('olmayan gemi null', () => {
    expect(rotateShip([], 'sloop')).toBeNull();
  });
});

describe('filo doğrulama', () => {
  it('örnek filo geçerli', () => {
    expect(isValidFleet(FLEET_A)).toBe(true);
  });

  it('eksik, fazla ya da tekrarlı gemi geçersiz', () => {
    expect(isValidFleet(FLEET_A.slice(1))).toBe(false);
    expect(isValidFleet([...FLEET_A, sloopAt(5, 5)])).toBe(false);
    const dup = [...FLEET_A.slice(0, 4), { ...FLEET_A[0]!, origin: { row: 6, col: 0 } }];
    expect(isValidFleet(dup)).toBe(false);
  });

  it('temas eden filo geçersiz', () => {
    const touching = FLEET_A.map((p) =>
      p.ship === 'sloop' ? { ...p, origin: { row: 3, col: 6 } } : p,
    ); // G3'ün altı
    expect(isValidFleet(touching)).toBe(false);
  });

  it('bozuk girdi (ağdan) reddedilir', () => {
    expect(isValidFleet(null)).toBe(false);
    expect(isValidFleet('filo')).toBe(false);
    expect(isValidFleet([1, 2, 3, 4, 5])).toBe(false);
    expect(isValidFleet(FLEET_A.map((p, i) => (i === 0 ? { ...p, ship: 'dreadnought' } : p)))).toBe(
      false,
    );
    expect(
      isValidFleet(FLEET_A.map((p, i) => (i === 0 ? { ...p, orientation: 'diagonal' } : p))),
    ).toBe(false);
    expect(
      isValidFleet(FLEET_A.map((p, i) => (i === 0 ? { ...p, origin: { row: 0.5, col: 0 } } : p))),
    ).toBe(false);
    expect(isValidFleet(FLEET_A.map((p, i) => (i === 0 ? { ...p, origin: null } : p)))).toBe(false);
  });
});

describe('rastgele filo', () => {
  it('200 tohumda hep geçerli, çakışmasız ve temassız', () => {
    for (let seed = 0; seed < 200; seed++) {
      const fleet = randomFleet(seed);
      expect(isValidFleet(fleet)).toBe(true);
      const occupied = new Set(fleet.flatMap(shipCells).map(cellIndex));
      expect(occupied.size).toBe(17);
      for (const p of fleet) {
        const own = new Set(shipCells(p).map(cellIndex));
        const others = [...occupied].filter((i) => !own.has(i));
        expect(shipHalo(p).some((c) => others.includes(cellIndex(c)))).toBe(false);
      }
    }
  });

  it('aynı tohum aynı filo; Rng nesnesi de kabul edilir', () => {
    expect(randomFleet('abc')).toEqual(randomFleet('abc'));
    expect(randomFleet(createRng(7))).toEqual(randomFleet(7));
    expect(randomFleet(1)).not.toEqual(randomFleet(2));
  });

  it('her tür için olası konum sayısı', () => {
    // n uzunluk için: 2 * 10 * (11 - n)
    for (const { ship, size } of FLEET)
      expect(allPlacementsFor(ship)).toHaveLength(20 * (11 - size));
  });
});
