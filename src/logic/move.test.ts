import { describe, expect, it } from 'vitest';
import { moveDirection, moveX } from './move';

describe('moveDirection', () => {
  it('A goes left and D goes right', () => {
    expect(moveDirection(true, false)).toBe(-1);
    expect(moveDirection(false, true)).toBe(1);
  });

  it('stands still with no keys or both keys', () => {
    expect(moveDirection(false, false)).toBe(0);
    expect(moveDirection(true, true)).toBe(0);
  });
});

describe('moveX', () => {
  it('moves by speed × time', () => {
    expect(moveX(100, 1, 200, 500, 0, 800)).toBe(200);
    expect(moveX(100, -1, 200, 250, 0, 800)).toBe(50);
  });

  it('does not walk off the edges', () => {
    expect(moveX(50, -1, 200, 1000, 40, 600)).toBe(40);
    expect(moveX(590, 1, 200, 1000, 40, 600)).toBe(600);
  });

  it('stays put when not moving', () => {
    expect(moveX(100, 0, 200, 1000, 0, 800)).toBe(100);
  });
});
