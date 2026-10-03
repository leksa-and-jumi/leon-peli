import { describe, expect, it } from 'vitest';
import { jumpStep, overPit, safeSpotBeside } from './pits';

const pits = [
  { left: 200, right: 260 },
  { left: 400, right: 470 },
];

describe('overPit', () => {
  it('finds the pit under the feet', () => {
    expect(overPit(230, pits, 6)).toEqual(pits[0]);
    expect(overPit(450, pits, 6)).toEqual(pits[1]);
  });

  it('is safe on solid ground and right at the edge', () => {
    expect(overPit(100, pits, 6)).toBeNull();
    expect(overPit(203, pits, 6)).toBeNull();
  });
});

describe('jumpStep', () => {
  it('goes up at first', () => {
    const step = jumpStep(0, 500, 100, 1400);
    expect(step.lift).toBeGreaterThan(0);
    expect(step.landed).toBe(false);
  });

  it('comes back down and lands on the ground', () => {
    let state = { lift: 0, speed: 500, landed: false };
    let frames = 0;
    while (!state.landed && frames < 200) {
      state = jumpStep(state.lift, state.speed, 16, 1400);
      frames += 1;
    }
    expect(state.landed).toBe(true);
    expect(state.lift).toBe(0);
  });

  it('jumps high enough and long enough to clear a 70 px pit while walking', () => {
    let state = { lift: 0, speed: 520, landed: false };
    let airMs = 0;
    while (!state.landed) {
      state = jumpStep(state.lift, state.speed, 10, 1400);
      airMs += 10;
    }
    // Walking at 220 px/s
    expect((220 * airMs) / 1000).toBeGreaterThan(100);
  });
});

describe('safeSpotBeside', () => {
  it('puts you back on the side you came from', () => {
    expect(safeSpotBeside({ left: 200, right: 260 }, 1, 20)).toBe(180);
    expect(safeSpotBeside({ left: 200, right: 260 }, -1, 20)).toBe(280);
  });
});
