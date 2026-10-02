import Phaser from 'phaser';
import { BLOOD, BREAK, PLAYER, type Weapon } from '../config';
import { arcPoint } from '../logic/arc';
import { cutSegments, figureSegments, type Segment } from '../logic/cut';
import type { Pose } from '../logic/pose';
import {
  drawGun,
  drawHead,
  drawOutfit,
  drawSegments,
  headCenter,
  lookOutfit,
  type StickFigureLook,
} from './StickFigure';

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
    /** Where the ground is. Lower than `feetY` if it was hit in the air. */
    groundY: number,
    /** Which way the bullet flew: 1 = right, -1 = left. The pieces fall that way. */
    push: 1 | -1,
    weapon: Weapon = 'pistol',
  ) {
    // Cut height measured from the feet, like the pose
    const cutY = hit.y - feetY;
    const { upper, lower } = cutSegments(figureSegments(pose), cutY);
    const headOnTop = headCenter(pose).y < cutY;
    const gunOnTop = pose.gunHand.y < cutY;

    // Blood pools grow where the pieces land. Made first, so they lie under the pieces.
    const topLandX = x + push * BREAK.topFlyX;
    const legsLandX = x + push * pose.hip.y * -0.5;
    const pools = [topLandX, legsLandX].map((poolX) => {
      const { width, height, alpha } = BLOOD.pool;
      return scene.add.ellipse(poolX, groundY, width, height, BLOOD.dark, alpha).setScale(0);
    });

    // The top piece turns around the cut, the bottom piece around the feet
    const top = scene.add.graphics({ x, y: hit.y });
    this.drawPiece(top, upper, pose, look, headOnTop, gunOnTop ? weapon : null, cutY, -cutY);
    const bottom = scene.add.graphics({ x, y: feetY });
    this.drawPiece(bottom, lower, pose, look, !headOnTop, gunOnTop ? null : weapon, cutY, 0);

    // The top piece is thrown up a little, spins and lands flat with a small bounce
    const flight = { t: 0 };
    const start = { x, y: hit.y };
    const land = { x: topLandX, y: groundY - BREAK.restHeight };
    scene.tweens.add({
      targets: flight,
      t: 1,
      duration: BREAK.topFallMs,
      ease: 'Linear',
      onUpdate: () => {
        const p = arcPoint(start, land, BREAK.topArcHeight, flight.t);
        top.setPosition(p.x, p.y);
        top.setAngle(push * BREAK.topSpin * flight.t);
      },
      onComplete: () => {
        scene.tweens.add({
          targets: top,
          y: land.y - BREAK.bounceHeight,
          duration: BREAK.bounceMs,
          yoyo: true,
          ease: 'Sine.easeOut',
        });
        this.growPool(scene, pools[0]);
      },
    });

    // The legs fall over flat and bounce a little on the ground
    scene.tweens.add({
      targets: bottom,
      angle: push * BREAK.bottomTip,
      y: groundY,
      delay: BREAK.bottomDelayMs,
      duration: BREAK.bottomFallMs,
      ease: 'Bounce.easeOut',
      onComplete: () => {
        this.growPool(scene, pools[1]);
      },
    });

    const drops = this.sprayBlood(scene, hit, groundY, push, BLOOD.drops);
    for (let i = 1; i <= BLOOD.squirts; i++) {
      scene.time.delayedCall(i * BLOOD.squirtEveryMs, () => {
        drops.push(...this.sprayBlood(scene, hit, groundY, push, BLOOD.squirtDrops));
      });
    }

    scene.time.delayedCall(BREAK.fadeDelayMs, () => {
      const all = [top, bottom, ...pools, ...drops];
      scene.tweens.add({
        targets: all,
        alpha: 0,
        duration: BREAK.fadeMs,
        onComplete: () => {
          all.forEach((o) => {
            o.destroy();
          });
        },
      });
    });
  }

  private growPool(scene: Phaser.Scene, pool: Phaser.GameObjects.Ellipse | undefined): void {
    if (!pool) return;
    scene.tweens.add({
      targets: pool,
      scale: 1,
      duration: BLOOD.pool.growMs,
      ease: 'Sine.easeOut',
    });
  }

  /** Draws one piece. `shiftY` moves it so it turns around the right point. `cutY` is where it broke. */
  private drawPiece(
    g: Phaser.GameObjects.Graphics,
    segments: Segment[],
    pose: Pose,
    look: StickFigureLook,
    withHead: boolean,
    /** The gun this piece holds, or null. */
    gun: Weapon | null,
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
    drawOutfit(g, shifted, shiftedPose, lookOutfit(look), withHead, shiftY);
    if (gun) drawGun(g, shiftedPose, look, gun);

    // Red at the ends where it broke
    g.fillStyle(BLOOD.color, 1);
    for (const s of segments) {
      for (const p of [s.from, s.to]) {
        if (Math.abs(p.y - cutY) < 0.01) g.fillCircle(p.x, p.y + shiftY, PLAYER.lineWidth * 0.7);
      }
    }
  }

  /** Red drops fly out of the hit spot in arcs and land on the ground as little splats. */
  private sprayBlood(
    scene: Phaser.Scene,
    hit: { x: number; y: number },
    groundY: number,
    push: 1 | -1,
    count: number,
  ): Phaser.GameObjects.Arc[] {
    const drops: Phaser.GameObjects.Arc[] = [];
    for (let i = 0; i < count; i++) {
      const radius = BLOOD.minRadius + Math.random() * (BLOOD.maxRadius - BLOOD.minRadius);
      const drop = scene.add.circle(hit.x, hit.y, radius, BLOOD.color);
      drops.push(drop);
      // Most drops fly forward (the way the bullet went), a few backward
      const forward = Math.random() < 0.8 ? push : -push;
      const from = { x: hit.x, y: hit.y };
      const to = {
        x: hit.x + forward * (10 + Math.random() * BLOOD.spread),
        y: groundY - Math.random() * BLOOD.landingDepth,
      };
      const arcHeight = Math.random() * BLOOD.maxArcHeight;
      const flight = { t: 0 };
      scene.tweens.add({
        targets: flight,
        t: 1,
        duration: BLOOD.minFlightMs + Math.random() * BLOOD.extraFlightMs,
        onUpdate: () => {
          const p = arcPoint(from, to, arcHeight, flight.t);
          drop.setPosition(p.x, p.y);
        },
        onComplete: () => {
          // Flatten into a splat on the ground
          drop.setScale(1.6, 0.5).setFillStyle(BLOOD.dark);
        },
      });
    }
    return drops;
  }
}
