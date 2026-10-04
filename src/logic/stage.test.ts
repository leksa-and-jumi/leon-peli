import { describe, expect, it } from 'vitest';
import { createRandom } from './ruins';
import { canOpen, doorReward, keysNeeded, nextStage, onlyGiants, stageLayout } from './stage';

const rules = {
  last: 10,
  doorDistance: { min: 700, max: 1400 },
  keyDistance: { min: 300, max: 1500 },
  keyY: { min: 370, max: 500 },
  minGap: 150,
};

describe('stages', () => {
  it('need one more key every stage', () => {
    expect(keysNeeded(1)).toBe(1);
    expect(keysNeeded(10)).toBe(10);
  });

  it('start again from 1 after the last one', () => {
    expect(nextStage(1, 10)).toBe(2);
    expect(nextStage(9, 10)).toBe(10);
    expect(nextStage(10, 10)).toBe(1);
  });

  it('have only giants on the last stage', () => {
    expect(onlyGiants(10, 10)).toBe(true);
    expect(onlyGiants(9, 10)).toBe(false);
  });

  it('give 10 more points for every door', () => {
    expect(doorReward(1)).toBe(10);
    expect(doorReward(2)).toBe(20);
    expect(doorReward(10)).toBe(100);
  });

  it('open the door only with all the keys', () => {
    expect(canOpen(1, 2)).toBe(false);
    expect(canOpen(2, 2)).toBe(true);
  });
});

describe('stageLayout', () => {
  it('hides as many keys as the stage needs, away from the door and each other', () => {
    for (let stage = 1; stage <= 10; stage++) {
      const layout = stageLayout(createRandom(stage), stage, 100, rules);
      expect(layout.keys).toHaveLength(stage);
      expect(Math.abs(layout.doorX - 100)).toBeGreaterThanOrEqual(700);
      // Everything fits between the walls of the world
      for (const x of [layout.doorX, ...layout.keys.map((k) => k.x)]) {
        expect(Math.abs(x - 100)).toBeLessThanOrEqual(1500);
      }
      const spots = [layout.doorX, ...layout.keys.map((k) => k.x)].sort((a, b) => a - b);
      for (let i = 1; i < spots.length; i++) {
        expect((spots[i] ?? 0) - (spots[i - 1] ?? 0)).toBeGreaterThanOrEqual(rules.minGap - 0.001);
      }
      for (const key of layout.keys) {
        expect(key.y).toBeGreaterThanOrEqual(370);
        expect(key.y).toBeLessThanOrEqual(500);
      }
    }
  });

  it('is the same every time for the same random numbers', () => {
    expect(stageLayout(createRandom(5), 3, 0, rules)).toEqual(
      stageLayout(createRandom(5), 3, 0, rules),
    );
  });
});
