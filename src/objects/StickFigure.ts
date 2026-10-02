import Phaser from 'phaser';
import { BULLET, PLAYER, WEAPONS, type Weapon } from '../config';
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
  /** How tall the figure is. The player's height if not given. */
  height?: number;
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
    this.g.destroy();
  }

  pose(): Pose {
    return stickFigurePose(this.look.height ?? PLAYER.height, this.stance, this.look.facing);
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
    drawGun(this.g, pose, this.look, this.weapon);
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
export function drawGun(
  g: Phaser.GameObjects.Graphics,
  pose: Pose,
  look: StickFigureLook,
  weapon: Weapon = 'pistol',
): void {
  const { x: handX, y: handY } = pose.gunHand;
  const { facing, outlineColor, outlineAlpha } = look;
  // Rectangles measured forward from the hand, mirrored when facing left
  const rect = (dx: number, dy: number, w: number, h: number): void => {
    const left = facing === 1 ? handX + dx : handX - dx - w;
    g.fillRect(left, handY + dy, w, h);
  };

  if (weapon === 'axe') {
    const { handle, blade, edge } = WEAPONS.axe.colors;
    g.fillStyle(outlineColor, outlineAlpha);
    rect(-4, -46, 9, 58);
    rect(3, -48, 22, 24);
    // Long wooden handle going up from the hand
    g.fillStyle(handle, 1);
    rect(-2, -44, 5, 54);
    // Heavy blade at the top, facing forward, with a shiny edge
    g.fillStyle(blade, 1);
    rect(3, -46, 16, 20);
    g.fillStyle(edge, 1);
    rect(19, -46, 4, 20);
    return;
  }

  if (weapon === 'rifle') {
    const { body, wood, shine } = WEAPONS.rifle.colors;
    g.fillStyle(outlineColor, outlineAlpha);
    rect(-28, -10, 82, 13);
    rect(-4, -2, 26, 20);
    // Stock against the shoulder side, behind the hand
    g.fillStyle(wood, 1);
    rect(-26, -7, 22, 9);
    g.fillStyle(body, 1);
    // Body of the rifle
    rect(-6, -8, 32, 10);
    // Long barrel
    rect(26, -6, 26, 5);
    // Grip under the hand and a curved-looking magazine in front of it
    rect(-2, 0, 7, 12);
    rect(11, 1, 8, 9);
    rect(13, 9, 8, 7);
    g.fillStyle(shine, 1);
    rect(-4, -8, 54, 2);
    return;
  }

  const { body, shine } = PLAYER.gun;
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
