import { describe, expect, it } from 'vitest';
import { createRandom } from './ruins';
import {
  canOpen,
  doorReward,
  findsTreasure,
  keysNeeded,
  nextStage,
  stageLayout,
  stageOnlyKind,
} from './stage';

const rules = {
  last: 10,
  doorDistance: { min: 700, max: 1400 },
  keyDistance: { min: 300, max: 1500 },
  jumpKeyY: { min: 335, max: 395 },
  vineKeyShare: 0.5,
  vineReach: { min: 90, max: 190 },
  vineLength: 300,
  vineKeyMaxY: 310,
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

  it('have only one kind of enemy on the last three stages', () => {
    expect(stageOnlyKind(8)).toBe('boss');
    expect(stageOnlyKind(9)).toBe('giant');
    expect(stageOnlyKind(10)).toBe('brute');
    expect(stageOnlyKind(7)).toBeNull();
    expect(stageOnlyKind(1)).toBeNull();
  });

  it('hide a treasure behind the last door only', () => {
    expect(findsTreasure(10, 10)).toBe(true);
    expect(findsTreasure(9, 10)).toBe(false);
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
        expect(key.y).toBeGreaterThanOrEqual(150);
        // Never low enough to just walk into
        expect(key.y).toBeLessThanOrEqual(395);
      }
    }
  });

  it('is the same every time for the same random numbers', () => {
    expect(stageLayout(createRandom(5), 3, 0, rules)).toEqual(
      stageLayout(createRandom(5), 3, 0, rules),
    );
  });
});

describe('keys by the vines', () => {
  const vines = [-1200, -700, -300, 300, 700, 1200].map((x, i) => ({ x, y: 26 + i * 9 }));

  it('hangs some keys high up beside a vine, on its swing arc', () => {
    let byVines = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const layout = stageLayout(createRandom(seed), 6, 0, rules, vines);
      for (const key of layout.keys) {
        if (key.y > rules.vineKeyMaxY) continue;
        byVines += 1;
        const near = vines.some((v) => {
          const dx = Math.abs(key.x - v.x);
          return dx >= rules.vineReach.min - 0.001 && dx <= rules.vineReach.max + 0.001;
        });
        expect(near).toBe(true);
        // Exactly where the hands pass when swinging (15 above the vine's end)
        const onArc = vines.some((v) => {
          const dx = key.x - v.x;
          return Math.abs(v.y + Math.sqrt(300 ** 2 - dx * dx) - 15 - key.y) < 0.001;
        });
        expect(onArc).toBe(true);
      }
    }
    expect(byVines).toBeGreaterThan(10);
  });

  it('puts every key out in the open when there are no vines', () => {
    const layout = stageLayout(createRandom(4), 5, 0, rules);
    for (const key of layout.keys) expect(key.y).toBeGreaterThanOrEqual(335);
  });
});
