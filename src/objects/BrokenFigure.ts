import Phaser from 'phaser';
import { BLOOD, BREAK, PLAYER } from '../config';
import { cutSegments, figureSegments, type Segment } from '../logic/cut';
import type { Pose } from '../logic/pose';
import { drawGun, drawHead, drawSegments, headCenter, type StickFigureLook } from './StickFigure';

/**
 * A stick figure cut in two where the bullet hit. The top falls off, the legs
 * tip over, red drops spray out, and then everything fades away.
 */
export class BrokenFigure {
  constructor(
    scene: Phaser.Scene,
    pose: Pose,
    look: StickFigureLook,
    x: number,
    feetY: number,
    hit: { x: number; y: number },
  ) {
    // Cut height measured from the feet, like the pose
    const cutY = hit.y - feetY;
    const { upper, lower } = cutSegments(figureSegments(pose), cutY);
    const headOnTop = headCenter(pose).y < cutY;
    const gunOnTop = pose.gunHand.y < cutY;

    // The top piece turns around the cut, the bottom piece around the feet
    const top = scene.add.graphics({ x, y: hit.y });
    this.drawPiece(top, upper, pose, look, headOnTop, gunOnTop, cutY, -cutY);
    const bottom = scene.add.graphics({ x, y: feetY });
    this.drawPiece(bottom, lower, pose, look, !headOnTop, !gunOnTop, cutY, 0);

    // The legs tip away from the bullet, the top tumbles down in front of them
    scene.tweens.add({
      targets: top,
      x: x + BREAK.topFlyX,
      y: feetY - BREAK.restHeight,
      angle: BREAK.topSpin,
      duration: BREAK.topFallMs,
      ease: 'Quad.easeIn',
    });
    scene.tweens.add({
      targets: bottom,
      angle: BREAK.bottomTip,
      delay: BREAK.bottomDelayMs,
      duration: BREAK.bottomFallMs,
      ease: 'Quad.easeIn',
    });

    const drops = this.sprayBlood(scene, hit, feetY);
    scene.tweens.add({
      targets: [top, bottom, ...drops],
      alpha: 0,
      delay: BREAK.fadeDelayMs,
      duration: BREAK.fadeMs,
      onComplete: () => {
        top.destroy();
        bottom.destroy();
        drops.forEach((d) => {
          d.destroy();
        });
      },
    });
  }

  /** Draws one piece. `shiftY` moves it so it turns around the right point. `cutY` is where it broke. */
  private drawPiece(
    g: Phaser.GameObjects.Graphics,
    segments: Segment[],
    pose: Pose,
    look: StickFigureLook,
    withHead: boolean,
    withGun: boolean,
    cutY: number,
    shiftY: number,
  ): void {
    const shifted = segments.map((s) => ({
      from: { x: s.from.x, y: s.from.y + shiftY },
      to: { x: s.to.x, y: s.to.y + shiftY },
    }));
    const shiftedPose: Pose = {
      ...pose,
      neck: { x: pose.neck.x, y: pose.neck.y + shiftY },
      gunHand: { x: pose.gunHand.x, y: pose.gunHand.y + shiftY },
    };
    const edge = PLAYER.lineWidth + 3;
    drawSegments(g, shifted, edge, look.outlineColor, look.outlineAlpha);
    if (withHead) drawHead(g, shiftedPose, edge, look.outlineColor, look.outlineAlpha);
    drawSegments(g, shifted, PLAYER.lineWidth, look.color, 1);
    if (withHead) drawHead(g, shiftedPose, PLAYER.lineWidth, look.color, 1);
    if (withGun) drawGun(g, shiftedPose, look);

    // Red at the ends where it broke
    g.fillStyle(BLOOD.color, 1);
    for (const s of segments) {
      for (const p of [s.from, s.to]) {
        if (Math.abs(p.y - cutY) < 0.01) g.fillCircle(p.x, p.y + shiftY, PLAYER.lineWidth * 0.7);
      }
    }
  }

  /** Red drops fly out of the hit spot and land on the ground. */
  private sprayBlood(
    scene: Phaser.Scene,
    hit: { x: number; y: number },
    feetY: number,
  ): Phaser.GameObjects.Arc[] {
    const drops: Phaser.GameObjects.Arc[] = [];
    for (let i = 0; i < BLOOD.drops; i++) {
      const radius = BLOOD.minRadius + Math.random() * (BLOOD.maxRadius - BLOOD.minRadius);
      const drop = scene.add.circle(hit.x, hit.y, radius, BLOOD.color);
      drops.push(drop);
      // Most drops fly forward (the way the bullet went), a few backward
      const forward = Math.random() < 0.8 ? 1 : -1;
      scene.tweens.add({
        targets: drop,
        x: hit.x + forward * (10 + Math.random() * BLOOD.spread),
        y: feetY - Math.random() * BLOOD.landingDepth,
        scaleY: 0.5,
        duration: BLOOD.minFlightMs + Math.random() * BLOOD.extraFlightMs,
        ease: 'Quad.easeIn',
      });
    }
    return drops;
  }
}
