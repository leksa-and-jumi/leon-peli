import type { WorldBounds } from './world';

/** Where world position `x` goes on a map `width` pixels wide that shows wall to wall. */
export function mapX(x: number, bounds: WorldBounds, width: number): number {
  const t = (x - bounds.left) / (bounds.right - bounds.left);
  return Math.min(Math.max(t, 0), 1) * width;
}
