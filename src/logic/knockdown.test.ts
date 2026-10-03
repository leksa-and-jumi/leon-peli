import { describe, expect, it } from 'vitest';
import { bumps, knockdownAt } from './knockdown';

const times = { fallMs: 300, lieMs: 700, riseMs: 400 };

describe('knockdownAt', () => {
  it('starts upright and falls flat', () => {
    expect(knockdownAt(0, times)).toEqual({ tip: 0, phase: 'fall' });
    expect(knockdownAt(150, times).tip).toBeCloseTo(0.25);
    expect(knockdownAt(300, times)).toEqual({ tip: 1, phase: 'lie' });
  });

  it('lies still for a moment', () => {
    expect(knockdownAt(900, times)).toEqual({ tip: 1, phase: 'lie' });
  });

  it('gets back up by itself and is done', () => {
    const rising = knockdownAt(1200, times);
    expect(rising.phase).toBe('rise');
    expect(rising.tip).toBeGreaterThan(0);
    expect(rising.tip).toBeLessThan(1);
    expect(knockdownAt(1400, times)).toEqual({ tip: 0, phase: 'done' });
  });
});

describe('bumps', () => {
  const box = { left: 100, right: 140, top: 400, bottom: 550 };

  it('hits when the point is inside the box or just next to it', () => {
    expect(bumps({ x: 120, y: 480 }, box, 0)).toBe(true);
    expect(bumps({ x: 150, y: 480 }, box, 12)).toBe(true);
  });

  it('misses when flying over or far away', () => {
    expect(bumps({ x: 120, y: 350 }, box, 12)).toBe(false);
    expect(bumps({ x: 300, y: 480 }, box, 12)).toBe(false);
  });
});
