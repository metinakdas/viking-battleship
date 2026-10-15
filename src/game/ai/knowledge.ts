import { allCells, cellIndex, shipCells, shipHalo, surroundingCells } from '../board';
import { SHIP_TYPES } from '../rules';
import type { Coord, Placement, PlayerView, ShipType, ShotRecord } from '../types';

/**
 * Yapay zekânın rakip tahtası hakkında bildikleri. Yalnızca oyuncu görünümünden türetilir:
 * yapay zekâ hile yapamaz, insan oyuncunun gördüğünden fazlasını görmez.
 */
export type TargetKnowledge = {
  /** Ateş edilmiş hücreler (dizin). */
  readonly fired: ReadonlySet<number>;
  readonly misses: ReadonlySet<number>;
  /** İsabet almış ama henüz batmamış gemilere ait hücreler. */
  readonly openHits: readonly Coord[];
  readonly sunk: readonly Placement[];
  /** Kurala göre gemi OLAMAYACAK hücreler: batık gemilerin çevresi + açık isabetlerin çaprazları. */
  readonly impossible: ReadonlySet<number>;
  readonly remaining: readonly ShipType[];
};

export function knowledgeFromShots(
  shots: readonly ShotRecord[],
  sunk: readonly Placement[],
): TargetKnowledge {
  const fired = new Set(shots.map((s) => cellIndex(s.at)));
  const misses = new Set(shots.filter((s) => s.result === 'miss').map((s) => cellIndex(s.at)));

  const sunkCells = new Set(sunk.flatMap(shipCells).map(cellIndex));
  const openHits = shots
    .filter((s) => s.result !== 'miss' && !sunkCells.has(cellIndex(s.at)))
    .map((s) => s.at);

  const impossible = new Set<number>();
  for (const p of sunk) for (const c of shipHalo(p)) impossible.add(cellIndex(c));
  // Gemiler düzdür ve birbirine değemez: açık isabetin çapraz komşusunda gemi olamaz.
  for (const h of openHits) {
    for (const n of surroundingCells(h)) {
      if (n.row !== h.row && n.col !== h.col) impossible.add(cellIndex(n));
    }
  }

  const sunkTypes = new Set(sunk.map((p) => p.ship));
  return {
    fired,
    misses,
    openHits,
    sunk,
    impossible,
    remaining: SHIP_TYPES.filter((s) => !sunkTypes.has(s)),
  };
}

export function knowledgeFromView(view: PlayerView): TargetKnowledge {
  return knowledgeFromShots(view.opponent.incoming, view.opponent.sunk);
}

/** Ateş edilmemiş hücreler. */
export function unfiredCells(k: TargetKnowledge): Coord[] {
  return allCells().filter((c) => !k.fired.has(cellIndex(c)));
}

/** Ateş edilmemiş ve kurala göre gemi bulunabilecek hücreler. Boşsa ateş edilmemiş hücrelere düşer. */
export function plausibleCells(k: TargetKnowledge): Coord[] {
  const unfired = unfiredCells(k);
  const plausible = unfired.filter((c) => !k.impossible.has(cellIndex(c)));
  return plausible.length > 0 ? plausible : unfired;
}
