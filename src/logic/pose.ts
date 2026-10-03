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

/** Ducking very low: kneeling on the back knee, body leaning far forward. */
const CROUCH: typeof STAND = {
  hip: { x: -0.08, y: -0.14 },
  neck: { x: 0.12, y: -0.22 },
  shoulder: { x: 0.09, y: -0.2 },
  backKnee: { x: -0.12, y: 0 },
  backFoot: { x: -0.3, y: 0 },
  frontKnee: { x: 0.1, y: -0.16 },
  frontFoot: { x: 0.08, y: 0 },
  backHand: { x: 0, y: -0.06 },
  gunHand: { x: 0.36, y: -0.2 },
};

/** Standing and aiming, the gun hand at the same height as the player's. */
const AIM: typeof STAND = { ...STAND };

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

/** Axe raised high, ready to chop. */
const RAISE: typeof STAND = { ...STAND, gunHand: { x: 0.12, y: -0.98 } };

/** Leaning back with the axe lifted behind the head, both hands on it, ready to strike. */
const WINDUP: typeof STAND = {
  ...STRIDE,
  hip: { x: -0.02, y: -0.42 },
  neck: { x: -0.06, y: -0.77 },
  shoulder: { x: -0.05, y: -0.71 },
  gunHand: { x: -0.16, y: -0.95 },
  backHand: { x: -0.11, y: -0.9 },
};

/** Axe struck down hard in front: leaning into it, both hands on the handle. */
const CHOP: typeof STAND = {
  ...STRIDE,
  hip: { x: 0.02, y: -0.41 },
  neck: { x: 0.11, y: -0.75 },
  shoulder: { x: 0.1, y: -0.69 },
  gunHand: { x: 0.4, y: -0.5 },
  backHand: { x: 0.31, y: -0.53 },
};

/** Hanging from a vine: both hands up, legs dangling a bit bent. */
const HANG: typeof STAND = {
  hip: { x: 0, y: -0.42 },
  neck: { x: 0, y: -0.78 },
  shoulder: { x: 0, y: -0.74 },
  backKnee: { x: -0.06, y: -0.22 },
  backFoot: { x: -0.1, y: 0 },
  frontKnee: { x: 0.08, y: -0.2 },
  frontFoot: { x: 0.04, y: 0 },
  backHand: { x: -0.05, y: -1.05 },
  gunHand: { x: 0.05, y: -1.05 },
};

/** Tucked up tight in a flip: knees pulled to the chest, hands holding the shins. */
const TUCK: typeof STAND = {
  hip: { x: -0.02, y: -0.46 },
  neck: { x: 0.06, y: -0.8 },
  shoulder: { x: 0.05, y: -0.74 },
  backKnee: { x: 0.14, y: -0.68 },
  backFoot: { x: 0.04, y: -0.44 },
  frontKnee: { x: 0.18, y: -0.66 },
  frontFoot: { x: 0.08, y: -0.42 },
  backHand: { x: 0.13, y: -0.56 },
  gunHand: { x: 0.2, y: -0.58 },
};

/** Walking with the axe raised. */
const RAISE_STRIDE: typeof STAND = { ...STRIDE, gunHand: RAISE.gunHand };

const STANCES = {
  stand: STAND,
  crouch: CROUCH,
  aim: AIM,
  stride: STRIDE,
  jump: JUMP_POSE,
  raise: RAISE,
  chop: CHOP,
  windup: WINDUP,
  tuck: TUCK,
  raiseStride: RAISE_STRIDE,
  hang: HANG,
};

export type Stance = keyof typeof STANCES;

/** Which way the figure looks: 1 = right, -1 = left. */
export type Facing = 1 | -1;

const HEAD_RADIUS = 0.11;

/** Stances where the legs can walk (the rest of the body stays as it is). */
const WALKABLE: ReadonlySet<Stance> = new Set<Stance>(['stand', 'aim', 'raise']);

/**
 * Shuffling forward while crouching: small steps, knees and feet move a little,
 * but the body and head stay just as low (so bullets still fly over).
 */
function crouchWalkingParts(parts: typeof STAND, phase: number): typeof STAND {
  const swing = Math.sin(phase);
  const forward = Math.cos(phase);
  const step = 0.07;
  const lift = 0.03;
  const shift = (p: Point, dx: number, dy = 0): Point => ({ x: p.x + dx, y: p.y + dy });
  return {
    ...parts,
    frontFoot: shift(parts.frontFoot, step * swing, -lift * Math.max(0, forward)),
    frontKnee: shift(parts.frontKnee, step * swing * 0.6),
    backFoot: shift(parts.backFoot, -step * swing, -lift * Math.max(0, -forward)),
    // The back knee comes off the ground a little as it moves
    backKnee: shift(parts.backKnee, -step * swing * 0.6, -lift * (0.5 + 0.5 * Math.abs(swing))),
    backHand: shift(parts.backHand, -0.04 * swing),
  };
}

