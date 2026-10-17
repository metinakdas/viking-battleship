import { describe, expect, it } from 'vitest';

import {
  allCells,
  cellIndex,
  coordLabel,
  fromIndex,
  inBounds,
  orthogonalNeighbors,
  parseCoordLabel,
  shipCells,
  shipHalo,
  surroundingCells,
} from './board';

describe('board', () => {
  it('etiketler: sütun harfi + satır numarası', () => {
    expect(coordLabel({ row: 4, col: 4 })).toBe('E5');
    expect(coordLabel({ row: 0, col: 0 })).toBe('A1');
    expect(coordLabel({ row: 9, col: 9 })).toBe('J10');
  });

  it('etiket ayrıştırma ve gidiş-dönüş', () => {
    for (const c of allCells()) expect(parseCoordLabel(coordLabel(c))).toEqual(c);
    expect(parseCoordLabel('e5')).toEqual({ row: 4, col: 4 });
    expect(parseCoordLabel('K1')).toBeNull();
    expect(parseCoordLabel('A11')).toBeNull();
    expect(parseCoordLabel('A0')).toBeNull();
  });

  it('sınırlar ve tamsayı olmayan koordinatlar', () => {
    expect(inBounds({ row: 0, col: 9 })).toBe(true);
    expect(inBounds({ row: -1, col: 0 })).toBe(false);
    expect(inBounds({ row: 0, col: 10 })).toBe(false);
    expect(inBounds({ row: 1.5, col: 0 })).toBe(false);
  });

  it('dizin gidiş-dönüş, 100 hücre', () => {
    const cells = allCells();
    expect(cells).toHaveLength(100);
    cells.forEach((c, i) => {
      expect(cellIndex(c)).toBe(i);
      expect(fromIndex(i)).toEqual(c);
    });
  });

  it('komşular köşede kırpılır', () => {
    expect(orthogonalNeighbors({ row: 0, col: 0 })).toHaveLength(2);
    expect(orthogonalNeighbors({ row: 5, col: 5 })).toHaveLength(4);
    expect(surroundingCells({ row: 0, col: 0 })).toHaveLength(3);
    expect(surroundingCells({ row: 5, col: 5 })).toHaveLength(8);
  });

  it('gemi hücreleri yön ve boyuta göre', () => {
    expect(
      shipCells({ ship: 'sloop', origin: { row: 2, col: 3 }, orientation: 'horizontal' }),
    ).toEqual([
      { row: 2, col: 3 },
      { row: 2, col: 4 },
    ]);
    expect(
      shipCells({ ship: 'galleon', origin: { row: 1, col: 1 }, orientation: 'vertical' }).map(
        coordLabel,
      ),
    ).toEqual(['B2', 'B3', 'B4', 'B5', 'B6']);
  });

  it('hale: ortadaki 2lik gemi için 10 hücre, köşede 4', () => {
    expect(
      shipHalo({ ship: 'sloop', origin: { row: 5, col: 5 }, orientation: 'horizontal' }),
    ).toHaveLength(10);
    expect(
      shipHalo({ ship: 'sloop', origin: { row: 0, col: 0 }, orientation: 'horizontal' }),
    ).toHaveLength(4);
  });
});
