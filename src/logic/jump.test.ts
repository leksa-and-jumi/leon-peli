import { describe, expect, it } from 'vitest';
import { BULLET, JUMP, PLAYER } from '../config';
import { jumpDelayMs } from './jump';
import { stickFigurePose } from './pose';

describe('jumpDelayMs', () => {
  it('waits so the top of the jump meets the bullet', () => {
    // 900 px at 900 px/s arrives after 1000 ms; rising takes 250 ms
    expect(jumpDelayMs(900, 900, 250)).toBe(750);
  });

  it('jumps right away when the bullet is very close', () => {
    expect(jumpDelayMs(50, 900, 250)).toBe(0);
  });

  it('rejects a bullet speed of zero', () => {
    expect(() => jumpDelayMs(100, 0, 250)).toThrow(RangeError);
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
