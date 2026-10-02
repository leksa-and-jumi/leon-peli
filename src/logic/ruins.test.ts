import { describe, expect, it } from 'vitest';
import { buildBrokenWall, createRandom, mixColor, scatterRubble, type WallOptions } from './ruins';

const wall: WallOptions = {
  x: 100,
  groundY: 500,
  width: 200,
  blockWidth: 40,
  blockHeight: 20,
  minRows: 2,
  maxRows: 6,
};

describe('createRandom', () => {
  it('gives the same numbers for the same seed', () => {
    const a = createRandom(42);
    const b = createRandom(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it('stays between 0 and 1', () => {
    const random = createRandom(7);
    for (let i = 0; i < 1000; i++) {
      const value = random();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe('buildBrokenWall', () => {
  it('keeps every stone inside the wall', () => {
    const blocks = buildBrokenWall(wall, createRandom(1));
    for (const block of blocks) {
      expect(block.x).toBeGreaterThanOrEqual(wall.x);
      expect(block.x + block.width).toBeLessThanOrEqual(wall.x + wall.width);
      expect(block.y + block.height).toBeLessThanOrEqual(wall.groundY);
      expect(block.y).toBeGreaterThanOrEqual(wall.groundY - wall.maxRows * wall.blockHeight);
    }
  });

  it('always has the bottom rows standing', () => {
    const blocks = buildBrokenWall(wall, createRandom(3));
    const bottomRowWidth = blocks
      .filter((b) => b.y === wall.groundY - wall.blockHeight)
      .reduce((sum, b) => sum + b.width, 0);
    expect(bottomRowWidth).toBe(wall.width);
  });

  it('is broken: never more stones than a full wall', () => {
    const blocks = buildBrokenWall(wall, createRandom(5));
    const fullArea = wall.width * wall.maxRows * wall.blockHeight;
    const area = blocks.reduce((sum, b) => sum + b.width * b.height, 0);
    expect(area).toBeLessThanOrEqual(fullArea);
    expect(area).toBeGreaterThanOrEqual(wall.width * wall.minRows * wall.blockHeight);
  });

  it('never has floating stones', () => {
    for (let seed = 0; seed < 20; seed++) {
      const blocks = buildBrokenWall(wall, createRandom(seed));
      for (const block of blocks) {
        if (block.y + block.height === wall.groundY) continue;
        const below = blocks.filter((b) => b.y === block.y + block.height);
        for (let px = block.x + 1; px < block.x + block.width; px++) {
          expect(below.some((b) => b.x <= px && b.x + b.width >= px)).toBe(true);
        }
      }
    }
  });

  it('rejects a bad row range', () => {
    expect(() => buildBrokenWall({ ...wall, minRows: 5, maxRows: 2 }, Math.random)).toThrow(
      RangeError,
    );
  });
});

describe('scatterRubble', () => {
  it('places the asked number of stones inside the area', () => {
    const area = { x: 0, y: 480, width: 800, height: 100 };
    const stones = scatterRubble(30, area, { min: 3, max: 9 }, createRandom(9));
    expect(stones).toHaveLength(30);
    for (const stone of stones) {
      expect(stone.x).toBeGreaterThanOrEqual(area.x);
      expect(stone.x).toBeLessThanOrEqual(area.x + area.width);
      expect(stone.y).toBeGreaterThanOrEqual(area.y);
      expect(stone.y).toBeLessThanOrEqual(area.y + area.height);
      expect(stone.radius).toBeGreaterThanOrEqual(3);
      expect(stone.radius).toBeLessThanOrEqual(9);
    }
  });

  it('rejects a negative count', () => {
    expect(() =>
      scatterRubble(-1, { x: 0, y: 0, width: 1, height: 1 }, { min: 1, max: 2 }, Math.random),
    ).toThrow(RangeError);
  });
});

describe('mixColor', () => {
  it('gives the ends at 0 and 1', () => {
    expect(mixColor(0x000000, 0xffffff, 0)).toBe(0x000000);
    expect(mixColor(0x000000, 0xffffff, 1)).toBe(0xffffff);
  });

  it('mixes each color channel', () => {
    expect(mixColor(0x000000, 0xff8040, 0.5)).toBe(0x804020);
  });

  it('keeps t between 0 and 1', () => {
    expect(mixColor(0x102030, 0x405060, 2)).toBe(0x405060);
  });
});
