import type { Point } from './pose';

/**
 * The angle to aim from `from` to `to`, for a figure facing `facing`.
 * 0 = straight ahead, positive = down, negative = up (like the screen).
 * Kept within `maxAngle` so the arm never points backwards or straight up.
 */
export function aimAngle(from: Point, to: Point, facing: 1 | -1, maxAngle: number): number {
  const ahead = (to.x - from.x) * facing;
  const angle = Math.atan2(to.y - from.y, Math.max(ahead, 1));
  return Math.min(Math.max(angle, -maxAngle), maxAngle);
}

/** Turns `current` toward `target`, but at most `maxStep` at a time, so the arm moves smoothly. */
export function turnToward(current: number, target: number, maxStep: number): number {
  const diff = target - current;
  if (Math.abs(diff) <= maxStep) return target;
  return current + Math.sign(diff) * maxStep;
}

/**
 * Turns a point around `center` by `angle`, for a figure facing `facing`
 * (positive angle = toward the ground in front of it).
 */
export function turnAround(point: Point, center: Point, angle: number, facing: 1 | -1): Point {
  const ahead = (point.x - center.x) * facing;
  const down = point.y - center.y;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return {
    x: center.x + (ahead * cos - down * sin) * facing,
    y: center.y + ahead * sin + down * cos,
  };
}
