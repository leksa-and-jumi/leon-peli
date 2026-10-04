import { describe, expect, it } from 'vitest';
import { countsFor, goalDone, goalProgress, nextChapter } from './story';

describe('story goals', () => {
  const fiveWhite = { type: 'break', kind: 'white', count: 5 } as const;

  it('count the right kind of enemy', () => {
    expect(countsFor(fiveWhite, 'white')).toBe(true);
    expect(countsFor(fiveWhite, 'boss')).toBe(false);
  });

  it('are done when enough are broken', () => {
    expect(goalProgress(fiveWhite, 3, false)).toEqual({ done: 3, needed: 5 });
    expect(goalDone(fiveWhite, 4, false)).toBe(false);
    expect(goalDone(fiveWhite, 5, false)).toBe(true);
    expect(goalProgress(fiveWhite, 9, false).done).toBe(5);
  });

  it('a door goal is done by going through the door', () => {
    expect(goalDone({ type: 'door' }, 10, false)).toBe(false);
    expect(goalDone({ type: 'door' }, 0, true)).toBe(true);
  });
});

describe('nextChapter', () => {
  it('goes on until the last chapter', () => {
    expect(nextChapter(0, 5)).toBe(1);
    expect(nextChapter(4, 5)).toBeNull();
  });
});
