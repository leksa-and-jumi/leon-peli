import Phaser from 'phaser';
import { BULLET, PLAYER } from '../config';
import type { Box } from '../logic/bullets';
import { figureSegments, type Segment } from '../logic/cut';
import {
  poseBounds,
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
}

/**
 * A stick figure holding a gun. Drawn around its feet, so `x`/`feetY` is where it stands.
 * The black player faces right, the white ones face left.
 */
export class StickFigure {
  private readonly g: Phaser.GameObjects.Graphics;
  private stance: Stance;
  private hitColor: number | null = null;
  /** How high above the ground the feet are (when jumping). */
  private lift = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private x: number,
    private readonly feetY: number,
    private readonly look: StickFigureLook,
    stance: Stance = 'stand',
  ) {
    this.stance = stance;
    this.g = scene.add.graphics({ x, y: feetY });
    this.draw();
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

  /** Change the pose. Only redraws when the pose really changes. */
  setStance(stance: Stance): void {
    if (stance === this.stance) return;
    this.stance = stance;
    this.draw();
  }

  /** Where bullets come out of the gun, on the screen. */
  muzzlePosition(): { x: number; y: number } {
    const hand = this.pose().gunHand;
    return {
      x: this.x + hand.x + this.look.facing * BULLET.muzzleOffset.x,
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
      this.hitColor = null;
      this.draw();
    });
  }

  /** Where the feet are now (higher while jumping). */
  getFeetY(): number {
    return this.feetY - this.lift;
  }

  getLook(): StickFigureLook {
    return this.look;
  }

  destroy(): void {
    this.g.destroy();
  }

  pose(): Pose {
    return stickFigurePose(PLAYER.height, this.stance, this.look.facing);
  }

  private draw(): void {
    const pose = this.pose();
    const { color, outlineColor, outlineAlpha } = this.look;
    const segments = figureSegments(pose);
    this.g.clear();
    // Edge first, then the figure on top of it
    drawSegments(this.g, segments, PLAYER.lineWidth + 3, outlineColor, outlineAlpha);
    drawHead(this.g, pose, PLAYER.lineWidth + 3, outlineColor, outlineAlpha);
    drawSegments(this.g, segments, PLAYER.lineWidth, this.hitColor ?? color, 1);
    drawHead(this.g, pose, PLAYER.lineWidth, this.hitColor ?? color, 1);
    drawGun(this.g, pose, this.look);
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

/** Draws the gun in the gun hand, pointing the way the figure faces. */
export function drawGun(g: Phaser.GameObjects.Graphics, pose: Pose, look: StickFigureLook): void {
  const { x: handX, y: handY } = pose.gunHand;
  const { facing, outlineColor, outlineAlpha } = look;
  const { body, shine } = PLAYER.gun;
  // Rectangles measured forward from the hand, mirrored when facing left
  const rect = (dx: number, dy: number, w: number, h: number): void => {
    const left = facing === 1 ? handX + dx : handX - dx - w;
    g.fillRect(left, handY + dy, w, h);
  };
  g.fillStyle(outlineColor, outlineAlpha);
  rect(-4, -9, 34, 12);
  rect(-4, -4, 12, 18);
  g.fillStyle(body, 1);
  // Barrel pointing forward
  rect(-2, -7, 30, 8);
  // Handle going down from the hand
  rect(-2, -2, 8, 14);
  // A little shine on top of the barrel
  g.fillStyle(shine, 1);
  rect(0, -7, 26, 2);
}
