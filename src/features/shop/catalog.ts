import type {
  BallLook,
  FlameLook,
  GridLook,
  SeaLook,
  ShipSkin,
} from '@/features/arcade/canvas/pixelGrid';

/** Altın ekonomisi kuralları. */
export const ECONOMY = {
  /** Yeni kaptanın kesesi */
  start: 200,
  /** Oda kurma bedeli */
  roomCost: 50,
  /** Zafer ödülü: CPU zorluğuna göre / çevrimiçi */
  win: { easy: 30, normal: 50, hard: 80, online: 100 },
  /** Yenilgi cezası (bakiye 0'ın altına inmez) */
  loss: 20,
} as const;

export type CosmeticKind = 'ship' | 'ball' | 'flame' | 'map';

type Base = { id: string; price: number };
export type ShipItem = Base & { kind: 'ship'; look: ShipSkin | null };
export type BallItem = Base & { kind: 'ball'; look: BallLook | null };
export type FlameItem = Base & { kind: 'flame'; look: FlameLook | null };
export type MapItem = Base & { kind: 'map'; look: SeaLook | null };
export type CosmeticItem = ShipItem | BallItem | FlameItem | MapItem;

/** Altın paketi (market). Mağaza demo: gerçek ödeme alınmaz. */
export type CoinPack = { id: string; gold: number; bonus: number; price: string };

export const COIN_PACKS: readonly CoinPack[] = [
  { id: 'pouch', gold: 500, bonus: 0, price: '29,99 TL' },
  { id: 'chest', gold: 1200, bonus: 20, price: '59,99 TL' },
  { id: 'hoard', gold: 3000, bonus: 50, price: '119,99 TL' },
];

/* ───────────── Gemi boyaları ───────────── */

const ships: ShipItem[] = [
  { id: 'ship.classic', kind: 'ship', price: 0, look: null },
  {
    id: 'ship.royal',
    kind: 'ship',
    price: 300,
    look: {
      outline: '#0b1430',
      side: '#1f3a8a',
      deck: '#b58a52',
      deck2: '#9a7242',
      castle: '#2a4aa0',
      stripe: '#ffd23f',
      sail: '#ffffff',
      sailShade: '#c9d6f2',
      flag: '#4fe3ff',
    },
  },
  {
    id: 'ship.crimson',
    kind: 'ship',
    price: 400,
    look: {
      outline: '#2a0505',
      side: '#a01818',
      deck: '#7a4a2a',
      deck2: '#5e3820',
      castle: '#7a1010',
      stripe: '#f4e2b0',
      sail: '#e8c0b0',
      sailShade: '#c0402c',
      flag: '#ffd23f',
    },
  },
  {
    id: 'ship.blackpearl',
    kind: 'ship',
    price: 500,
    look: {
      outline: '#000000',
      side: '#1a1a1f',
      deck: '#3a3530',
      deck2: '#2a2622',
      castle: '#24201c',
      stripe: '#8a8a95',
      sail: '#3a3a42',
      sailShade: '#1e1e24',
      flag: '#ff4f6a',
    },
  },
  {
    id: 'ship.ghost',
    kind: 'ship',
    price: 800,
    look: {
      outline: '#0f3b3a',
      side: '#3fa69a',
      deck: '#9fe0d0',
      deck2: '#6cc7b4',
      castle: '#58b8a6',
      stripe: '#d8fff4',
      sail: '#d8fff4',
      sailShade: '#7fd6c2',
      flag: '#b6ff6a',
    },
  },
  {
    id: 'ship.golden',
    kind: 'ship',
    price: 1200,
    look: {
      outline: '#5a3a00',
      side: '#d49a14',
      deck: '#f0c850',
      deck2: '#d8a830',
      castle: '#e8b020',
      stripe: '#fff3b0',
      sail: '#fff8e6',
      sailShade: '#e8d6a0',
      flag: '#ff4f6a',
    },
  },
];

/* ───────────── Gülleler ───────────── */

const balls: BallItem[] = [
  { id: 'ball.iron', kind: 'ball', price: 0, look: null },
  {
    id: 'ball.chain',
    kind: 'ball',
    price: 150,
    look: { body: '#5a5a66', shine: '#d0d0dc', trail: '#9a9aa8' },
  },
  {
    id: 'ball.fire',
    kind: 'ball',
    price: 250,
    look: { body: '#ff6a1a', shine: '#fff3b0', trail: '#ff2a2a' },
  },
  {
    id: 'ball.ice',
    kind: 'ball',
    price: 250,
    look: { body: '#7fd8ff', shine: '#ffffff', trail: '#cdf3ff' },
  },
  {
    id: 'ball.gold',
    kind: 'ball',
    price: 600,
    look: { body: '#f0b820', shine: '#fff8c0', trail: '#ffd23f' },
  },
];

/* ───────────── Alevler ───────────── */

