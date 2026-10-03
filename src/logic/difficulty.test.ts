import { describe, expect, it } from 'vitest';
import { enemyFor, type DifficultyRules } from './difficulty';

const easy: DifficultyRules = { specials: [], whiteLives: 2 };
const normal: DifficultyRules = {
  specials: [
    { every: 30, kind: 'giant' },
    { every: 15, kind: 'boss' },
  ],
  whiteLives: 3,
};
const hard: DifficultyRules = {
  specials: [
    { every: 30, kind: 'giant' },
    { every: 10, kind: 'boss', lives: 10 },
    { every: 5, kind: 'boss', lives: 5 },
  ],
  whiteLives: 3,
};

describe('enemyFor', () => {
  it('easy only has white ones with 2 lives', () => {
    for (const n of [1, 15, 30]) expect(enemyFor(easy, n)).toEqual({ kind: 'white', lives: 2 });
  });

  it('normal has the axe guy every 15th and the giant every 30th', () => {
    expect(enemyFor(normal, 15)).toEqual({ kind: 'boss' });
    expect(enemyFor(normal, 30)).toEqual({ kind: 'giant' });
    expect(enemyFor(normal, 7)).toEqual({ kind: 'white', lives: 3 });
  });

  it('hard: a 5-hit red guy every 5th, a 10-hit one every 10th, the giant every 30th', () => {
    expect(enemyFor(hard, 5)).toEqual({ kind: 'boss', lives: 5 });
    expect(enemyFor(hard, 15)).toEqual({ kind: 'boss', lives: 5 });
    expect(enemyFor(hard, 10)).toEqual({ kind: 'boss', lives: 10 });
    expect(enemyFor(hard, 20)).toEqual({ kind: 'boss', lives: 10 });
    expect(enemyFor(hard, 30)).toEqual({ kind: 'giant' });
    expect(enemyFor(hard, 4)).toEqual({ kind: 'white', lives: 3 });
  });
});
