import { randomFleet } from '../placement';
import type { Rng } from '../rng';
import type { Coord, Fleet, PlayerView } from '../types';
import { easyShot } from './easy';
import { hardShot } from './hard';
import { knowledgeFromView, type TargetKnowledge } from './knowledge';
import { normalShot } from './normal';

export type AiLevel = 'easy' | 'normal' | 'hard';

export const AI_LEVELS: readonly AiLevel[] = ['easy', 'normal', 'hard'];

const strategies: Record<AiLevel, (k: TargetKnowledge, rng: Rng) => Coord> = {
  easy: easyShot,
  normal: normalShot,
  hard: hardShot,
};

/** Yapay zekânın bir sonraki atışı. Girdi yalnızca kendi oyuncu görünümüdür. */
export function chooseShot(level: AiLevel, view: PlayerView, rng: Rng): Coord {
  return strategies[level](knowledgeFromView(view), rng);
}

export function chooseShotFromKnowledge(level: AiLevel, k: TargetKnowledge, rng: Rng): Coord {
  return strategies[level](k, rng);
}

export function aiFleet(rng: Rng): Fleet {
  return randomFleet(rng);
}

/** "Nişan alıyor" gecikmesi: 600–1200 ms. */
export function aiThinkDelayMs(rng: Rng): number {
  return 600 + rng.int(601);
}

export { densityMap } from './hard';
export { knowledgeFromShots, knowledgeFromView, type TargetKnowledge } from './knowledge';
