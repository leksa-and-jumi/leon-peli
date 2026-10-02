import { describe, expect, it } from 'vitest';
import { BULLET, PLAYER } from '../config';
import { limpPose, lerpPose, poseBounds, poseHeight, smoothingStep, stickFigurePose } from './pose';

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

  it('the white figures hold the gun as high as the player does', () => {
    expect(stickFigurePose(PLAYER.height, 'aim').gunHand.y).toBe(
      stickFigurePose(PLAYER.height, 'stand').gunHand.y,
    );
  });

  it('the bullet flies over a crouching player', () => {
    expect(bulletBottom).toBeLessThan(poseBounds(stickFigurePose(PLAYER.height, 'crouch')).top);
  });
});

describe('walking', () => {
  it('keeps the upper body like the stance', () => {
    const stand = stickFigurePose(100, 'stand');
    const walk = stickFigurePose(100, 'stand', 1, 1);
    expect(walk.gunHand.x).toBeCloseTo(stand.gunHand.x);
    expect(Math.abs(walk.neck.y - stand.neck.y)).toBeLessThan(3);
  });

  it('moves the feet opposite ways', () => {
    const walk = stickFigurePose(100, 'stand', 1, Math.PI / 2);
    expect(walk.frontFoot.x).toBeGreaterThan(0);
    expect(walk.backFoot.x).toBeLessThan(0);
  });

  it('never puts a foot below the ground', () => {
    for (let phase = 0; phase < Math.PI * 2; phase += 0.3) {
      const walk = stickFigurePose(100, 'stand', 1, phase);
      expect(walk.frontFoot.y).toBeLessThanOrEqual(0);
      expect(walk.backFoot.y).toBeLessThanOrEqual(0);
    }
  });

  it('shuffles the legs while crouching but keeps the head just as low', () => {
    const crouch = stickFigurePose(100, 'crouch');
    const shuffle = stickFigurePose(100, 'crouch', 1, Math.PI / 2);
    expect(shuffle.frontFoot.x).not.toBeCloseTo(crouch.frontFoot.x);
    expect(poseHeight(shuffle)).toBeCloseTo(poseHeight(crouch));
  });

  it('never puts a crouching foot or knee below the ground', () => {
    for (let phase = 0; phase < Math.PI * 2; phase += 0.3) {
      const shuffle = stickFigurePose(100, 'crouch', 1, phase);
      expect(shuffle.frontFoot.y).toBeLessThanOrEqual(0);
      expect(shuffle.backFoot.y).toBeLessThanOrEqual(0);
      expect(shuffle.backKnee.y).toBeLessThanOrEqual(0);
    }
  });

  it('does not walk in the air', () => {
    expect(stickFigurePose(100, 'jump', 1, 1)).toEqual(stickFigurePose(100, 'jump'));
  });
});

describe('lerpPose', () => {
  const stand = stickFigurePose(100, 'stand');
  const crouch = stickFigurePose(100, 'crouch');

  it('gives the start at 0 and the end at 1', () => {
    expect(lerpPose(stand, crouch, 0)).toEqual(stand);
    expect(lerpPose(stand, crouch, 1)).toEqual(crouch);
  });

  it('is half way at 0.5', () => {
    expect(lerpPose(stand, crouch, 0.5).neck.y).toBeCloseTo((stand.neck.y + crouch.neck.y) / 2);
  });
});

describe('smoothingStep', () => {
  it('is 0 with no time and close to 1 after a long time', () => {
    expect(smoothingStep(0, 15)).toBe(0);
    expect(smoothingStep(5000, 15)).toBeCloseTo(1);
  });

  it('two short steps equal one long step', () => {
    const one = smoothingStep(32, 15);
    const two = 1 - (1 - smoothingStep(16, 15)) ** 2;
    expect(two).toBeCloseTo(one);
  });
});

describe('limpPose', () => {
  it('keeps the body where it is', () => {
    const pose = stickFigurePose(100, 'crouch');
    const limp = limpPose(pose);
    expect(limp.hip).toEqual(pose.hip);
    expect(limp.neck).toEqual(pose.neck);
  });

  it('stretches the legs out in line with the body', () => {
    const limp = limpPose(stickFigurePose(100, 'stand'));
    // Standing straight: the body points down, so the feet go straight down from the hip
    expect(limp.frontFoot.y).toBeGreaterThan(limp.hip.y);
    expect(Math.abs(limp.frontFoot.x - limp.hip.x)).toBeLessThan(6);
  });

  it('lets the arms hang down along the body', () => {
    const limp = limpPose(stickFigurePose(100, 'stand'));
    expect(limp.gunHand.y).toBeGreaterThan(limp.shoulder.y);
    expect(Math.abs(limp.gunHand.x - limp.shoulder.x)).toBeLessThan(8);
  });
});
