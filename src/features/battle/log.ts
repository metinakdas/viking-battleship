import {
  cellIndex,
  coordLabel,
  FLEET,
  shipCells,
  type PlayerView,
  type ShipType,
  type ShotResult,
} from '@/game';

export type LogEntry = {
  readonly key: string;
  readonly turn: number;
  readonly actor: 'me' | 'them';
  readonly cell: string;
  readonly result: ShotResult;
  readonly ship: ShipType | null;
  readonly auto: boolean;
};

/** İki tarafın atışlarını oynanış sırasıyla birleştirir; en yeni en üstte. */
export function buildLog(view: PlayerView): LogEntry[] {
  const tagged = [
    ...view.opponent.incoming.map((s, i) => ({ s, i, actor: 'me' as const })),
    ...view.me.incoming.map((s, i) => ({ s, i, actor: 'them' as const })),
  ];
  // Aynı turu yalnızca bir taraf oynar; tur içi sıra dizideki sıradır.
  tagged.sort((a, b) => a.s.turn - b.s.turn || a.i - b.i);
  return tagged
    .map(({ s, i, actor }) => ({
      key: `${actor}-${i}`,
      turn: s.turn,
      actor,
      cell: coordLabel(s.at),
      result: s.result,
      ship: s.sunk?.ship ?? null,
      auto: Boolean(s.auto),
    }))
    .reverse();
}

export type DamageEntry = {
  readonly ship: ShipType;
  readonly size: number;
  readonly hits: number;
  readonly sunk: boolean;
};

/** Kendi filonun hasar raporu: gemi başına isabet sayısı. */
export function damageReport(view: PlayerView): DamageEntry[] {
  const hitCells = new Set(
    view.me.incoming.filter((s) => s.result !== 'miss').map((s) => cellIndex(s.at)),
  );
  return FLEET.map(({ ship, size }) => {
    const placement = view.me.fleet?.find((p) => p.ship === ship);
    const hits = placement
      ? shipCells(placement).filter((c) => hitCells.has(cellIndex(c))).length
      : 0;
    return { ship, size, hits, sunk: view.me.sunk.includes(ship) };
  });
}
