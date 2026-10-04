import { describe, expect, it } from 'vitest';
import { fireSlope, glide, hasDragonFriend, helperSpot, helperTarget } from './helper';

describe('helperTarget', () => {
  it('picks the closest enemy in range', () => {
    const enemies = [
      { x: 900, y: 450 },
      { x: 500, y: 450 },
      { x: 2000, y: 450 },
    ];
    expect(helperTarget(300, enemies, 500)).toEqual({ x: 500, y: 450 });
  });

  it('ignores enemies too far away', () => {
    expect(helperTarget(0, [{ x: 900, y: 450 }], 500)).toBeNull();
  });
});

describe('helper flying', () => {
  it('stays behind you', () => {
    expect(helperSpot(1000, 1, 60, 0, 10).x).toBe(940);
    expect(helperSpot(1000, -1, 60, 0, 10).x).toBe(1060);
  });

  it('glides toward where it wants to be', () => {
    expect(glide(0, 100, 0.25)).toBe(25);
    expect(glide(0, 100, 2)).toBe(100);
  });

  it('aims its fire gently up or down', () => {
    expect(fireSlope(200, 100, 1)).toBe(0.5);
    expect(fireSlope(-200, 100, 1)).toBe(0.5);
    expect(fireSlope(10, 500, 1)).toBe(1);
  });
});

describe('hasDragonFriend', () => {
  it('joins you from the chapter after the egg hatches', () => {
    expect(hasDragonFriend(14, 15)).toBe(false);
    expect(hasDragonFriend(15, 15)).toBe(true);
  });
});
