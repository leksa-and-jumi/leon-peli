import { describe, expect, it } from 'vitest';
import { outfitColor, splitSegment, type OutfitLook } from './outfit';

describe('splitSegment', () => {
  const line = { from: { x: 0, y: 0 }, to: { x: 0, y: -40 } };

  it('cuts a line into equal pieces that join up', () => {
    const pieces = splitSegment(line, 10);
    expect(pieces).toHaveLength(4);
    expect(pieces[0]).toEqual({ from: { x: 0, y: 0 }, to: { x: 0, y: -10 } });
    expect(pieces[3]?.to).toEqual({ x: 0, y: -40 });
  });

  it('keeps a short line in one piece', () => {
    expect(splitSegment(line, 100)).toHaveLength(1);
  });

  it('rejects a piece length of zero', () => {
    expect(() => splitSegment(line, 0)).toThrow(RangeError);
  });
});

describe('outfitColor', () => {
  it('a solid outfit is the same color everywhere', () => {
    const blue: OutfitLook = { kind: 'solid', color: 0x0000ff };
    expect(outfitColor(blue, 0)).toBe(0x0000ff);
    expect(outfitColor(blue, 9)).toBe(0x0000ff);
  });

  it('a rainbow goes through its colors in order and starts over', () => {
    const rainbow: OutfitLook = { kind: 'rainbow', colors: [1, 2, 3] };
    expect([0, 1, 2, 3].map((i) => outfitColor(rainbow, i))).toEqual([1, 2, 3, 1]);
  });

  it('camo only uses camo colors and always gives the same color for a piece', () => {
    const camo: OutfitLook = { kind: 'camo', colors: [10, 20, 30, 40] };
    for (let i = 0; i < 20; i++) {
      expect([10, 20, 30, 40]).toContain(outfitColor(camo, i));
      expect(outfitColor(camo, i)).toBe(outfitColor(camo, i));
    }
  });

  it('camo neighbours are different colors', () => {
    const camo: OutfitLook = { kind: 'camo', colors: [10, 20, 30, 40] };
    expect(outfitColor(camo, 0)).not.toBe(outfitColor(camo, 1));
  });
});
