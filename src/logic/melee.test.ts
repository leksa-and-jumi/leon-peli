import { describe, expect, it } from 'vitest';
import { inReach } from './melee';

describe('inReach', () => {
  it('hits someone close in front', () => {
    expect(inReach(100, 1, 160, 80)).toBe(true);
    expect(inReach(100, -1, 40, 80)).toBe(true);
  });

  it('misses someone behind or too far', () => {
    expect(inReach(100, 1, 40, 80)).toBe(false);
    expect(inReach(100, 1, 250, 80)).toBe(false);
  });
});
