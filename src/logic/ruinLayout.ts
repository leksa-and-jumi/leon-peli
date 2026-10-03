/** Where the broken buildings stand in one screen-wide stretch of the ruins. */
export interface RuinLayout {
  walls: { x: number; width: number; minRows: number; maxRows: number }[];
  arches: { centerX: number; width: number }[];
  /** `x` is the left edge of the column. */
  columns: { x: number; height: number; broken: boolean }[];
  /** A column lying on the ground. */
  fallen: { x: number; length: number } | null;
}

/** How wide a standing column is, with its top. */
export const COLUMN_SPAN = 46;

/** The ruins as Leo first made them. */
export const CLASSIC_RUINS: RuinLayout = {
  walls: [{ x: 20, width: 264, minRows: 3, maxRows: 9 }],
  arches: [{ centerX: 470, width: 150 }],
  columns: [
    { x: 345, height: 230, broken: true },
    { x: 735, height: 300, broken: false },
  ],
  fallen: { x: 560, length: 150 },
};

/** The ground each building covers, left to right, for shadows (and checking they don't overlap). */
export function ruinSpans(layout: RuinLayout): { left: number; right: number }[] {
  const spans = [
    ...layout.walls.map((w) => ({ left: w.x, right: w.x + w.width })),
    ...layout.arches.map((a) => ({
      left: a.centerX - a.width / 2,
      right: a.centerX + a.width / 2,
    })),
    ...layout.columns.map((c) => ({ left: c.x - 6, right: c.x - 6 + COLUMN_SPAN })),
  ];
  return spans.sort((a, b) => a.left - b.left);
}

type Piece = 'wall' | 'arch' | 'column';

/** Makes a new mix of walls, arches and columns that fits side by side in one stretch. */
export function makeRuinLayout(random: () => number, tileWidth: number): RuinLayout {
  const pick = (min: number, max: number): number => min + random() * (max - min);
  const pieces: Piece[] = ['wall', 'arch', 'column', 'column'];
  if (random() < 0.5) pieces.push('wall');
  if (random() < 0.5) pieces.push('column');
  // Mix up the order
  for (let i = pieces.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const a = pieces[i];
    const b = pieces[j];
    if (a && b) {
      pieces[i] = b;
      pieces[j] = a;
    }
  }
  const layout: RuinLayout = { walls: [], arches: [], columns: [], fallen: null };
  let cursor = pick(10, 60);
  for (const piece of pieces) {
    const width =
      piece === 'wall'
        ? Math.round(pick(140, 280))
        : piece === 'arch'
          ? Math.round(pick(120, 170))
          : COLUMN_SPAN;
    if (cursor + width > tileWidth - 10) continue;
    if (piece === 'wall') {
      layout.walls.push({
        x: cursor,
        width,
        minRows: 2 + Math.floor(random() * 2),
        maxRows: 6 + Math.floor(random() * 4),
      });
    } else if (piece === 'arch') {
      layout.arches.push({ centerX: cursor + width / 2, width });
    } else {
      layout.columns.push({
        x: cursor + 6,
        height: Math.round(pick(200, 320)),
        broken: random() < 0.5,
      });
    }
    cursor += width + pick(25, 100);
  }
  const length = Math.round(pick(110, 160));
  layout.fallen =
    random() < 0.7 ? { x: Math.round(pick(40, tileWidth - length - 40)), length } : null;
  return layout;
}
