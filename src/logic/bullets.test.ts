import { describe, expect, it } from 'vitest';
import { bulletHits, moveBullets, screenArea, type Bullet } from './bullets';

describe('moveBullets', () => {
  it('moves right-flying bullets to the right by speed × time', () => {
    expect(moveBullets([{ x: 100, y: 50, direction: 1 }], 1000, 16, screenArea(800, 600))).toEqual([
      { x: 116, y: 50, direction: 1 },
    ]);
  });

  it('moves left-flying bullets to the left', () => {
    expect(moveBullets([{ x: 100, y: 50, direction: -1 }], 1000, 16, screenArea(800, 600))).toEqual(
      [{ x: 84, y: 50, direction: -1 }],
    );
  });

  it('removes bullets that fly off either side of the screen', () => {
    const bullets: Bullet[] = [
      { x: 790, y: 50, direction: 1 },
      { x: 10, y: 50, direction: -1 },
      { x: 200, y: 60, direction: 1 },
    ];
    expect(moveBullets(bullets, 1000, 16, screenArea(800, 600))).toEqual([
      { x: 216, y: 60, direction: 1 },
    ]);
  });

  it('does not change the old list', () => {
    const bullets: Bullet[] = [{ x: 10, y: 10, direction: 1 }];
    moveBullets(bullets, 1000, 16, screenArea(800, 600));
    expect(bullets).toEqual([{ x: 10, y: 10, direction: 1 }]);
  });

  it('rejects a speed of zero', () => {
    expect(() => moveBullets([], 0, 16, screenArea(800, 600))).toThrow(RangeError);
  });
});

describe('bulletHits', () => {
  const size = { width: 10, height: 4 };
  const box = { left: 100, right: 140, top: 400, bottom: 500 };

  it('hits when the bullet is inside the box', () => {
    expect(bulletHits({ x: 120, y: 450, direction: -1 }, size, box)).toBe(true);
  });

  it('hits when only the tip touches', () => {
    expect(bulletHits({ x: 144, y: 450, direction: -1 }, size, box)).toBe(true);
  });

  it('misses when the bullet flies over the box', () => {
    expect(bulletHits({ x: 120, y: 395, direction: -1 }, size, box)).toBe(false);
  });

  it('misses when the bullet is still far away', () => {
    expect(bulletHits({ x: 300, y: 450, direction: -1 }, size, box)).toBe(false);
  });
});

describe('aimed bullets', () => {
  it('fly along their slope at the same speed', () => {
    const [b] = moveBullets(
      [{ x: 700, y: 400, direction: -1, slope: -0.75 }],
      1000,
      100,
      screenArea(800, 600),
    );
    expect(b?.x).toBeCloseTo(620);
    expect(b?.y).toBeCloseTo(340);
  });

  it('are gone when they fly off the top or bottom', () => {
    expect(
      moveBullets([{ x: 400, y: 10, direction: -1, slope: -1 }], 1000, 100, screenArea(800, 600)),
    ).toEqual([]);
    expect(
      moveBullets([{ x: 400, y: 590, direction: -1, slope: 1 }], 1000, 100, screenArea(800, 600)),
    ).toEqual([]);
  });
});
