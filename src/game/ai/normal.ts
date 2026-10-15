import { cellIndex, inBounds, orthogonalNeighbors } from '../board';
import type { Rng } from '../rng';
import type { Coord } from '../types';
import { plausibleCells, type TargetKnowledge } from './knowledge';

/**
 * Normal: avla / hedefle.
 * - Açık isabet yoksa: kurala uygun hücrelerden rastgele (avla).
 * - Varsa: isabet kümesinin komşularını dene; iki+ isabet hizalıysa yalnızca hattın uçlarını (hedefle).
 */
export function normalShot(k: TargetKnowledge, rng: Rng): Coord {
  const candidates = plausibleCells(k);
  const allowed = new Set(candidates.map(cellIndex));

  if (k.openHits.length > 0) {
    const cluster = largestCluster(k.openHits);
    // Öncelik sırasıyla: önce hattın uçları, olmazsa kümenin tüm dik komşuları.
    for (const tier of clusterTargets(cluster)) {
      const targets = tier.filter((c) => allowed.has(cellIndex(c)));
      if (targets.length > 0) return rng.pick(targets);
    }
  }
  return rng.pick(candidates);
}

/** Dik komşuluğa göre birbirine bağlı en büyük isabet grubu. */
function largestCluster(hits: readonly Coord[]): Coord[] {
  const remaining = new Map(hits.map((h) => [cellIndex(h), h]));
  let best: Coord[] = [];
  while (remaining.size > 0) {
    const [startKey, start] = remaining.entries().next().value as [number, Coord];
    remaining.delete(startKey);
    const cluster = [start];
    for (let i = 0; i < cluster.length; i++) {
      for (const n of orthogonalNeighbors(cluster[i] as Coord)) {
        const key = cellIndex(n);
        const hit = remaining.get(key);
        if (hit) {
          remaining.delete(key);
          cluster.push(hit);
        }
      }
    }
    if (cluster.length > best.length) best = cluster;
  }
  return best;
}

/** Öncelik katmanları: [hattın uçları, tüm dik komşular]. Hepsi tahta içinde. */
function clusterTargets(cluster: readonly Coord[]): Coord[][] {
  const first = cluster[0];
  if (!first) return [];
  const neighbors = cluster.flatMap(orthogonalNeighbors);
  if (cluster.length === 1) return [neighbors];

  const horizontal = cluster.every((c) => c.row === first.row);
  const line = cluster.map((c) => (horizontal ? c.col : c.row));
  const min = Math.min(...line);
  const max = Math.max(...line);
  const ends = horizontal
    ? [
        { row: first.row, col: min - 1 },
        { row: first.row, col: max + 1 },
      ]
    : [
        { row: min - 1, col: first.col },
        { row: max + 1, col: first.col },
      ];
  // Tahta dışı uçlar atılmalı: dizinleri (row*10+col) başka geçerli hücrelerle çakışır.
  return [ends.filter(inBounds), neighbors];
}
