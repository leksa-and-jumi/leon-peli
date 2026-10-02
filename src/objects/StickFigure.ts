import Phaser from 'phaser';
import {
  BULLET,
  MOTION,
  OUTFIT_PIECE_LENGTH,
  PLAYER,
  RAINBOW_PIECE_LENGTH,
  ROUND_ENDS,
  WEAPONS,
  type Weapon,
} from '../config';
import type { Box } from '../logic/bullets';
import { figureSegments, joints, type Segment } from '../logic/cut';
import { outfitColor, rainbowColorAt, splitSegment, type OutfitLook } from '../logic/outfit';
import {
  lerpPose,
  poseBounds,
  smoothingStep,
  stickFigurePose,
  type Facing,
  type Point,
  type Pose,
  type Stance,
} from '../logic/pose';

export interface StickFigureLook {
  color: number;
  /** A thin edge around the figure so it shows on any background. */
  outlineColor: number;
  outlineAlpha: number;
  facing: Facing;
  /** How tall the figure is. The player's height if not given. */
  height?: number;
  /** Clothes. Without them the figure is plain `color`. */
  outfit?: OutfitLook;
}

/**
 * A stick figure holding a gun. Drawn around its feet, so `x`/`feetY` is where it stands.
 * The black player faces right, the white ones face left.
 */
export class StickFigure {
  private readonly g: Phaser.GameObjects.Graphics;
  private stance: Stance;
  private hitColor: number | null = null;
  private weapon: Weapon = 'pistol';
  /** How high above the ground the feet are (when jumping). */
  private lift = 0;
  /** The pose drawn right now. It glides toward the stance's pose every frame. */
  private current: Pose;
  /** Walking: how far through the step cycle, and how long one step takes. */
  private walkPhase = 0;
  private walkStepMs: number | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private x: number,
    private readonly feetY: number,
    private look: StickFigureLook,
    stance: Stance = 'stand',
  ) {
    this.stance = stance;
    this.g = scene.add.graphics({ x, y: feetY });
    this.current = this.targetPose();
    this.draw();
    scene.events.on('update', this.tick, this);
    // Playing again restarts the scene: stop listening, the old figure is gone
    scene.events.once('shutdown', this.stopTicking, this);
  }

  private stopTicking(): void {
    this.scene.events.off('update', this.tick, this);
    this.scene.events.off('shutdown', this.stopTicking, this);
  }

  /** Every frame: walk the legs and glide softly toward the wanted pose. */
  private tick(_time: number, deltaMs: number): void {
    if (this.walkStepMs !== null) this.walkPhase += (Math.PI * deltaMs) / this.walkStepMs;
    const step = smoothingStep(deltaMs, MOTION.smoothSpeed);
    this.current = lerpPose(this.current, this.targetPose(), step);
    this.draw();
  }

  /**
   * Walk (legs swing, one step every `stepMs`) or stand still (null).
   * The upper body keeps doing what the stance says.
   */
  setWalking(stepMs: number | null): void {
    if (stepMs === null && this.walkStepMs !== null) this.walkPhase = 0;
    this.walkStepMs = stepMs;
  }

  /** The pose the figure wants to be in right now. */
  private targetPose(): Pose {
    return stickFigurePose(
      this.look.height ?? PLAYER.height,
      this.stance,
      this.look.facing,
      this.walkStepMs !== null ? this.walkPhase : undefined,
    );
  }

  getX(): number {
    return this.x;
  }

  setX(x: number): void {
    this.x = x;
    this.g.x = x;
  }

  /** Raise the figure off the ground, for jumping. */
  setLift(lift: number): void {
    this.lift = lift;
    this.g.y = this.feetY - lift;
  }

  /** Change the pose. The figure glides into it over the next frames. */
  setStance(stance: Stance): void {
    this.stance = stance;
  }

  /** Where bullets come out of the gun, on the screen. */
  muzzlePosition(): { x: number; y: number } {
    const hand = this.pose().gunHand;
    return {
      x: this.x + hand.x + this.look.facing * WEAPONS[this.weapon].muzzleX,
      y: this.feetY - this.lift + hand.y + BULLET.muzzleOffset.y,
    };
  }

  /** The box bullets can hit, on the screen. */
  bounds(): Box {
    const box = poseBounds(this.pose());
    return {
      left: this.x + box.left,
      right: this.x + box.right,
      top: this.feetY - this.lift + box.top,
      bottom: this.feetY - this.lift + box.bottom,
    };
  }

  /** Blink in a color for a moment, for example red when hit. */
  flash(color: number, durationMs: number): void {
    this.hitColor = color;
    this.draw();
    this.scene.time.delayedCall(durationMs, () => {
      // It may have broken apart while blinking
      if (!this.g.active) return;
      this.hitColor = null;
      this.draw();
    });
  }

  /** Where the feet are now (higher while jumping). */
  getFeetY(): number {
    return this.feetY - this.lift;
  }

  /** Turn to look left (-1) or right (1). The gun turns too. */
  setFacing(facing: Facing): void {
    if (facing === this.look.facing) return;
    this.look = { ...this.look, facing };
    // Turn around at once (mirror), so the gun doesn't slide through the body
    this.current = { ...this.targetPose() };
    this.draw();
  }

  getFacing(): Facing {
    return this.look.facing;
  }

  /** Put on different clothes. */
  setOutfit(outfit: OutfitLook): void {
    this.look = { ...this.look, outfit };
    this.draw();
  }

  /** Swap the gun in the hand, for example to the rifle from the shop. */
  setWeapon(weapon: Weapon): void {
    this.weapon = weapon;
    this.draw();
  }

  getWeapon(): Weapon {
    return this.weapon;
  }

  getLook(): StickFigureLook {
    return this.look;
  }

  destroy(): void {
    this.stopTicking();
    this.g.destroy();
  }

  /** The pose as it is drawn right now. */
  pose(): Pose {
    return this.current;
  }

  private draw(): void {
    const pose = this.pose();
    const { outlineColor, outlineAlpha } = this.look;
    const segments = figureSegments(pose);
    this.g.clear();
    // Edge first, then the figure on top of it
    drawSegments(this.g, segments, PLAYER.lineWidth + 3, outlineColor, outlineAlpha);
    drawHead(this.g, pose, PLAYER.lineWidth + 3, outlineColor, outlineAlpha);
    const outfit: OutfitLook =
      this.hitColor !== null ? { kind: 'solid', color: this.hitColor } : lookOutfit(this.look);
    drawOutfit(this.g, segments, pose, outfit);
    drawGun(this.g, pose, this.look, this.weapon);
  }
}

