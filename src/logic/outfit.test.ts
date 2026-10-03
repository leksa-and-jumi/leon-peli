import { describe, expect, it } from 'vitest';
import { camoColorAt, outfitColor, rainbowColorAt, splitSegment, type OutfitLook } from './outfit';

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

describe('rainbowColorAt', () => {
  const colors = [1, 2, 3, 4];

  it('is the first color at the top and the last at the feet', () => {
    expect(rainbowColorAt(colors, 0)).toBe(1);
    expect(rainbowColorAt(colors, 1)).toBe(4);
  });

  it('makes even stripes in between', () => {
    expect(rainbowColorAt(colors, 0.3)).toBe(2);
    expect(rainbowColorAt(colors, 0.6)).toBe(3);
  });

  it('stays inside the colors', () => {
    expect(rainbowColorAt(colors, -1)).toBe(1);
    expect(rainbowColorAt(colors, 5)).toBe(4);
  });
});

describe('camoColorAt', () => {
  const colors = [1, 2, 3, 4, 5];

  it('only uses camo colors', () => {
    for (let x = -50; x < 50; x += 7) {
      for (let y = -120; y < 0; y += 9) expect(colors).toContain(camoColorAt(colors, x, y));
    }
  });

  it('makes blotches: spots right next to each other are usually the same color', () => {
    let same = 0;
    let total = 0;
    for (let x = -40; x < 40; x += 2) {
      for (let y = -120; y < 0; y += 4) {
        total += 1;
        if (camoColorAt(colors, x, y) === camoColorAt(colors, x + 1, y)) same += 1;
      }
    }
    expect(same / total).toBeGreaterThan(0.7);
  });

  it('uses more than one color', () => {
    const seen = new Set<number>();
    for (let x = -60; x < 60; x += 3) seen.add(camoColorAt(colors, x, -60));
    expect(seen.size).toBeGreaterThan(2);
  });
});
