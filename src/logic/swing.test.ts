import { describe, expect, it } from 'vitest';
import { supportHand, swooshArc, weaponTilt } from './swing';

describe('swooshArc', () => {
  const shoulder = { x: 0, y: 0 };

  it('goes from behind the head over the top to the front, facing right', () => {
    const arc = swooshArc(shoulder, { x: -10, y: -30 }, { x: 40, y: 10 }, 1, 40);
    expect(arc.start).toBeLessThan(-Math.PI / 2);
    expect(arc.end).toBeGreaterThan(0);
    expect(arc.anticlockwise).toBe(false);
  });

  it('turns the other way when facing left', () => {
    const arc = swooshArc(shoulder, { x: 10, y: -30 }, { x: -40, y: 10 }, -1, 40);
    expect(arc.anticlockwise).toBe(true);
  });

  it('reaches past the farthest hand by the weapon length', () => {
    const arc = swooshArc(shoulder, { x: 0, y: -30 }, { x: 40, y: 0 }, 1, 25);
    expect(arc.radius).toBe(65);
    expect(arc.center).toEqual(shoulder);
  });
});

describe('supportHand', () => {
  it('sits just behind and under the gun hand, on the right side', () => {
    expect(supportHand({ x: 30, y: -80 }, 1)).toEqual({ x: 23, y: -75 });
    expect(supportHand({ x: -30, y: -80 }, -1)).toEqual({ x: -23, y: -75 });
  });
});

describe('weaponTilt', () => {
  const shoulder = { x: 0, y: 0 };

  it('stays upright when the arm points straight up', () => {
    expect(weaponTilt(shoulder, { x: 0, y: -30 }, 1)).toBeCloseTo(0);
  });

  it('tips forward when the arm points forward, whichever way you face', () => {
    expect(weaponTilt(shoulder, { x: 30, y: 0 }, 1)).toBeCloseTo(Math.PI / 2);
    expect(weaponTilt(shoulder, { x: -30, y: 0 }, -1)).toBeCloseTo(Math.PI / 2);
  });

  it('tips back when the hand is behind the head', () => {
    expect(weaponTilt(shoulder, { x: -15, y: -30 }, 1)).toBeLessThan(0);
  });
});
