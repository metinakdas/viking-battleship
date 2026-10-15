import type { Rng } from '../rng';
import type { Coord } from '../types';
import { unfiredCells, type TargetKnowledge } from './knowledge';

/** Kolay: ateş edilmemiş hücrelerden tamamen rastgele. */
export function easyShot(k: TargetKnowledge, rng: Rng): Coord {
  return rng.pick(unfiredCells(k));
}
