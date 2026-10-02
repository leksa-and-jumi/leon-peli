import { describe, expect, it } from 'vitest';
import { isBossTurn } from './spawn';

describe('isBossTurn', () => {
  it('makes every 15th enemy the boss', () => {
    expect(isBossTurn(15, 15)).toBe(true);
    expect(isBossTurn(30, 15)).toBe(true);
  });

  it('keeps the others as white stick figures', () => {
    expect(isBossTurn(1, 15)).toBe(false);
    expect(isBossTurn(14, 15)).toBe(false);
    expect(isBossTurn(16, 15)).toBe(false);
  });

  it('rejects zero', () => {
    expect(() => isBossTurn(1, 0)).toThrow(RangeError);
  });
});
