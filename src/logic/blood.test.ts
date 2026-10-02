import { describe, expect, it } from 'vitest';
import { dropShape, stepDrop } from './blood';

describe('stepDrop', () => {
  it('moves with its speed', () => {
    const d = stepDrop({ x: 0, y: 0, vx: 100, vy: 0 }, 500, 0);
    expect(d.x).toBe(50);
    expect(d.y).toBe(0);
  });

  it('is pulled down by gravity', () => {
    const d = stepDrop({ x: 0, y: 0, vx: 0, vy: -100 }, 1000, 200);
    expect(d.vy).toBe(100);
    expect(d.y).toBe(100);
  });
});

describe('dropShape', () => {
  it('points the way it flies', () => {
    expect(dropShape(10, 0, 3).angle).toBe(0);
    expect(dropShape(0, 10, 3).angle).toBeCloseTo(Math.PI / 2);
  });

  it('stretches more when faster, but not too much', () => {
    expect(dropShape(0, 0, 3).stretch).toBe(1);
    expect(dropShape(400, 0, 3).stretch).toBe(2);
    expect(dropShape(5000, 0, 3).stretch).toBe(3);
  });
});
