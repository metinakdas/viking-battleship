import { describe, expect, it } from 'vitest';

import { safeNextPath } from './navigation';

describe('safeNextPath', () => {
  it('uygulama içi yolları kabul eder', () => {
    expect(safeNextPath('/room/ABC123')).toBe('/room/ABC123');
    expect(safeNextPath('/game/x?y=1')).toBe('/game/x?y=1');
  });

  it('dış adresleri ve bozuk girdiyi reddeder', () => {
    expect(safeNextPath('//evil.com')).toBe('/lobby');
    expect(safeNextPath('https://evil.com')).toBe('/lobby');
    expect(safeNextPath('/\\evil.com')).toBe('/lobby');
    expect(safeNextPath(undefined)).toBe('/lobby');
    expect(safeNextPath(['/room/A'])).toBe('/lobby');
    expect(safeNextPath('/')).toBe('/lobby');
  });
});
