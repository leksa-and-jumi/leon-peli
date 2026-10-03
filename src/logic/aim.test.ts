import { describe, expect, it } from 'vitest';
import { aimAngle, turnAround, turnToward } from './aim';

describe('aimAngle', () => {
  it('aims straight ahead at someone at the same height', () => {
    expect(aimAngle({ x: 700, y: 480 }, { x: 100, y: 480 }, -1, 1)).toBeCloseTo(0);
  });

  it('aims up at someone higher up, and down at someone lower', () => {
    expect(aimAngle({ x: 700, y: 480 }, { x: 100, y: 300 }, -1, 1)).toBeLessThan(0);
    expect(aimAngle({ x: 700, y: 480 }, { x: 100, y: 540 }, -1, 1)).toBeGreaterThan(0);
  });

  it('never aims further than the limit', () => {
    expect(aimAngle({ x: 700, y: 480 }, { x: 690, y: 0 }, -1, 0.8)).toBe(-0.8);
  });
});

describe('turnToward', () => {
  it('moves only a little step at a time', () => {
    expect(turnToward(0, 1, 0.1)).toBeCloseTo(0.1);
    expect(turnToward(0, -1, 0.1)).toBeCloseTo(-0.1);
  });

  it('stops exactly on the target', () => {
    expect(turnToward(0.95, 1, 0.1)).toBe(1);
  });
});

describe('turnAround', () => {
  it('turning down moves a hand in front lower, whichever way you face', () => {
    const right = turnAround({ x: 30, y: 0 }, { x: 0, y: 0 }, Math.PI / 2, 1);
    expect(right.x).toBeCloseTo(0);
    expect(right.y).toBeCloseTo(30);
    const left = turnAround({ x: -30, y: 0 }, { x: 0, y: 0 }, Math.PI / 2, -1);
    expect(left.x).toBeCloseTo(0);
    expect(left.y).toBeCloseTo(30);
  });

  it('turning up lifts it', () => {
    expect(turnAround({ x: -30, y: 0 }, { x: 0, y: 0 }, -0.5, -1).y).toBeLessThan(0);
  });
});
