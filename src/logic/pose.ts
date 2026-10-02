/** A point relative to the figure's feet. Up is negative y, like on the screen. */
export interface Point {
  x: number;
  y: number;
}

/** Where every joint of the stick figure is. */
export interface Pose {
  hip: Point;
  neck: Point;
  shoulder: Point;
  backKnee: Point;
  backFoot: Point;
  frontKnee: Point;
  frontFoot: Point;
  backHand: Point;
  gunHand: Point;
  headRadius: number;
}

/** Joint positions as parts of the height, so the figure can be any size. */
const STAND = {
  hip: { x: 0, y: -0.42 },
  neck: { x: 0, y: -0.78 },
  shoulder: { x: 0, y: -0.72 },
  backKnee: { x: -0.075, y: -0.21 },
  backFoot: { x: -0.15, y: 0 },
  frontKnee: { x: 0.075, y: -0.21 },
  frontFoot: { x: 0.15, y: 0 },
  backHand: { x: -0.12, y: -0.48 },
  gunHand: { x: 0.3, y: -0.66 },
};

/** Knees bent, body low and leaning a little forward. */
const CROUCH: typeof STAND = {
  hip: { x: -0.05, y: -0.24 },
  neck: { x: 0.05, y: -0.58 },
  shoulder: { x: 0.04, y: -0.52 },
  backKnee: { x: -0.2, y: -0.12 },
  backFoot: { x: -0.17, y: 0 },
  frontKnee: { x: 0.17, y: -0.26 },
  frontFoot: { x: 0.17, y: 0 },
  backHand: { x: -0.06, y: -0.32 },
  gunHand: { x: 0.33, y: -0.47 },
};

const HEAD_RADIUS = 0.11;

/** The stick figure's pose: standing up, or crouching while C is held. */
export function stickFigurePose(height: number, crouching: boolean): Pose {
  if (height <= 0) {
    throw new RangeError('Height must be positive');
  }
  const parts = crouching ? CROUCH : STAND;
  const scale = (p: Point): Point => ({ x: p.x * height, y: p.y * height });
  return {
    hip: scale(parts.hip),
    neck: scale(parts.neck),
    shoulder: scale(parts.shoulder),
    backKnee: scale(parts.backKnee),
    backFoot: scale(parts.backFoot),
    frontKnee: scale(parts.frontKnee),
    frontFoot: scale(parts.frontFoot),
    backHand: scale(parts.backHand),
    gunHand: scale(parts.gunHand),
    headRadius: HEAD_RADIUS * height,
  };
}

/** How tall the figure is from feet to the top of the head. */
export function poseHeight(pose: Pose): number {
  return -(pose.neck.y - pose.headRadius * 2);
}
