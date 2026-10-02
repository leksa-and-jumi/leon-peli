/** A rectangle-shaped stone in a wall. `shade` (0–1) picks a lighter or darker stone color. */
export interface Block {
  x: number;
  y: number;
  width: number;
  height: number;
  shade: number;
}

/** A small round stone lying on the ground. */
export interface Rubble {
  x: number;
  y: number;
  radius: number;
  shade: number;
}

/**
 * Small seeded random number generator (mulberry32).
 * The same seed always gives the same ruins, so the background looks the same every time.
 */
export function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface WallOptions {
  /** Left edge of the wall. */
  x: number;
  /** Y of the ground the wall stands on. */
  groundY: number;
  width: number;
  blockWidth: number;
  blockHeight: number;
  /** Fewest rows of stones a column can have. */
  minRows: number;
  /** Most rows of stones a column can have. */
  maxRows: number;
}

/**
 * Builds a crumbled stone wall: stones in a brick pattern, where every
 * column has broken down to a different height.
 */
export function buildBrokenWall(options: WallOptions, random: () => number): Block[] {
  const { x, groundY, width, blockWidth, blockHeight, minRows, maxRows } = options;
  if (width <= 0 || blockWidth <= 0 || blockHeight <= 0) {
    throw new RangeError('Wall and block sizes must be positive');
  }
  if (minRows < 1 || minRows > maxRows) {
    throw new RangeError(`Bad row range: ${minRows}–${maxRows}`);
  }

  // How tall each half-block-wide strip of the wall still is.
  const stripWidth = blockWidth / 2;
  const stripCount = Math.ceil(width / stripWidth);
  const stripRows: number[] = [];
  for (let i = 0; i < stripCount; i++) {
    stripRows.push(minRows + Math.floor(random() * (maxRows - minRows + 1)));
  }

  // Which strips have a stone right under them. Stones never float in the air.
  let supported: boolean[] = stripRows.map(() => true);

  const blocks: Block[] = [];
  for (let row = 0; row < maxRows; row++) {
    const covered: boolean[] = stripRows.map(() => false);
    // Every other row is shifted by half a block, like real brick walls.
    const offset = row % 2 === 0 ? 0 : -stripWidth;
    for (let left = x + offset; left < x + width; left += blockWidth) {
      const clippedLeft = Math.max(left, x);
      const clippedRight = Math.min(left + blockWidth, x + width);
      const firstStrip = Math.floor((clippedLeft - x) / stripWidth);
      const lastStrip = Math.ceil((clippedRight - x) / stripWidth) - 1;
      // A stone stays only if the wall is still this high and holds it up everywhere.
      let standing = true;
      for (let s = firstStrip; s <= lastStrip; s++) {
        if ((stripRows[s] ?? 0) <= row || !supported[s]) standing = false;
      }
      if (!standing) continue;
      for (let s = firstStrip; s <= lastStrip; s++) covered[s] = true;
      blocks.push({
        x: clippedLeft,
        y: groundY - (row + 1) * blockHeight,
        width: clippedRight - clippedLeft,
        height: blockHeight,
        shade: random(),
      });
    }
    supported = covered;
  }
  return blocks;
}

/** Scatters rubble stones along a strip of ground. */
export function scatterRubble(
  count: number,
  area: { x: number; y: number; width: number; height: number },
  radius: { min: number; max: number },
  random: () => number,
): Rubble[] {
  if (count < 0) {
    throw new RangeError('Rubble count must not be negative');
  }
  const stones: Rubble[] = [];
  for (let i = 0; i < count; i++) {
    stones.push({
      x: area.x + random() * area.width,
      y: area.y + random() * area.height,
      radius: radius.min + random() * (radius.max - radius.min),
      shade: random(),
    });
  }
  return stones;
}

/** Mixes two 0xRRGGBB colors. `t` = 0 gives `from`, 1 gives `to`. */
export function mixColor(from: number, to: number, t: number): number {
  const amount = Math.min(Math.max(t, 0), 1);
  const channel = (shift: number): number => {
    const a = (from >> shift) & 0xff;
    const b = (to >> shift) & 0xff;
    return Math.round(a + (b - a) * amount) << shift;
  };
  return channel(16) | channel(8) | channel(0);
}
