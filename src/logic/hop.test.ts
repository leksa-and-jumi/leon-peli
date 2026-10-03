import { describe, expect, it } from 'vitest';
import { jumpStep } from './hop';

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
