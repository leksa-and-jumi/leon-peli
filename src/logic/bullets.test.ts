import { describe, expect, it } from 'vitest';
import { moveBullets } from './bullets';

describe('moveBullets', () => {
  it('moves bullets to the right by speed × time', () => {
    expect(moveBullets([{ x: 100, y: 50 }], 1000, 16, 800)).toEqual([{ x: 116, y: 50 }]);
  });

  it('removes bullets that fly off the screen', () => {
    const bullets = [
      { x: 790, y: 50 },
      { x: 200, y: 60 },
    ];
    expect(moveBullets(bullets, 1000, 16, 800)).toEqual([{ x: 216, y: 60 }]);
  });

  it('does not change the old list', () => {
    const bullets = [{ x: 10, y: 10 }];
    moveBullets(bullets, 1000, 16, 800);
    expect(bullets).toEqual([{ x: 10, y: 10 }]);
  });

  it('rejects a speed of zero', () => {
    expect(() => moveBullets([], 0, 16, 800)).toThrow(RangeError);
  });
});
