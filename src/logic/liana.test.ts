import { describe, expect, it } from 'vitest';
import {
  canGrab,
  flightTime,
  flipSpin,
  flipTucked,
  pendulumStep,
  releaseVelocity,
  ropeEnd,
  type SwingRules,
} from './liana';

const rules: SwingRules = { gravity: 1400, length: 300, push: 3, damping: 0.2, maxAngle: 1.1 };

describe('pendulumStep', () => {
  it('swings back toward the middle by itself', () => {
    const next = pendulumStep({ angle: 0.5, speed: 0 }, 0, 50, rules);
    expect(next.speed).toBeLessThan(0);
  });

  it('pushing with D makes it swing right', () => {
    const next = pendulumStep({ angle: 0, speed: 0 }, 1, 100, rules);
    expect(next.angle).toBeGreaterThan(0);
  });

  it('never swings past the limit', () => {
    let swing = { angle: 0, speed: 0 };
    for (let i = 0; i < 500; i++) swing = pendulumStep(swing, 1, 16, rules);
    expect(Math.abs(swing.angle)).toBeLessThanOrEqual(rules.maxAngle);
  });
});

describe('ropeEnd', () => {
  it('hangs straight down at angle 0', () => {
    expect(ropeEnd({ x: 100, y: 50 }, 300, 0)).toEqual({ x: 100, y: 350 });
  });

  it('moves right when leaning right', () => {
    expect(ropeEnd({ x: 100, y: 50 }, 300, 0.5).x).toBeGreaterThan(100);
  });
});

describe('releaseVelocity', () => {
  it('flies right when let go while swinging right at the bottom', () => {
    const v = releaseVelocity({ angle: 0, speed: 2 }, 300);
    expect(v.vx).toBeCloseTo(600);
    expect(v.vy).toBeCloseTo(0);
  });

  it('flies up when let go while swinging up on the right', () => {
    expect(releaseVelocity({ angle: 0.6, speed: 2 }, 300).vy).toBeLessThan(0);
  });
});

describe('canGrab', () => {
  const end = { x: 250, y: 390 };

  it('grabs when the hands reach the end and are close', () => {
    expect(canGrab(260, 380, end, 30, 15)).toBe(true);
  });

  it('misses when too low or too far', () => {
    expect(canGrab(260, 450, end, 30, 15)).toBe(false);
    expect(canGrab(320, 380, end, 30, 15)).toBe(false);
  });
});

describe('flightTime', () => {
  it('falls from a height', () => {
    // Half a second to fall 175 px with gravity 1400
    expect(flightTime(175, 0, 1400)).toBeCloseTo(0.5);
  });

  it('takes longer when thrown upward', () => {
    expect(flightTime(100, 400, 1400)).toBeGreaterThan(flightTime(100, 0, 1400));
  });
});

describe('flipSpin', () => {
  it('goes from upright to one full turn', () => {
    expect(flipSpin(0)).toBe(0);
    expect(flipSpin(1)).toBeCloseTo(Math.PI * 2);
    expect(flipSpin(0.5)).toBeCloseTo(Math.PI);
  });

  it('spins fastest in the middle', () => {
    const start = flipSpin(0.1) - flipSpin(0);
    const middle = flipSpin(0.55) - flipSpin(0.45);
    expect(middle).toBeGreaterThan(start);
  });

  it('stays between no turn and one turn outside 0..1', () => {
    expect(flipSpin(-1)).toBe(0);
    expect(flipSpin(2)).toBeCloseTo(Math.PI * 2);
  });
});

describe('flipTucked', () => {
  it('tucks only in the middle of the flight', () => {
    expect(flipTucked(0.05, 0.12, 0.85)).toBe(false);
    expect(flipTucked(0.5, 0.12, 0.85)).toBe(true);
    expect(flipTucked(0.9, 0.12, 0.85)).toBe(false);
  });
});
