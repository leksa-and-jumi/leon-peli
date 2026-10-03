import type { Point } from './pose';

/** A curved trail: part of a circle around `center`, from angle `start` to `end`. */
export interface SwooshArc {
  center: Point;
  radius: number;
  start: number;
  end: number;
  /** Which way round the circle to go from `start` to `end`. */
  anticlockwise: boolean;
}

/**
 * The trail an axe or club leaves when swung from hand position `from` to `to`,
 * around the shoulder. `extra` is how far past the hand the weapon head reaches.
 * Points are on the screen (y down). Facing right the weapon goes over the top
 * and down in front, which on the screen is clockwise.
 */
export function swooshArc(
  shoulder: Point,
  from: Point,
  to: Point,
  facing: 1 | -1,
  extra: number,
): SwooshArc {
  const reach = (p: Point): number => Math.hypot(p.x - shoulder.x, p.y - shoulder.y);
  return {
    center: shoulder,
    radius: Math.max(reach(from), reach(to)) + extra,
    start: Math.atan2(from.y - shoulder.y, from.x - shoulder.x),
    end: Math.atan2(to.y - shoulder.y, to.x - shoulder.x),
    anticlockwise: facing === -1,
  };
}

/** Where the other hand goes to hold a gun with both hands: just behind and under the gun hand. */
export function supportHand(gunHand: Point, facing: 1 | -1): Point {
  return { x: gunHand.x - facing * 7, y: gunHand.y + 5 };
}

/**
 * How far to turn an axe or club (drawn pointing straight up) so it carries on
 * the way the arm points, from the shoulder through the hand. 0 = straight up,
 * positive = tipped forward (the way the figure faces).
 */
export function weaponTilt(shoulder: Point, hand: Point, facing: 1 | -1): number {
  const armAngle = Math.atan2(hand.y - shoulder.y, (hand.x - shoulder.x) * facing);
  return armAngle + Math.PI / 2;
}
