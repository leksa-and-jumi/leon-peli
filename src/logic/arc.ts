import type { Point } from './pose';

/**
 * A point along a thrown arc from `from` to `to`, like something flying through the air.
 * `t` goes from 0 (start) to 1 (landed). `height` is how high above the straight line it flies.
 */
export function arcPoint(from: Point, to: Point, height: number, t: number): Point {
  const k = Math.min(Math.max(t, 0), 1);
  return {
    x: from.x + (to.x - from.x) * k,
    y: from.y + (to.y - from.y) * k - height * 4 * k * (1 - k),
  };
}
