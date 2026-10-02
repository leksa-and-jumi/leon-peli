import type { Point, Pose } from './pose';

/** A straight line of the stick figure, like an arm or a leg part. */
export interface Segment {
  from: Point;
  to: Point;
}

/** All the lines of a stick figure (head and gun not included). */
export function figureSegments(pose: Pose): Segment[] {
  return [
    { from: pose.hip, to: pose.backKnee },
    { from: pose.backKnee, to: pose.backFoot },
    { from: pose.hip, to: pose.frontKnee },
    { from: pose.frontKnee, to: pose.frontFoot },
    { from: pose.hip, to: pose.neck },
    { from: pose.shoulder, to: pose.backHand },
    { from: pose.shoulder, to: pose.gunHand },
  ];
}

/**
 * Cuts the lines at height `cutY`, like a bullet slicing straight through.
 * Lines crossing the cut are split in two. Up is smaller y.
 */
export function cutSegments(
  segments: readonly Segment[],
  cutY: number,
): { upper: Segment[]; lower: Segment[] } {
  const upper: Segment[] = [];
  const lower: Segment[] = [];
  for (const s of segments) {
    const fromAbove = s.from.y < cutY;
    const toAbove = s.to.y < cutY;
    if (fromAbove === toAbove) {
      (fromAbove ? upper : lower).push(s);
      continue;
    }
    // Where the line crosses the cut
    const t = (cutY - s.from.y) / (s.to.y - s.from.y);
    const middle = { x: s.from.x + (s.to.x - s.from.x) * t, y: cutY };
    const fromPart = { from: s.from, to: middle };
    const toPart = { from: middle, to: s.to };
    (fromAbove ? upper : lower).push(fromPart);
    (toAbove ? upper : lower).push(toPart);
  }
  return { upper, lower };
}

/**
 * A piece of one of the figure's lines after cutting: line number `source`,
 * from `t0` to `t1` along it (0 = its start, 1 = its end). `cutAt` tells which
 * end of the piece is where it broke, if any.
 */
export interface TrackedPiece {
  source: number;
  t0: number;
  t1: number;
  cutAt: 'from' | 'to' | null;
}

/**
 * Like `cutSegments`, but remembers which line each piece came from. Then the
 * pieces can follow the figure when its pose changes (going limp while falling).
 */
export function cutTracked(
  segments: readonly Segment[],
  cutY: number,
): { upper: TrackedPiece[]; lower: TrackedPiece[] } {
  const upper: TrackedPiece[] = [];
  const lower: TrackedPiece[] = [];
  segments.forEach((s, source) => {
    const fromAbove = s.from.y < cutY;
    const toAbove = s.to.y < cutY;
    if (fromAbove === toAbove) {
      (fromAbove ? upper : lower).push({ source, t0: 0, t1: 1, cutAt: null });
      return;
    }
    const t = (cutY - s.from.y) / (s.to.y - s.from.y);
    (fromAbove ? upper : lower).push({ source, t0: 0, t1: t, cutAt: 'to' });
    (toAbove ? upper : lower).push({ source, t0: t, t1: 1, cutAt: 'from' });
  });
  return { upper, lower };
}

/** The actual line of a tracked piece, for a figure's current lines. */
export function pieceSegment(segments: readonly Segment[], piece: TrackedPiece): Segment {
  const s = segments[piece.source];
  if (!s) throw new RangeError(`No line number ${String(piece.source)}`);
  const at = (t: number): Point => ({
    x: s.from.x + (s.to.x - s.from.x) * t,
    y: s.from.y + (s.to.y - s.from.y) * t,
  });
  return { from: at(piece.t0), to: at(piece.t1) };
}

/** A point where lines meet or end. `end` is true for hands, feet and cut ends. */
export interface Joint {
  x: number;
  y: number;
  end: boolean;
}

/**
 * Every place the lines start or stop. A point used by only one line is an end
 * (a hand, a foot or where it broke); points shared by lines are joints like knees.
 */
export function joints(segments: readonly Segment[]): Joint[] {
  const found = new Map<string, Joint & { count: number }>();
  for (const { from, to } of segments) {
    for (const p of [from, to]) {
      const key = `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
      const seen = found.get(key);
      if (seen) seen.count += 1;
      else found.set(key, { x: p.x, y: p.y, end: false, count: 1 });
    }
  }
  return [...found.values()].map(({ x, y, count }) => ({ x, y, end: count === 1 }));
}
