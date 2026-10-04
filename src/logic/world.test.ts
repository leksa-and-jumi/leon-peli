import { describe, expect, it } from 'vitest';
import {
  canSpawn,
  clampCamera,
  clampToWorld,
  followCamera,
  spawnSide,
  spawnX,
  swarmSides,
  standSpot,
  tiledSpots,
  tileVariant,
} from './world';

describe('tiledSpots', () => {
  const vines = [
    { x: 250, y: 32 },
    { x: 480, y: 32 },
  ];
  const same = (): typeof vines => vines;

  it('finds the vines on the screen', () => {
    expect(tiledSpots(same, 800, 0, 800, 2).map((s) => s.x)).toEqual([250, 480]);
  });

  it('repeats them further right and to the left', () => {
    expect(tiledSpots(same, 800, 800, 1600, 2).map((s) => s.x)).toEqual([1050, 1280]);
    expect(tiledSpots(same, 800, -800, 0, 2).map((s) => s.x)).toEqual([-550, -320]);
  });

  it('gives each one its own number, the same every time', () => {
    const a = tiledSpots(same, 800, 0, 2000, 2);
    const b = tiledSpots(same, 800, 1000, 1300, 2);
    expect(new Set(a.map((s) => s.id)).size).toBe(a.length);
    expect(b[0]?.id).toBe(a.find((s) => s.x === 1050)?.id);
  });

  it('lets every tile have its own spots', () => {
    const own = (tile: number): typeof vines => [{ x: 100 + tile * 10, y: 40 }];
    expect(tiledSpots(own, 800, 0, 1700, 2).map((s) => s.x)).toEqual([100, 910]);
  });
});

describe('tileVariant', () => {
  it('is always the same for the same tile, and within the count', () => {
    for (let tile = -20; tile < 20; tile++) {
      const v = tileVariant(tile, 5);
      expect(v).toBe(tileVariant(tile, 5));
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(5);
    }
  });

  it('mixes the looks along the way', () => {
    const looks = new Set(Array.from({ length: 10 }, (_, t) => tileVariant(t, 5)));
    expect(looks.size).toBeGreaterThan(2);
  });
});

describe('spawnSide', () => {
  it('comes from the left or the right', () => {
    expect(spawnSide(0.2)).toBe(-1);
    expect(spawnSide(0.8)).toBe(1);
  });
});

describe('canSpawn', () => {
  it('never lets more than the max in at once', () => {
    expect(canSpawn(2, 3, 1000, 500)).toBe(true);
    expect(canSpawn(3, 3, 1000, 500)).toBe(false);
  });

  it('waits until it is time', () => {
    expect(canSpawn(0, 3, 400, 500)).toBe(false);
  });
});

describe('standSpot', () => {
  it('stands away from the player on its own side', () => {
    expect(standSpot(1000, 1, 300)).toBe(1300);
    expect(standSpot(1000, -1, 300)).toBe(700);
  });
});

describe('followCamera', () => {
  it('moves toward having the player in the middle', () => {
    expect(followCamera(0, 1000, 800, 1)).toBe(600);
    expect(followCamera(0, 1000, 800, 0.5)).toBe(300);
    expect(followCamera(600, 1000, 800, 0.5)).toBe(600);
  });
});

describe('world walls', () => {
  const bounds = { left: -1500, right: 1700 };

  it('keep you between the walls', () => {
    expect(clampToWorld(0, bounds, 40)).toBe(0);
    expect(clampToWorld(-3000, bounds, 40)).toBe(-1460);
    expect(clampToWorld(3000, bounds, 40)).toBe(1660);
  });

  it('stop the camera just past a wall', () => {
    expect(clampCamera(0, bounds, 800, 60)).toBe(0);
    expect(clampCamera(-2000, bounds, 800, 60)).toBe(-1560);
    expect(clampCamera(2000, bounds, 800, 60)).toBe(960);
  });

  it('let enemies come in only on this side of a wall', () => {
    expect(spawnX(1, 0, 800, 40, bounds, 30)).toBe(840);
    expect(spawnX(1, 900, 800, 40, bounds, 30)).toBe(1670);
    expect(spawnX(-1, -1500, 800, 40, bounds, 30)).toBe(-1470);
  });
});

describe('swarmSides', () => {
  it('sends a crowd in from both sides in turns', () => {
    expect(swarmSides(4)).toEqual([-1, 1, -1, 1]);
    expect(swarmSides(10).filter((s) => s === 1)).toHaveLength(5);
  });
});
