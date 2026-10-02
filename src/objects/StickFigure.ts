import Phaser from 'phaser';
import { BULLET, PLAYER } from '../config';
import type { Box } from '../logic/bullets';
import { poseBounds, stickFigurePose, type Facing, type Pose, type Stance } from '../logic/pose';

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
      y: this.feetY + hand.y + BULLET.muzzleOffset.y,
    };
  }

  /** The box bullets can hit, on the screen. */
  bounds(): Box {
    const box = poseBounds(this.pose());
    return {
      left: this.x + box.left,
      right: this.x + box.right,
      top: this.feetY + box.top,
      bottom: this.feetY + box.bottom,
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

  destroy(): void {
    this.g.destroy();
  }

  private pose(): Pose {
    return stickFigurePose(PLAYER.height, this.stance, this.look.facing);
  }

  private draw(): void {
    const pose = this.pose();
    const { color, outlineColor, outlineAlpha } = this.look;
    this.g.clear();
    // Edge first, then the figure on top of it
    this.drawBody(pose, PLAYER.lineWidth + 3, outlineColor, outlineAlpha);
    this.drawBody(pose, PLAYER.lineWidth, this.hitColor ?? color, 1);
    this.drawGun(pose);
  }

  private drawBody(pose: Pose, lineWidth: number, color: number, alpha: number): void {
    const line = (from: { x: number; y: number }, to: { x: number; y: number }): void => {
      this.g.lineBetween(from.x, from.y, to.x, to.y);
    };
    this.g.lineStyle(lineWidth, color, alpha);
    // Legs (bent at the knees when crouching)
    line(pose.hip, pose.backKnee);
    line(pose.backKnee, pose.backFoot);
    line(pose.hip, pose.frontKnee);
    line(pose.frontKnee, pose.frontFoot);
    // Body
    line(pose.hip, pose.neck);
    // Back arm hangs down, front arm holds the gun
    line(pose.shoulder, pose.backHand);
    line(pose.shoulder, pose.gunHand);
    // Head
    const extra = (lineWidth - PLAYER.lineWidth) / 2;
    this.g.fillStyle(color, alpha);
    this.g.fillCircle(
      pose.neck.x,
      pose.neck.y - pose.headRadius + lineWidth / 2,
      pose.headRadius + extra,
    );
  }

  private drawGun(pose: Pose): void {
    const { x: handX, y: handY } = pose.gunHand;
    const { facing, outlineColor, outlineAlpha } = this.look;
    const { body, shine } = PLAYER.gun;
    // Rectangles measured forward from the hand, mirrored when facing left
    const rect = (dx: number, dy: number, w: number, h: number): void => {
      const left = facing === 1 ? handX + dx : handX - dx - w;
      this.g.fillRect(left, handY + dy, w, h);
    };
    this.g.fillStyle(outlineColor, outlineAlpha);
    rect(-4, -9, 34, 12);
    rect(-4, -4, 12, 18);
    this.g.fillStyle(body, 1);
    // Barrel pointing forward
    rect(-2, -7, 30, 8);
    // Handle going down from the hand
    rect(-2, -2, 8, 14);
    // A little shine on top of the barrel
    this.g.fillStyle(shine, 1);
    rect(0, -7, 26, 2);
  }
}
