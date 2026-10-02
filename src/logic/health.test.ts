import { describe, expect, it } from 'vitest';
import { healthFraction } from './health';

describe('healthFraction', () => {
  it('is full at the start', () => {
    expect(healthFraction(10, 10)).toBe(1);
  });

  it('goes down with every hit', () => {
    expect(healthFraction(7, 10)).toBeCloseTo(0.7);
  });

  it('never goes below empty', () => {
    expect(healthFraction(-1, 10)).toBe(0);
  });
});