/**
 * Legs and back arm in the middle of a walking step, as parts of the height.
 * `phase` goes round and round (in radians): one full turn is two steps.
 * The foot swinging forward lifts off the ground, the body bobs a little.
 */
function walkingParts(parts: typeof STAND, phase: number): typeof STAND {
  const swing = Math.sin(phase);
  const forward = Math.cos(phase);
  const stride = 0.17;
  const footLift = 0.07;
  const bob = 0.015 * Math.abs(forward);
  const up = (p: Point): Point => ({ x: p.x, y: p.y - bob });
  const hip = up(parts.hip);
  const frontFoot = { x: stride * swing, y: -footLift * Math.max(0, forward) };
  const backFoot = { x: -stride * swing, y: -footLift * Math.max(0, -forward) };
  // Knees sit between hip and foot, bent a little forward
  const knee = (foot: Point): Point => ({
    x: (hip.x + foot.x) / 2 + 0.05,
    y: (hip.y + foot.y) / 2,
  });
  return {
    hip,
    neck: up(parts.neck),
    shoulder: up(parts.shoulder),
    gunHand: up(parts.gunHand),
    // The free arm swings the other way from the front leg
    backHand: { x: parts.backHand.x - 0.08 * swing, y: parts.backHand.y - bob },
    frontFoot,
    backFoot,
    frontKnee: knee(frontFoot),
    backKnee: knee(backFoot),
  };
}

/**
 * The stick figure's pose for a stance. Facing left mirrors it.
 * Give `walkPhase` to make the legs walk (or shuffle, when crouching).
 */
export function stickFigurePose(
  height: number,
  stance: Stance,
  facing: Facing = 1,
  walkPhase?: number,
): Pose {
  if (height <= 0) {
    throw new RangeError('Height must be positive');
  }
  const base = STANCES[stance];
  let parts = base;
  if (walkPhase !== undefined && WALKABLE.has(stance)) parts = walkingParts(base, walkPhase);
  if (walkPhase !== undefined && stance === 'crouch') parts = crouchWalkingParts(base, walkPhase);
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

/**
 * Moves pose `from` part of the way toward pose `to`. `t` = 0 keeps `from`, 1 gives `to`.
 * Doing this a little every frame makes figures move softly instead of jumping.
 */
export function lerpPose(from: Pose, to: Pose, t: number): Pose {
  if (t <= 0) return from;
  if (t >= 1) return to;
  const k = t;
  const mix = (a: Point, b: Point): Point => ({
    x: a.x + (b.x - a.x) * k,
    y: a.y + (b.y - a.y) * k,
  });
  return {
    hip: mix(from.hip, to.hip),
    neck: mix(from.neck, to.neck),
    shoulder: mix(from.shoulder, to.shoulder),
    backKnee: mix(from.backKnee, to.backKnee),
    backFoot: mix(from.backFoot, to.backFoot),
    frontKnee: mix(from.frontKnee, to.frontKnee),
    frontFoot: mix(from.frontFoot, to.frontFoot),
    backHand: mix(from.backHand, to.backHand),
    gunHand: mix(from.gunHand, to.gunHand),
    headRadius: from.headRadius + (to.headRadius - from.headRadius) * k,
  };
}

/** How much to move toward the target pose this frame, so it feels the same at any frame rate. */
export function smoothingStep(deltaMs: number, speed: number): number {
  return 1 - Math.exp((-speed * deltaMs) / 1000);
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

/**
 * A limp body, like after falling over: the body stays as it is, but the arms
 * hang along it and the legs stretch out straight in line with it.
 */
export function limpPose(pose: Pose): Pose {
  const dx = pose.hip.x - pose.neck.x;
  const dy = pose.hip.y - pose.neck.y;
  const bodyLength = Math.hypot(dx, dy) || 1;
  // Direction from the neck down to the hip
  const ux = dx / bodyLength;
  const uy = dy / bodyLength;
  // Sideways direction, to keep the two legs and arms a little apart
  const sx = -uy;
  const sy = ux;
  const legLength = Math.hypot(pose.frontFoot.x - pose.hip.x, pose.frontFoot.y - pose.hip.y);
  const along = (from: Point, distance: number, side: number): Point => ({
    x: from.x + ux * distance + sx * side,
    y: from.y + uy * distance + sy * side,
  });
  const armLength = bodyLength * 0.55;
  return {
    ...pose,
    backKnee: along(pose.hip, legLength * 0.5, -2),
    backFoot: along(pose.hip, legLength, -4),
    frontKnee: along(pose.hip, legLength * 0.5, 2),
    frontFoot: along(pose.hip, legLength, 3),
    backHand: along(pose.shoulder, armLength, -5),
    gunHand: along(pose.shoulder, armLength, 5),
  };
}
