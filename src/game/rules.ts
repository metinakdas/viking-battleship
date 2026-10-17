import type { GameSettings, ShipType } from './types';

export const BOARD_SIZE = 10;

/** Filo, büyükten küçüğe. Sıra UI'daki filo listesinin de sırasıdır. */
export const FLEET: readonly { readonly ship: ShipType; readonly size: number }[] = [
  { ship: 'galleon', size: 5 },
  { ship: 'frigate', size: 4 },
  { ship: 'corvette', size: 3 },
  { ship: 'brig', size: 3 },
  { ship: 'sloop', size: 2 },
];

export const SHIP_TYPES: readonly ShipType[] = FLEET.map((f) => f.ship);

const SIZES = Object.fromEntries(FLEET.map((f) => [f.ship, f.size])) as Record<ShipType, number>;

export function shipSize(ship: ShipType): number {
  return SIZES[ship];
}

export const TOTAL_SHIP_CELLS = FLEET.reduce((sum, f) => sum + f.size, 0);

export const DEFAULT_SETTINGS: GameSettings = {
  extraShotOnHit: false,
  turnSeconds: 20,
  timeoutPolicy: 'randomShot',
};

/** Oda ayarlarında seçilebilecek tur süreleri (sn). 0 = süresiz. */
export const TURN_SECONDS_OPTIONS = [0, 15, 20, 30, 60] as const;

export function isValidSettings(s: GameSettings): boolean {
  return (
    typeof s.extraShotOnHit === 'boolean' &&
    Number.isInteger(s.turnSeconds) &&
    s.turnSeconds >= 0 &&
    s.turnSeconds <= 600 &&
    (s.timeoutPolicy === 'randomShot' || s.timeoutPolicy === 'skipTurn')
  );
}