/** The clothes a figure wears: its outfit, or plain `color` without one. */
export function lookOutfit(look: StickFigureLook): OutfitLook {
  return look.outfit ?? { kind: 'solid', color: look.color };
}

/**
 * Draws the body lines and head in the outfit's colors.
 * Camo and rainbow color each short piece of the lines differently.
 */
export function drawOutfit(
  g: Phaser.GameObjects.Graphics,
  segments: readonly Segment[],
  pose: Pose,
  outfit: OutfitLook,
  withHead = true,
  /** Where the feet line is in these coordinates (moved for broken pieces). */
  feetY = 0,
): void {
  // Rainbow stripes go from the top of the head (red) down to the feet (purple)
  const headTop = pose.neck.y - pose.headRadius * 2;
  const stripeAt = (y: number, colors: readonly number[]): number =>
    rainbowColorAt(colors, (y - headTop) / (feetY - headTop));

  let index = 0;
  for (const segment of segments) {
    const pieceLength = outfit.kind === 'rainbow' ? RAINBOW_PIECE_LENGTH : OUTFIT_PIECE_LENGTH;
    for (const { from, to } of splitSegment(segment, pieceLength)) {
      const color =
        outfit.kind === 'rainbow'
          ? stripeAt((from.y + to.y) / 2, outfit.colors)
          : outfitColor(outfit, index);
      g.lineStyle(PLAYER.lineWidth, color, 1);
      g.lineBetween(from.x, from.y, to.x, to.y);
      index += 1;
    }
  }
  // Round joints, and round hands and feet, in the outfit's colors
  for (const j of joints(segments)) {
    const color =
      outfit.kind === 'rainbow'
        ? stripeAt(j.y, outfit.colors)
        : outfitColor(outfit, Math.round(Math.abs(j.x) + Math.abs(j.y)));
    g.fillStyle(color, 1);
    g.fillCircle(j.x, j.y, roundEnd(PLAYER.lineWidth, j.end));
  }
  if (!withHead) return;

  const c = headCenter(pose);
  const r = pose.headRadius;
  if (outfit.kind === 'solid') {
    g.fillStyle(outfit.color, 1);
    g.fillCircle(c.x, c.y, r);
  } else if (outfit.kind === 'rainbow') {
    // The head gets the same stripes, one thin row at a time, plus a little shine
    for (let dy = -r; dy < r; dy += 1) {
      const half = Math.sqrt(Math.max(r * r - (dy + 0.5) * (dy + 0.5), 0));
      g.fillStyle(stripeAt(c.y + dy, outfit.colors), 1);
      g.fillRect(c.x - half, c.y + dy, half * 2, 1.2);
    }
    g.fillStyle(0xffffff, 0.45);
    g.fillCircle(c.x + r * 0.35, c.y - r * 0.4, r * 0.25);
  } else {
    // Camo: a base color with darker and lighter spots
    const [dark, base, brown, light] = outfit.colors;
    g.fillStyle(base ?? 0, 1);
    g.fillCircle(c.x, c.y, r);
    g.fillStyle(dark ?? 0, 1);
    g.fillCircle(c.x - r * 0.35, c.y - r * 0.3, r * 0.35);
    g.fillStyle(brown ?? 0, 1);
    g.fillCircle(c.x + r * 0.4, c.y + r * 0.25, r * 0.3);
    g.fillStyle(light ?? 0, 1);
    g.fillCircle(c.x - r * 0.1, c.y + r * 0.5, r * 0.22);
  }
}

