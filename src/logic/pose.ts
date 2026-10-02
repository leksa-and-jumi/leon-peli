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

/** Standing, but the gun arm points a bit up, at the other figure's head. */
const AIM: typeof STAND = { ...STAND, gunHand: { x: 0.3, y: -0.84 } };

/** A walking step: legs wide apart. Switching between AIM and STRIDE looks like walking. */
const STRIDE: typeof STAND = {
  ...AIM,
  backKnee: { x: -0.12, y: -0.22 },
  backFoot: { x: -0.24, y: 0 },
  frontKnee: { x: 0.14, y: -0.22 },
  frontFoot: { x: 0.22, y: 0 },
};

/** In the air: knees pulled up. */
const JUMP_POSE: typeof STAND = {
  ...AIM,
  backKnee: { x: -0.1, y: -0.3 },
  backFoot: { x: -0.18, y: -0.12 },
  frontKnee: { x: 0.12, y: -0.3 },
  frontFoot: { x: 0.06, y: -0.1 },
};

const STANCES = { stand: STAND, crouch: CROUCH, aim: AIM, stride: STRIDE, jump: JUMP_POSE };

export type Stance = keyof typeof STANCES;

/** Which way the figure looks: 1 = right, -1 = left. */
export type Facing = 1 | -1;

const HEAD_RADIUS = 0.11;

/** The stick figure's pose for a stance. Facing left mirrors it. */
export function stickFigurePose(height: number, stance: Stance, facing: Facing = 1): Pose {
  if (height <= 0) {
    throw new RangeError('Height must be positive');
  }
  const parts = STANCES[stance];
  const scale = (p: Point): Point => ({ x: p.x * height * facing, y: p.y * height });
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

/** The box around the figure (feet to head, back foot to gun hand), measured from its feet. */
export function poseBounds(pose: Pose): {
  left: number;
  right: number;
  top: number;
  bottom: number;
} {
  const points = [
    pose.hip,
    pose.neck,
    pose.shoulder,
    pose.backKnee,
    pose.backFoot,
    pose.frontKnee,
    pose.frontFoot,
    pose.backHand,
    pose.gunHand,
  ];
  const xs = points.map((p) => p.x);
  return {
    left: Math.min(...xs, pose.neck.x - pose.headRadius),
    right: Math.max(...xs, pose.neck.x + pose.headRadius),
    top: -poseHeight(pose),
    bottom: 0,
  };
}
