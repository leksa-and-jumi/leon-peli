import { describe, expect, it } from 'vitest';
import { floatedAway, nextBubbleDelay, riseStep, touches } from './bubbles';

const rules = { riseSpeed: 100, wobble: 10, wobbleSpeed: 2 };

describe('riseStep', () => {
  it('floats up at its speed', () => {
    const b = riseStep({ baseX: 200, x: 200, y: 500, age: 0, phase: 0 }, 500, rules);
    expect(b.y).toBe(450);
    expect(b.age).toBe(0.5);
  });

  it('sways around its middle but never further than the wobble', () => {
    let b = { baseX: 200, x: 200, y: 500, age: 0, phase: 1 };
    for (let i = 0; i < 50; i++) {
      b = riseStep(b, 37, rules);
      expect(Math.abs(b.x - 200)).toBeLessThanOrEqual(10);
    }
  });
});

describe('floatedAway', () => {
  it('is gone only when fully above the screen', () => {
    expect(floatedAway({ baseX: 0, x: 0, y: -10, age: 0, phase: 0 }, 20)).toBe(false);
    expect(floatedAway({ baseX: 0, x: 0, y: -25, age: 0, phase: 0 }, 20)).toBe(true);
  });
});

describe('touches', () => {
  const box = { left: 100, right: 140, top: 400, bottom: 520 };

  it('catches a bubble touching the box', () => {
    expect(touches({ x: 120, y: 450, radius: 18 }, box)).toBe(true);
    expect(touches({ x: 155, y: 450, radius: 18 }, box)).toBe(true);
    expect(touches({ x: 120, y: 385, radius: 18 }, box)).toBe(true);
  });

  it('misses a bubble that is too far away', () => {
    expect(touches({ x: 170, y: 450, radius: 18 }, box)).toBe(false);
    expect(touches({ x: 155, y: 385, radius: 18 }, box)).toBe(false);
  });
});

describe('nextBubbleDelay', () => {
  it('is somewhere between the shortest and longest wait', () => {
    expect(nextBubbleDelay(0, 5000, 15000)).toBe(5000);
    expect(nextBubbleDelay(1, 5000, 15000)).toBe(15000);
    expect(nextBubbleDelay(0.5, 5000, 15000)).toBe(10000);
    expect(nextBubbleDelay(7, 5000, 15000)).toBe(15000);
  });
});
