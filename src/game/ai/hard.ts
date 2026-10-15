import { cellIndex, fromIndex, shipCells, shipHalo } from '../board';
import { allPlacementsFor } from '../placement';
import { BOARD_SIZE } from '../rules';
import type { Rng } from '../rng';
import type { Coord } from '../types';
import { plausibleCells, type TargetKnowledge } from './knowledge';

/** Açık isabeti kapsayan konumların ağırlığı; hedefleme avlamadan baskın olsun. */
const HIT_WEIGHT = 50;

/**
 * Zor: olasılık yoğunluğu haritası. Kalan her gemi için bilinenlerle çelişmeyen tüm konumları
 * sayar, en çok konumun kesiştiği ateş edilmemiş hücreye ateş eder.
 */
export function hardShot(k: TargetKnowledge, rng: Rng): Coord {
  const density = densityMap(k);
  let best = 0;
  let bestCells: Coord[] = [];
  density.forEach((score, i) => {
    if (score <= 0 || k.fired.has(i)) return;
    if (score > best) {
      best = score;
      bestCells = [fromIndex(i)];
    } else if (score === best) {
      bestCells.push(fromIndex(i));
    }
  });
  return bestCells.length > 0 ? rng.pick(bestCells) : rng.pick(plausibleCells(k));
}

export function densityMap(k: TargetKnowledge): number[] {
  const density = new Array<number>(BOARD_SIZE * BOARD_SIZE).fill(0);
  const openHits = new Set(k.openHits.map(cellIndex));
  const targeting = openHits.size > 0;

  for (const ship of k.remaining) {
    for (const p of allPlacementsFor(ship)) {
      const cells = shipCells(p).map(cellIndex);
      // Iska, batık gemi çevresi ya da batık gemi hücresiyle çakışamaz.
      if (cells.some((i) => k.misses.has(i) || k.impossible.has(i))) continue;
      if (cells.some((i) => k.fired.has(i) && !openHits.has(i))) continue;
      // Bir açık isabetin hemen yanından geçen ama onu içermeyen gemi o gemiye değerdi: geçersiz.
      if (shipHalo(p).some((c) => openHits.has(cellIndex(c)))) continue;

      const covered = cells.filter((i) => openHits.has(i)).length;
      if (targeting && covered === 0) continue;
      const weight = targeting ? covered * HIT_WEIGHT : 1;
      for (const i of cells) if (!k.fired.has(i)) density[i] = (density[i] ?? 0) + weight;
    }
  }
  return density;
}
