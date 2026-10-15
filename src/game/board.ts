import { BOARD_SIZE, shipSize } from './rules';
import type { Coord, Placement } from './types';

export const COLUMN_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'] as const;

export function coord(row: number, col: number): Coord {
  return { row, col };
}

export function inBounds(c: Coord): boolean {
  return (
    Number.isInteger(c.row) &&
    Number.isInteger(c.col) &&
    c.row >= 0 &&
    c.row < BOARD_SIZE &&
    c.col >= 0 &&
    c.col < BOARD_SIZE
  );
}

/** Map/Set anahtarı ve dizin: 0..99. */
export function cellIndex(c: Coord): number {
  return c.row * BOARD_SIZE + c.col;
}

export function fromIndex(i: number): Coord {
  return { row: Math.floor(i / BOARD_SIZE), col: i % BOARD_SIZE };
}

export function sameCoord(a: Coord, b: Coord): boolean {
  return a.row === b.row && a.col === b.col;
}

/** "E5" biçimi: sütun harfi + satır numarası (1–10). */
export function coordLabel(c: Coord): string {
  return `${COLUMN_LABELS[c.col] ?? '?'}${c.row + 1}`;
}

export function parseCoordLabel(label: string): Coord | null {
  const m = /^([A-Ja-j])(10|[1-9])$/.exec(label.trim());
  if (!m || !m[1] || !m[2]) return null;
  return { col: m[1].toUpperCase().charCodeAt(0) - 65, row: Number(m[2]) - 1 };
}

export function allCells(): Coord[] {
  return Array.from({ length: BOARD_SIZE * BOARD_SIZE }, (_, i) => fromIndex(i));
}

/** Dik komşular (yukarı, sağ, aşağı, sol), tahta içinde. */
export function orthogonalNeighbors(c: Coord): Coord[] {
  return [
    { row: c.row - 1, col: c.col },
    { row: c.row, col: c.col + 1 },
    { row: c.row + 1, col: c.col },
    { row: c.row, col: c.col - 1 },
  ].filter(inBounds);
}

/** Çapraz dahil 8 komşu, tahta içinde. */
export function surroundingCells(c: Coord): Coord[] {
  const out: Coord[] = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const n = { row: c.row + dr, col: c.col + dc };
      if (inBounds(n)) out.push(n);
    }
  }
  return out;
}

/** Geminin kapladığı hücreler, baştan kıça. Tahta dışına taşanlar da dahildir (doğrulama ayrı). */
export function shipCells(p: Placement): Coord[] {
  const size = shipSize(p.ship);
  return Array.from({ length: size }, (_, i) =>
    p.orientation === 'horizontal'
      ? { row: p.origin.row, col: p.origin.col + i }
      : { row: p.origin.row + i, col: p.origin.col },
  );
}

/** Geminin etrafındaki hücreler (çapraz dahil), geminin kendisi hariç. */
export function shipHalo(p: Placement): Coord[] {
  const own = new Set(shipCells(p).map(cellIndex));
  const halo = new Map<number, Coord>();
  for (const c of shipCells(p)) {
    for (const n of surroundingCells(c)) {
      const k = cellIndex(n);
      if (!own.has(k)) halo.set(k, n);
    }
  }
  return [...halo.values()];
}
