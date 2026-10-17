import { describe, expect, it } from 'vitest';

import { CATALOG, DEFAULT_EQUIPPED, ECONOMY, goldDelta, itemById, lookFrom } from './catalog';

describe('altın ekonomisi', () => {
  it('CPU zaferi zorluğa göre ödüllendirir', () => {
    expect(goldDelta({ won: true, mode: 'ai', level: 'easy' })).toBe(ECONOMY.win.easy);
    expect(goldDelta({ won: true, mode: 'ai', level: 'hard' })).toBe(ECONOMY.win.hard);
  });
  it('çevrimiçi zafer en yüksek ödül, yenilgi ceza', () => {
    expect(goldDelta({ won: true, mode: 'online' })).toBe(ECONOMY.win.online);
    expect(goldDelta({ won: false, mode: 'online' })).toBe(-ECONOMY.loss);
  });
  it('aynı cihazda altın değişmez', () => {
    expect(goldDelta({ won: true, mode: 'hotseat' })).toBe(0);
    expect(goldDelta({ won: false, mode: 'hotseat' })).toBe(0);
  });
});

describe('katalog', () => {
  it('kimlikler benzersiz ve her türün ücretsiz bir varsayılanı var', () => {
    const ids = CATALOG.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of Object.values(DEFAULT_EQUIPPED)) expect(itemById(id)?.price).toBe(0);
  });
  it('gemi boyası yalnız kendi ızgarana uygulanır', () => {
    const eq = { ...DEFAULT_EQUIPPED, ship: 'ship.golden', map: 'map.lava' };
    expect(lookFrom(eq, true).ship).toBeDefined();
    expect(lookFrom(eq, false).ship).toBeUndefined();
    expect(lookFrom(eq, false).sea).toBeDefined();
  });
  it('varsayılan kuşanımda özel görünüm yok', () => {
    const look = lookFrom(DEFAULT_EQUIPPED, true);
    expect(look).toEqual({ ship: undefined, ball: undefined, flame: undefined, sea: undefined });
  });
});
