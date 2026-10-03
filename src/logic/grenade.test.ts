import { describe, expect, it } from 'vitest';
import { stepDrop } from './blood';
import { grenadeAfterShots, inBlast, throwVelocity } from './grenade';

describe('throwVelocity', () => {
  it('lands where it was thrown', () => {
    const v = throwVelocity(300, 0, 1000, 1200);
    let drop = { x: 0, y: 0, ...v };
    for (let i = 0; i < 100; i++) drop = stepDrop(drop, 10, 1200);
    expect(drop.x).toBeCloseTo(300);
    expect(Math.abs(drop.y)).toBeLessThan(10);
  });

  it('flies up first', () => {
    expect(throwVelocity(300, 0, 1000, 1200).vy).toBeLessThan(0);
  });

  it('rejects a flight time of zero', () => {
    expect(() => throwVelocity(1, 0, 0, 1200)).toThrow(RangeError);
  });
});

describe('inBlast', () => {
  it('hurts things close to the blast, not far away', () => {
    expect(inBlast(100, 150, 80)).toBe(true);
    expect(inBlast(300, 150, 80)).toBe(false);
  });
});

describe('grenadeAfterShots', () => {
  it('throws after every 10th shot', () => {
    expect(grenadeAfterShots(9, 10)).toBe(false);
    expect(grenadeAfterShots(10, 10)).toBe(true);
    expect(grenadeAfterShots(20, 10)).toBe(true);
    expect(grenadeAfterShots(0, 10)).toBe(false);
  });
});
