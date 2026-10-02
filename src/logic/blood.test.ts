import { describe, expect, it } from 'vitest';
import { bounceOnGround, dropShape, stepDrop } from './blood';

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

describe('bounceOnGround', () => {
  it('flies on while above the ground', () => {
    const d = { x: 0, y: 10, vx: 5, vy: 100 };
    expect(bounceOnGround(d, 50, 0.4, 30)).toEqual({ drop: d, resting: false });
  });

  it('bounces up slower when it hits the ground', () => {
    const { drop, resting } = bounceOnGround({ x: 0, y: 52, vx: 50, vy: 200 }, 50, 0.4, 30);
    expect(resting).toBe(false);
    expect(drop.y).toBe(50);
    expect(drop.vy).toBe(-80);
    expect(drop.vx).toBe(30);
  });

  it('stops when the bounce would be tiny', () => {
    const { drop, resting } = bounceOnGround({ x: 3, y: 51, vx: 50, vy: 50 }, 50, 0.4, 30);
    expect(resting).toBe(true);
    expect(drop).toEqual({ x: 3, y: 50, vx: 0, vy: 0 });
  });
});
