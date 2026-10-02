import { describe, expect, it } from 'vitest';
import { cutSegments, figureSegments, joints } from './cut';
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

describe('joints', () => {
  it('finds the knee as a joint and the hip and foot as ends of a single leg', () => {
    const leg = [
      { from: { x: 0, y: -40 }, to: { x: 5, y: -20 } },
      { from: { x: 5, y: -20 }, to: { x: 0, y: 0 } },
    ];
    const found = joints(leg);
    expect(found).toHaveLength(3);
    expect(found.find((j) => j.y === -20)?.end).toBe(false);
    expect(found.filter((j) => j.end)).toHaveLength(2);
  });

  it('a whole stick figure has hands, feet and a neck as ends', () => {
    const ends = joints(figureSegments(stickFigurePose(100, 'stand'))).filter((j) => j.end);
    // two feet, two hands and the top of the neck
    expect(ends).toHaveLength(5);
  });
});
