import { describe, expect, it } from 'vitest';
import { mixRgb, skyTintAt } from './sky';

describe('mixRgb', () => {
  it('mixes each colour channel', () => {
    expect(mixRgb(0x000000, 0xffffff, 0)).toBe(0x000000);
    expect(mixRgb(0x000000, 0xffffff, 1)).toBe(0xffffff);
    expect(mixRgb(0xff0000, 0x0000ff, 0.5)).toBe(0x800080);
  });
});

describe('skyTintAt', () => {
  const stops = [
    { color: 0x000000, alpha: 0 },
    { color: 0xff0000, alpha: 0.4 },
  ];

  it('starts at the first stop and reaches the next halfway round', () => {
    expect(skyTintAt(0, 1000, stops)).toEqual({ color: 0x000000, alpha: 0 });
    expect(skyTintAt(500, 1000, stops)).toEqual({ color: 0xff0000, alpha: 0.4 });
  });

  it('goes round and round', () => {
    expect(skyTintAt(1000, 1000, stops)).toEqual(skyTintAt(0, 1000, stops));
    expect(skyTintAt(1250, 1000, stops)).toEqual(skyTintAt(250, 1000, stops));
  });

  it('is in between while gliding', () => {
    const mid = skyTintAt(250, 1000, stops);
    expect(mid.alpha).toBeGreaterThan(0);
    expect(mid.alpha).toBeLessThan(0.4);
  });
});
