import { describe, expect, it } from 'vitest';
import { canSpawn, followCamera, repeatedSpots, spawnSide, standSpot } from './world';

describe('repeatedSpots', () => {
  const vines = [
    { x: 250, y: 32 },
    { x: 480, y: 32 },
  ];

  it('finds the vines on the screen', () => {
    expect(repeatedSpots(vines, 800, 0, 800).map((s) => s.x)).toEqual([250, 480]);
  });

  it('repeats them further right and to the left', () => {
    expect(repeatedSpots(vines, 800, 800, 1600).map((s) => s.x)).toEqual([1050, 1280]);
    expect(repeatedSpots(vines, 800, -800, 0).map((s) => s.x)).toEqual([-550, -320]);
  });

  it('gives each copy its own number, the same every time', () => {
    const a = repeatedSpots(vines, 800, 0, 2000);
    const b = repeatedSpots(vines, 800, 1000, 1300);
    expect(new Set(a.map((s) => s.id)).size).toBe(a.length);
    expect(b[0]?.id).toBe(a.find((s) => s.x === 1050)?.id);
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
