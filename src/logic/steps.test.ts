import { describe, expect, it } from 'vitest';
import { stepsBetween } from './steps';

describe('stepsBetween', () => {
  it('counts a step when the walk passes half a turn', () => {
    expect(stepsBetween(3, 3.2)).toBe(1);
  });

  it('counts nothing in the middle of a step', () => {
    expect(stepsBetween(0.5, 1)).toBe(0);
  });

  it('counts two steps in one full turn', () => {
    expect(stepsBetween(0.1, 0.1 + Math.PI * 2)).toBe(2);
  });

  it('counts nothing when standing still', () => {
    expect(stepsBetween(1, 1)).toBe(0);
  });
});
