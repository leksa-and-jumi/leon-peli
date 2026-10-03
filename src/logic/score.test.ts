import { describe, expect, it } from 'vitest';
import { addPoints, formatBest, formatScore } from './score';

describe('addPoints', () => {
  it('adds points to the score', () => {
    expect(addPoints(2, 3)).toBe(5);
  });

  it('rejects negative points', () => {
    expect(() => addPoints(0, -1)).toThrow(RangeError);
  });
});

describe('formatScore', () => {
  it('shows the score with a star, so no reading is needed', () => {
    expect(formatScore(7)).toBe('⭐ 7');
  });
});

describe('formatBest', () => {
  it('shows the record in English and Finnish', () => {
    expect(formatBest(12)).toBe('🏆 Best / Ennätys: 12');
  });
});
