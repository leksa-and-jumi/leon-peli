import { describe, expect, it } from 'vitest';
import { BULLET, JUMP, PLAYER } from '../config';
import { dodgeWindow, nextLift, wantsToBeUp } from './jump';
import { stickFigurePose } from './pose';

describe('dodgeWindow', () => {
  it('starts rising before the bullet arrives and stays up until it has passed', () => {
    // 900 px away at 900 px/s: arrives at 1000 ms, passes 90 px in 100 ms
    expect(dodgeWindow(0, 900, 900, 90, 250, 50)).toEqual({ start: 700, end: 1150 });
  });

  it('rejects a bullet speed of zero', () => {
    expect(() => dodgeWindow(0, 100, 0, 10, 250, 50)).toThrow(RangeError);
  });
});

describe('wantsToBeUp', () => {
  const windows = [
    { start: 100, end: 300 },
    { start: 250, end: 500 },
  ];

  it('stays up through bullets that come close together', () => {
    for (const t of [100, 280, 450, 500]) expect(wantsToBeUp(windows, t)).toBe(true);
  });

  it('comes down after the last bullet', () => {
    expect(wantsToBeUp(windows, 501)).toBe(false);
    expect(wantsToBeUp([], 0)).toBe(false);
  });
});

describe('nextLift', () => {
  it('rises toward the top and stops there', () => {
    expect(nextLift(0, true, 100, 70, 280)).toBe(25);
    expect(nextLift(60, true, 100, 70, 280)).toBe(70);
  });

  it('falls back down to the ground and stops there', () => {
    expect(nextLift(70, false, 100, 70, 280)).toBe(45);
    expect(nextLift(10, false, 100, 70, 280)).toBe(0);
  });
});

describe('jump height', () => {
  it('lifts the feet over a bullet shot from a crouch', () => {
    const crouchShotY = stickFigurePose(PLAYER.height, 'crouch').gunHand.y + BULLET.muzzleOffset.y;
    const bulletTop = crouchShotY - BULLET.height / 2;
    // Feet are at 0, so the lifted feet are at -JUMP.height
    expect(-JUMP.height).toBeLessThan(bulletTop);
  });

  it('a standing shot still hits a jumping figure', () => {
    const standShotY = stickFigurePose(PLAYER.height, 'stand').gunHand.y + BULLET.muzzleOffset.y;
    const bulletBottom = standShotY + BULLET.height / 2;
    expect(-JUMP.height).toBeGreaterThan(bulletBottom);
  });
});