/** Draws stick figure lines. */
export function drawSegments(
  g: Phaser.GameObjects.Graphics,
  segments: readonly Segment[],
  lineWidth: number,
  color: number,
  alpha: number,
): void {
  g.lineStyle(lineWidth, color, alpha);
  for (const { from, to } of segments) {
    g.lineBetween(from.x, from.y, to.x, to.y);
  }
  // Round knees and elbows, and round balls for hands and feet
  g.fillStyle(color, alpha);
  for (const j of joints(segments)) {
    g.fillCircle(j.x, j.y, roundEnd(lineWidth, j.end));
  }
}

/** How big the round end of a line is: hands and feet are a bit bigger than knees. */
function roundEnd(lineWidth: number, end: boolean): number {
  return end ? lineWidth / 2 + PLAYER.lineWidth * ROUND_ENDS.handGrow : lineWidth / 2;
}

/** Where the middle of the head is. */
export function headCenter(pose: Pose): Point {
  return { x: pose.neck.x, y: pose.neck.y - pose.headRadius + PLAYER.lineWidth / 2 };
}

/** Draws the head. A wider `lineWidth` makes it a bit bigger, for the edge. */
export function drawHead(
  g: Phaser.GameObjects.Graphics,
  pose: Pose,
  lineWidth: number,
  color: number,
  alpha: number,
): void {
  const center = headCenter(pose);
  g.fillStyle(color, alpha);
  g.fillCircle(center.x, center.y, pose.headRadius + (lineWidth - PLAYER.lineWidth) / 2);
}

/** A filled shape of a weapon: points measured forward from the hand (x) and down (y). */
interface GunPart {
  points: readonly (readonly [number, number])[];
  color: number;
}

/** A rectangle as a weapon part. */
function box(x: number, y: number, w: number, h: number, color: number): GunPart {
  return {
    points: [
      [x, y],
      [x + w, y],
      [x + w, y + h],
      [x, y + h],
    ],
    color,
  };
}

