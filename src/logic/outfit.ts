import type { Segment } from './cut';

/** What the stick figure wears: one color, camouflage, or a rainbow. */
export type OutfitLook =
  | { kind: 'solid'; color: number }
  | { kind: 'camo'; colors: readonly number[] }
  | { kind: 'rainbow'; colors: readonly number[] }
  /** A pink pig suit: pink body, and a pig face with ears and a snout. */
  | { kind: 'pig'; color: number; snout: number; ear: number };

/**
 * Cuts a line into short pieces, so a pattern can color each piece.
 * The last piece may be shorter.
 */
export function splitSegment(segment: Segment, pieceLength: number): Segment[] {
  if (pieceLength <= 0) {
    throw new RangeError('pieceLength must be positive');
  }
  const { from, to } = segment;
  const length = Math.hypot(to.x - from.x, to.y - from.y);
  const count = Math.max(1, Math.ceil(length / pieceLength));
  const pieces: Segment[] = [];
  for (let i = 0; i < count; i++) {
    const a = i / count;
    const b = (i + 1) / count;
    pieces.push({
      from: { x: from.x + (to.x - from.x) * a, y: from.y + (to.y - from.y) * a },
      to: { x: from.x + (to.x - from.x) * b, y: from.y + (to.y - from.y) * b },
    });
  }
  return pieces;
}

/**
 * The color of piece number `index` of the outfit.
 * Rainbow goes through the colors in order; camo mixes them in a jumbled but fixed way.
 */
export function outfitColor(outfit: OutfitLook, index: number): number {
  switch (outfit.kind) {
    case 'solid':
    case 'pig':
      return outfit.color;
    case 'rainbow':
      return outfit.colors[index % outfit.colors.length] ?? 0;
    case 'camo': {
      // Same index always gives the same color, but neighbours differ
      const jumble = (index * 7 + Math.floor(index / 3) * 3) % outfit.colors.length;
      return outfit.colors[jumble] ?? 0;
    }
  }
}

/**
 * Rainbow stripes from head to toe: `fraction` 0 is the top of the head (red),
 * 1 is the feet (purple).
 */
export function rainbowColorAt(colors: readonly number[], fraction: number): number {
  const f = Math.min(Math.max(fraction, 0), 0.9999);
  return colors[Math.floor(f * colors.length)] ?? 0;
}

/**
 * Camouflage color at a spot (x, y): smooth wavy "noise" makes blotches,
 * so nearby spots usually share a color, like a real camo pattern.
 */
export function camoColorAt(colors: readonly number[], x: number, y: number): number {
  const n =
    Math.sin(x * 0.31 + y * 0.07) +
    Math.sin(y * 0.27 - x * 0.11 + 1.7) +
    Math.sin((x + y) * 0.17 + 4.2) * 0.8;
  // n is between about -2.8 and 2.8; turn it into a color number
  const t = Math.min(Math.max((n + 2.8) / 5.6, 0), 0.9999);
  return colors[Math.floor(t * colors.length)] ?? 0;
}
