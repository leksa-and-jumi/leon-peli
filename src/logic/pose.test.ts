import { describe, expect, it } from 'vitest';
import { BULLET, PLAYER } from '../config';
import { poseBounds, poseHeight, stickFigurePose } from './pose';

describe('stickFigurePose', () => {
  it('stands as tall as the height', () => {
    expect(poseHeight(stickFigurePose(100, 'stand'))).toBeCloseTo(100);
  });

  it('is much lower when crouching', () => {
    const stand = poseHeight(stickFigurePose(100, 'stand'));
    const crouch = poseHeight(stickFigurePose(100, 'crouch'));
    expect(crouch).toBeLessThan(stand * 0.85);
  });

  it('keeps both feet on the ground when crouching', () => {
    const pose = stickFigurePose(100, 'crouch');
    expect(pose.backFoot.y).toBe(0);
    expect(pose.frontFoot.y).toBe(0);
  });

  it('still points the gun forward when crouching', () => {
    const pose = stickFigurePose(100, 'crouch');
    expect(pose.gunHand.x).toBeGreaterThan(pose.shoulder.x);
  });

  it('grows with the height', () => {
    expect(stickFigurePose(200, 'stand').neck.y).toBe(stickFigurePose(100, 'stand').neck.y * 2);
  });

  it('rejects a height of zero', () => {
    expect(() => stickFigurePose(0, 'stand')).toThrow(RangeError);
  });
});

describe('facing left', () => {
  it('mirrors the figure so the gun points left', () => {
    const right = stickFigurePose(100, 'aim', 1);
    const left = stickFigurePose(100, 'aim', -1);
    expect(left.gunHand.x).toBe(-right.gunHand.x);
    expect(left.gunHand.y).toBe(right.gunHand.y);
  });
});

describe('poseBounds', () => {
  it('goes from the feet to the top of the head', () => {
    const pose = stickFigurePose(100, 'stand');
    const box = poseBounds(pose);
    expect(box.bottom).toBe(0);
    expect(box.top).toBeCloseTo(-100);
    expect(box.right).toBeCloseTo(30);
  });
});

describe('dodging by crouching', () => {
  // The white figures shoot from their aiming gun hand.
  const enemyBulletY = stickFigurePose(PLAYER.height, 'aim').gunHand.y + BULLET.muzzleOffset.y;
  const bulletBottom = enemyBulletY + BULLET.height / 2;
  const bulletTop = enemyBulletY - BULLET.height / 2;

  it('the bullet hits a standing player', () => {
    expect(bulletTop).toBeGreaterThan(poseBounds(stickFigurePose(PLAYER.height, 'stand')).top);
  });

  it('the bullet hits a standing player in the belly', () => {
    const stand = stickFigurePose(PLAYER.height, 'stand');
    const belly = (stand.hip.y + stand.neck.y) / 2;
    expect(enemyBulletY).toBeGreaterThan(stand.neck.y);
    expect(enemyBulletY).toBeLessThan(stand.hip.y);
    expect(Math.abs(enemyBulletY - belly)).toBeLessThan(PLAYER.height * 0.1);
  });

  it('the bullet flies over a crouching player', () => {
    expect(bulletBottom).toBeLessThan(poseBounds(stickFigurePose(PLAYER.height, 'crouch')).top);
  });
});