const flames: FlameItem[] = [
  { id: 'flame.classic', kind: 'flame', price: 0, look: null },
  {
    id: 'flame.ghost',
    kind: 'flame',
    price: 300,
    look: {
      glow: '#6ab8ff',
      hot: '#2a7aff',
      core: '#e6f6ff',
      sparks: ['#2a6aff', '#5aa8ff', '#9fd8ff', '#e6f6ff'],
      border: '#4fa8ff',
      shimmer: '#2a7aff',
    },
  },
  {
    id: 'flame.greek',
    kind: 'flame',
    price: 300,
    look: {
      glow: '#9aff6a',
      hot: '#38c82a',
      core: '#f0ffd0',
      sparks: ['#1e9a2a', '#4ad83a', '#b6ff6a', '#f0ffd0'],
      border: '#4ad83a',
      shimmer: '#38c82a',
    },
  },
  {
    id: 'flame.cursed',
    kind: 'flame',
    price: 450,
    look: {
      glow: '#c06aff',
      hot: '#8a2ae0',
      core: '#f6e0ff',
      sparks: ['#6a1ac0', '#a64aff', '#d89aff', '#f6e0ff'],
      border: '#b05aff',
      shimmer: '#8a2ae0',
    },
  },
  {
    id: 'flame.phosphor',
    kind: 'flame',
    price: 450,
    look: {
      glow: '#ffffff',
      hot: '#d8e0ff',
      core: '#ffffff',
      sparks: ['#a0a8d0', '#d8e0ff', '#ffffff', '#fff8d0'],
      border: '#e8ecff',
      shimmer: '#c8d0ff',
    },
  },
];

/* ───────────── Haritalar (deniz) ───────────── */
// [koyu kare, açık kare, parlak köpük, köpük, ızgara çizgisi, ıska karesi, isabet karesi, ıska halkası]

const maps: MapItem[] = [
  { id: 'map.ocean', kind: 'map', price: 0, look: null },
  {
    id: 'map.lagoon',
    kind: 'map',
    price: 400,
    look: {
      night: [
        '#0e4a5a',
        '#11566a',
        '#7ff0e8',
        '#2a9aa8',
        '#5ac8c8',
        '#083640',
        '#4a0f1e',
        '#e0fff8',
      ],
      day: ['#1fc0c8', '#28ccd2', '#d8fffb', '#7ae8e6', '#c8fff8', '#10848c', '#7a1626', '#ffffff'],
    },
  },
  {
    id: 'map.arctic',
    kind: 'map',
    price: 500,
    look: {
      night: [
        '#1e2c4a',
        '#243456',
        '#e6f0ff',
        '#6a80b0',
        '#9ab0d8',
        '#121c32',
        '#4a0f1e',
        '#ffffff',
      ],
      day: ['#9cc8e8', '#a8d2ee', '#ffffff', '#d8ecfa', '#ffffff', '#6a9cc4', '#7a1626', '#ffffff'],
    },
  },
  {
    id: 'map.emerald',
    kind: 'map',
    price: 400,
    look: {
      night: [
        '#0c3a2a',
        '#104634',
        '#7affb8',
        '#2a8a5a',
        '#5ac890',
        '#062a1c',
        '#4a0f1e',
        '#e0fff0',
      ],
      day: ['#2a9a6a', '#30a874', '#c8ffe0', '#6ad8a0', '#c8ffe0', '#1a6a48', '#7a1626', '#ffffff'],
    },
  },
  {
    id: 'map.abyss',
    kind: 'map',
    price: 500,
    look: {
      night: [
        '#120a2a',
        '#180e36',
        '#a07aff',
        '#3a2a7a',
        '#6a4ac0',
        '#08041a',
        '#4a0f1e',
        '#e8dcff',
      ],
      day: ['#3a2a8a', '#44329a', '#d8c8ff', '#7a62d8', '#c8b8ff', '#24186a', '#7a1626', '#ffffff'],
    },
  },
  {
    id: 'map.lava',
    kind: 'map',
    price: 700,
    look: {
      night: [
        '#2a0a06',
        '#360e08',
        '#ffb347',
        '#a02a10',
        '#ff6a2a',
        '#1a0402',
        '#5a0a2a',
        '#ffe0b0',
      ],
      day: ['#6a1a0a', '#7a200e', '#ffd080', '#d84a1a', '#ff9a4a', '#401006', '#3a0a3a', '#fff0d0'],
    },
  },
];

export const CATALOG: readonly CosmeticItem[] = [...ships, ...balls, ...flames, ...maps];

export const DEFAULT_EQUIPPED: Record<CosmeticKind, string> = {
  ship: 'ship.classic',
  ball: 'ball.iron',
  flame: 'flame.classic',
  map: 'map.ocean',
};

export const itemById = (id: string): CosmeticItem | undefined => CATALOG.find((i) => i.id === id);

export const itemsOf = (kind: CosmeticKind): CosmeticItem[] =>
  CATALOG.filter((i) => i.kind === kind);

/** Kuşanılanlardan ızgara görünümü. own: kendi gemilerin (boya uygulanır). */
export function lookFrom(equipped: Record<CosmeticKind, string>, own: boolean): GridLook {
  const pick = <K extends CosmeticKind>(k: K) => itemById(equipped[k] ?? DEFAULT_EQUIPPED[k]);
  const ship = pick('ship') as ShipItem | undefined;
  const ball = pick('ball') as BallItem | undefined;
  const flame = pick('flame') as FlameItem | undefined;
  const map = pick('map') as MapItem | undefined;
  return {
    ship: own ? (ship?.look ?? undefined) : undefined,
    ball: ball?.look ?? undefined,
    flame: flame?.look ?? undefined,
    sea: map?.look ?? undefined,
  };
}

/** Maç sonu altın değişimi. */
export function goldDelta(params: {
  won: boolean;
  mode: 'ai' | 'hotseat' | 'online';
  level?: 'easy' | 'normal' | 'hard';
}): number {
  if (params.mode === 'hotseat') return 0;
  if (!params.won) return -ECONOMY.loss;
  return params.mode === 'online' ? ECONOMY.win.online : ECONOMY.win[params.level ?? 'normal'];
}
