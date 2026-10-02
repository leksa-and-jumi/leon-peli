import { describe, expect, it } from 'vitest';
import { clamp, randomPosition } from './bounds';

describe('clamp', () => {
  it('keeps values inside the range', () => {
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(15, 0, 10)).toBe(10);
  });

  it('rejects an inverted range', () => {
    expect(() => clamp(1, 10, 0)).toThrow(RangeError);
  });
});

describe('randomPosition', () => {
  it('keeps the object fully inside the area', () => {
    expect(randomPosition(100, 50, 10, () => 0)).toEqual({ x: 5, y: 5 });
    expect(randomPosition(100, 50, 10, () => 1)).toEqual({ x: 95, y: 45 });
  });
});
