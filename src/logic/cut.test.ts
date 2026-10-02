import { describe, expect, it } from 'vitest';
import { cutSegments, figureSegments } from './cut';
import { stickFigurePose } from './pose';

describe('figureSegments', () => {
  it('has two lines per leg, a body and two arms', () => {
    expect(figureSegments(stickFigurePose(100, 'stand'))).toHaveLength(7);
  });
});

describe('cutSegments', () => {
  const line = { from: { x: 0, y: 0 }, to: { x: 10, y: -100 } };

  it('splits a line crossing the cut into two parts that meet at the cut', () => {
    const { upper, lower } = cutSegments([line], -50);
    expect(lower).toEqual([{ from: { x: 0, y: 0 }, to: { x: 5, y: -50 } }]);
    expect(upper).toEqual([{ from: { x: 5, y: -50 }, to: { x: 10, y: -100 } }]);
  });

  it('keeps lines fully above or below whole', () => {
    const { upper, lower } = cutSegments([line], -200);
    expect(upper).toEqual([]);
    expect(lower).toEqual([line]);
  });

  it('cutting through the belly puts the legs below and the arms above', () => {
    const pose = stickFigurePose(100, 'stand');
    const { upper, lower } = cutSegments(figureSegments(pose), -45);
    const all = [...upper, ...lower];
    expect(upper.every((s) => s.from.y <= -45 && s.to.y <= -45)).toBe(true);
    expect(lower.every((s) => s.from.y >= -45 && s.to.y >= -45)).toBe(true);
    // Only the body crosses the belly, so one extra line appears
    expect(all).toHaveLength(8);
  });
});
