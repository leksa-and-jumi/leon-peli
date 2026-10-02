import { describe, expect, it } from 'vitest';
import { poseHeight, stickFigurePose } from './pose';

describe('stickFigurePose', () => {
  it('stands as tall as the height', () => {
    expect(poseHeight(stickFigurePose(100, false))).toBeCloseTo(100);
  });

  it('is much lower when crouching', () => {
    const stand = poseHeight(stickFigurePose(100, false));
    const crouch = poseHeight(stickFigurePose(100, true));
    expect(crouch).toBeLessThan(stand * 0.85);
  });

  it('keeps both feet on the ground when crouching', () => {
    const pose = stickFigurePose(100, true);
    expect(pose.backFoot.y).toBe(0);
    expect(pose.frontFoot.y).toBe(0);
  });

  it('still points the gun forward when crouching', () => {
    const pose = stickFigurePose(100, true);
    expect(pose.gunHand.x).toBeGreaterThan(pose.shoulder.x);
  });

  it('grows with the height', () => {
    expect(stickFigurePose(200, false).neck.y).toBe(stickFigurePose(100, false).neck.y * 2);
  });

  it('rejects a height of zero', () => {
    expect(() => stickFigurePose(0, false)).toThrow(RangeError);
  });
});
