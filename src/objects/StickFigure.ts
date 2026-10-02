import Phaser from 'phaser';
import { BULLET, PLAYER } from '../config';
import { stickFigurePose, type Pose } from '../logic/pose';

/**
 * The player: a black stick figure holding a gun pointing right.
 * Drawn around its feet, so `x`/`feetY` is where it stands.
 */
export class StickFigure {
  private readonly g: Phaser.GameObjects.Graphics;
  private crouching = false;

  constructor(
    scene: Phaser.Scene,
    private readonly x: number,
    private readonly feetY: number,
  ) {
    this.g = scene.add.graphics({ x, y: feetY });
    this.draw();
  }

  /** Where bullets come out of the gun, on the screen. Lower when crouching. */
  muzzlePosition(): { x: number; y: number } {
    const hand = stickFigurePose(PLAYER.height, this.crouching).gunHand;
    return {
      x: this.x + hand.x + BULLET.muzzleOffset.x,
      y: this.feetY + hand.y + BULLET.muzzleOffset.y,
    };
  }

  /** Crouch down or stand up. Only redraws when the pose really changes. */
  setCrouching(crouching: boolean): void {
    if (crouching === this.crouching) return;
    this.crouching = crouching;
    this.draw();
  }

  private draw(): void {
    const pose = stickFigurePose(PLAYER.height, this.crouching);
    this.g.clear();
    // Pale edge first, then the black figure on top of it
    this.drawBody(pose, PLAYER.lineWidth + 3, PLAYER.outlineColor, PLAYER.outlineAlpha);
    this.drawBody(pose, PLAYER.lineWidth, PLAYER.color, 1);
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
    // Back arm hangs down, front arm holds the gun straight out
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
    const { body, shine } = PLAYER.gun;
    // Pale edge around the gun, like the figure has
    this.g.fillStyle(PLAYER.outlineColor, PLAYER.outlineAlpha);
    this.g.fillRect(handX - 4, handY - 9, 34, 12);
    this.g.fillRect(handX - 4, handY - 4, 12, 18);
    this.g.fillStyle(body, 1);
    // Barrel pointing right
    this.g.fillRect(handX - 2, handY - 7, 30, 8);
    // Handle going down from the hand
    this.g.fillRect(handX - 2, handY - 2, 8, 14);
    // A little shine on top of the barrel
    this.g.fillStyle(shine, 1);
    this.g.fillRect(handX, handY - 7, 26, 2);
  }
}
