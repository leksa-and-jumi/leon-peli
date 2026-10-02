import { clamp } from './bounds';

/** Which way the player is pushing: -1 = left (A), 1 = right (D), 0 = standing still. */
export type MoveDirection = -1 | 0 | 1;

/** A and D keys to a direction. Both at once cancel out. */
export function moveDirection(left: boolean, right: boolean): MoveDirection {
  if (left === right) return 0;
  return left ? -1 : 1;
}

/** New x after moving for `deltaMs`, kept between `minX` and `maxX`. */
export function moveX(
  x: number,
  direction: MoveDirection,
  speed: number,
  deltaMs: number,
  minX: number,
  maxX: number,
): number {
  return clamp(x + (direction * speed * deltaMs) / 1000, minX, maxX);
}