/** The parts of each weapon, drawn in order. Facing right, hand at (0, 0). */
function weaponParts(weapon: Weapon): GunPart[] {
  if (weapon === 'axe') {
    const { handle, blade, edge } = WEAPONS.axe.colors;
    return [
      // Wooden handle with a knob at the bottom
      box(-2.5, -44, 5, 54, handle),
      box(-3.5, 8, 7, 4, 0x4e342e),
      // Metal collar where the head sits on the handle
      box(-3.5, -46, 7, 8, 0x424242),
      // The head: thick at the back, flaring out to a wide curved edge
      {
        points: [
          [3, -44],
          [12, -47],
          [20, -54],
          [25, -50],
          [25, -28],
          [20, -24],
          [12, -31],
          [3, -36],
        ],
        color: blade,
      },
      // Shiny sharpened edge
      {
        points: [
          [21, -53],
          [25, -50],
          [25, -28],
          [21, -25],
          [23, -39],
        ],
        color: edge,
      },
    ];
  }

  if (weapon === 'rifle') {
    const { body, dark, metal, shine } = WEAPONS.rifle.colors;
    return [
      // Stock against the shoulder, and the tube it sits on
      {
        points: [
          [-32, -9],
          [-14, -7],
          [-14, 1],
          [-32, 5],
          [-33, -2],
        ],
        color: body,
      },
      box(-15, -6, 9, 4, dark),
      // Receiver (the middle) and the rail on top
      box(-7, -9, 22, 10, body),
      box(-6, -12, 20, 3, dark),
      // Handguard with cooling slots
      box(15, -8, 22, 8, body),
      box(18, -6, 3, 3, dark),
      box(24, -6, 3, 3, dark),
      box(30, -6, 3, 3, dark),
      // Front sight, barrel and muzzle brake
      box(33, -14, 3, 6, dark),
      box(37, -6, 13, 3, metal),
      box(50, -7.5, 5, 6, dark),
      // Pistol grip under the hand
      {
        points: [
          [-2, 1],
          [5, 1],
          [3, 12],
          [-4, 11],
        ],
        color: dark,
      },
      // Curved magazine
      {
        points: [
          [6, 1],
          [13, 1],
          [16, 9],
          [14, 17],
          [7, 15],
          [8, 8],
        ],
        color: dark,
      },
      // Light catching the top edge
      box(-7, -9, 44, 1.2, shine),
    ];
  }

  const { body, shine } = PLAYER.gun;
  return [
    // Slide on top, with grip lines at the back
    box(-4, -9, 33, 7, body),
    box(-2, -8, 1, 5, 0x0d0d0d),
    box(1, -8, 1, 5, 0x0d0d0d),
    box(4, -8, 1, 5, 0x0d0d0d),
    // Frame under the slide and the barrel tip
    box(4, -2, 22, 3, 0x262626),
    box(29, -7, 2, 4, 0x0d0d0d),
    // Sights
    box(-2, -11, 3, 2, 0x0d0d0d),
    box(26, -11, 2, 2, 0x0d0d0d),
    // Angled grip in the hand
    {
      points: [
        [-4, -2],
        [5, -2],
        [3, 13],
        [-6, 12],
      ],
      color: 0x2b2b2b,
    },
    // Light catching the top of the slide
    box(-4, -9, 33, 1.2, shine),
  ];
}

/**
 * Draws the gun in the gun hand, pointing the way the figure faces.
 * First a pale edge around every part, then the parts themselves.
 */
export function drawGun(
  g: Phaser.GameObjects.Graphics,
  pose: Pose,
  look: StickFigureLook,
  weapon: Weapon = 'pistol',
): void {
  const { x: handX, y: handY } = pose.gunHand;
  const { facing, outlineColor, outlineAlpha } = look;
  const parts = weaponParts(weapon);
  const toScreen = ([dx, dy]: readonly [number, number]): Phaser.Math.Vector2 =>
    new Phaser.Math.Vector2(handX + facing * dx, handY + dy);

  // Pale edge: each part pushed out a little from its middle
  g.fillStyle(outlineColor, outlineAlpha);
  for (const part of parts) {
    const cx = part.points.reduce((sum, [x]) => sum + x, 0) / part.points.length;
    const cy = part.points.reduce((sum, [, y]) => sum + y, 0) / part.points.length;
    const grown = part.points.map(([x, y]): [number, number] => {
      const dx = x - cx;
      const dy = y - cy;
      const length = Math.hypot(dx, dy) || 1;
      return [x + (dx / length) * 1.5, y + (dy / length) * 1.5];
    });
    g.fillPoints(grown.map(toScreen), true);
  }
  for (const part of parts) {
    g.fillStyle(part.color, 1);
    g.fillPoints(part.points.map(toScreen), true);
  }

  // Trigger guard: a little ring in front of the grip
  if (weapon !== 'axe') {
    g.lineStyle(1.5, 0x1a1a1a, 1);
    g.strokeCircle(handX + facing * 7, handY + 3, 3.5);
  }
}
