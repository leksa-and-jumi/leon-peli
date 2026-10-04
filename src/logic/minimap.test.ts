import { describe, expect, it } from 'vitest';
import { mapX } from './minimap';

describe('mapX', () => {
  const bounds = { left: -1000, right: 1000 };

  it('puts the walls at the ends of the map and the middle in the middle', () => {
    expect(mapX(-1000, bounds, 300)).toBe(0);
    expect(mapX(1000, bounds, 300)).toBe(300);
    expect(mapX(0, bounds, 300)).toBe(150);
  });

  it('keeps things beyond the walls on the map', () => {
    expect(mapX(-5000, bounds, 300)).toBe(0);
    expect(mapX(5000, bounds, 300)).toBe(300);
  });
});
