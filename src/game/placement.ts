import { cellIndex, inBounds, shipCells, shipHalo } from './board';
import { BOARD_SIZE, FLEET, SHIP_TYPES, shipSize } from './rules';
import { createRng, type Rng } from './rng';
import type { Fleet, Orientation, Placement, ShipType } from './types';

export type PlacementProblem = 'out_of_bounds' | 'overlap' | 'touching';

/**
 * Tek bir geminin mevcut filoya eklenip eklenemeyeceği.
 * Aynı türden mevcut gemi yok sayılır (sürüklerken gemi kendi eski yerine çarpmasın).
 * Gemiler üst üste binemez ve birbirine değemez (çapraz dahil).
 */
export function checkShipPlacement(fleet: Fleet, candidate: Placement): PlacementProblem | null {
  const cells = shipCells(candidate);
  if (!cells.every(inBounds)) return 'out_of_bounds';

  const others = fleet.filter((p) => p.ship !== candidate.ship);
  const occupied = new Set<number>();
  const halo = new Set<number>();
  for (const p of others) {
    for (const c of shipCells(p)) occupied.add(cellIndex(c));
    for (const c of shipHalo(p)) halo.add(cellIndex(c));
  }
  if (cells.some((c) => occupied.has(cellIndex(c)))) return 'overlap';
  if (cells.some((c) => halo.has(cellIndex(c)))) return 'touching';
  return null;
}

export function canPlaceShip(fleet: Fleet, candidate: Placement): boolean {
  return checkShipPlacement(fleet, candidate) === null;
}

/** Gemiyi ekler ya da (aynı tür varsa) yerini değiştirir. Geçersizse null. */
export function placeShip(fleet: Fleet, candidate: Placement): Fleet | null {
  if (!canPlaceShip(fleet, candidate)) return null;
  return [...fleet.filter((p) => p.ship !== candidate.ship), candidate];
}

export function removeShip(fleet: Fleet, ship: ShipType): Fleet {
  return fleet.filter((p) => p.ship !== ship);
}

/**
 * Gemiyi kendi baş hücresi etrafında döndürür. Taşarsa geçerli bir konuma kaydırmayı dener
 * (kullanıcı kenardaki gemiyi döndürünce işlem sessizce başarısız olmasın).
 */
export function rotateShip(fleet: Fleet, ship: ShipType): Fleet | null {
  const current = fleet.find((p) => p.ship === ship);
  if (!current) return null;
  const orientation: Orientation = current.orientation === 'horizontal' ? 'vertical' : 'horizontal';
  const size = shipSize(ship);
  for (let shift = 0; shift < size; shift++) {
    const origin =
      orientation === 'vertical'
        ? { row: current.origin.row - shift, col: current.origin.col }
        : { row: current.origin.row, col: current.origin.col - shift };
    const next = placeShip(fleet, { ship, origin, orientation });
    if (next) return next;
  }
  return null;
}

/** Filo tam ve kurallara uygun mu: her türden tam bir gemi, hepsi tahtada, çakışma/temas yok. */
export function isValidFleet(fleet: unknown): fleet is Fleet {
  if (!Array.isArray(fleet) || fleet.length !== FLEET.length) return false;
  const seen = new Set<ShipType>();
  for (const p of fleet as unknown[]) {
    if (!isPlacementShape(p)) return false;
    if (seen.has(p.ship)) return false;
    seen.add(p.ship);
  }
  const typed = fleet as Fleet;
  return typed.every((p) => canPlaceShip(typed, p));
}

/** Ağdan gelen veriye güvenme: yapıyı çalışma zamanında doğrula. */
function isPlacementShape(p: unknown): p is Placement {
  if (typeof p !== 'object' || p === null) return false;
  const o = p as Record<string, unknown>;
  const origin = o.origin as Record<string, unknown> | undefined;
  return (
    typeof o.ship === 'string' &&
    (SHIP_TYPES as readonly string[]).includes(o.ship) &&
    (o.orientation === 'horizontal' || o.orientation === 'vertical') &&
    typeof origin === 'object' &&
    origin !== null &&
    typeof origin.row === 'number' &&
    typeof origin.col === 'number'
  );
}

/** Kurallara uygun rastgele filo. Yerleştirme ekranındaki "Rastgele Diz" ve yapay zekâ kullanır. */
export function randomFleet(rngOrSeed: Rng | number | string): Fleet {
  const rng = typeof rngOrSeed === 'object' ? rngOrSeed : createRng(rngOrSeed);
  // Değme kuralıyla bu filo hep yerleşir; yine de nadir çıkmazlara karşı baştan dene.
  for (let attempt = 0; attempt < 100; attempt++) {
    let fleet: Fleet = [];
    let failed = false;
    for (const { ship } of FLEET) {
      const options = allPlacementsFor(ship).filter((p) => canPlaceShip(fleet, p));
      if (options.length === 0) {
        failed = true;
        break;
      }
      fleet = [...fleet, rng.pick(options)];
    }
    if (!failed) return fleet;
  }
  throw new Error('randomFleet: filo yerleştirilemedi');
}

/** Bir gemi türünün tahtaya sığan tüm konumları (diğer gemileri dikkate almadan). */
export function allPlacementsFor(ship: ShipType): Placement[] {
  const size = shipSize(ship);
  const out: Placement[] = [];
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (col + size <= BOARD_SIZE)
        out.push({ ship, origin: { row, col }, orientation: 'horizontal' });
      if (row + size <= BOARD_SIZE)
        out.push({ ship, origin: { row, col }, orientation: 'vertical' });
    }
  }
  return out;
}
