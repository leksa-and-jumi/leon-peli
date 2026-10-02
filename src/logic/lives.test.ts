import { describe, expect, it } from 'vitest';
import { formatLives, loseLife } from './lives';

describe('loseLife', () => {
  it('takes one life', () => {
    expect(loseLife(4)).toBe(3);
  });

  it('never goes below zero', () => {
    expect(loseLife(0)).toBe(0);
    expect(loseLife(1, 2)).toBe(0);
  });

  it('a giant smash takes two lives', () => {
    expect(loseLife(4, 2)).toBe(2);
  });
});

describe('formatLives', () => {
  it('shows a red heart for every life left', () => {
    expect(formatLives(4, 4)).toBe('❤️❤️❤️❤️');
  });

  it('shows white hearts for lost lives', () => {
    expect(formatLives(1, 4)).toBe('❤️🤍🤍🤍');
  });

  it('shows extra red hearts for lives bought in the shop', () => {
    expect(formatLives(5, 4)).toBe('❤️❤️❤️❤️❤️');
  });

  it('rejects negative lives', () => {
    expect(() => formatLives(-1, 4)).toThrow(RangeError);
  });
});
