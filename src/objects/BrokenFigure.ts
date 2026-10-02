import Phaser from 'phaser';
import { BLOOD, BREAK, GAME_WIDTH, PLAYER, type Weapon } from '../config';
import { arcPoint } from '../logic/arc';
import { cutTracked, figureSegments, pieceSegment, type Segment } from '../logic/cut';
import { lerpPose, limpPose, type Pose } from '../logic/pose';
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
 * A stick figure cut in two where the bullet hit. The pieces go limp as they
 * fall, topple over and lie on the ground, blood sprays and drips and pools,
 * and then everything fades away.
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
    const { upper, lower } = cutTracked(figureSegments(pose), cutY);
    const headOnTop = headCenter(pose).y < cutY;
    const gunOnTop = pose.gunHand.y < cutY;
    const limp = limpPose(pose);

    // The legs tip away from the bullet, unless that would put them off the screen
    const legsLength = Math.abs(Math.min(cutY, 0));
    const tipsOff = x + push * legsLength < 0 || x + push * legsLength > GAME_WIDTH;
    const legsTip: 1 | -1 = tipsOff ? (-push as 1 | -1) : push;

    // Blood pools grow where the pieces land. Made first, so they lie under the pieces.
    const topLandX = x + push * BREAK.topFlyX;
    const legsLandX = x + (legsTip * legsLength) / 2;
    const pools = [topLandX, legsLandX, x].map((poolX) => {
      const { width, height, alpha } = BLOOD.pool;
      return scene.add.ellipse(poolX, groundY, width, height, BLOOD.dark, alpha).setScale(0);
    });

    // The top piece turns around the cut, the bottom piece around the feet
    const top = scene.add.graphics({ x, y: hit.y });
    const bottom = scene.add.graphics({ x, y: feetY });
    const pieces = [
      { g: top, tracked: upper, head: headOnTop, gun: gunOnTop ? weapon : null, shiftY: -cutY },
      { g: bottom, tracked: lower, head: !headOnTop, gun: gunOnTop ? null : weapon, shiftY: 0 },
    ];

    // Arms and legs go limp bit by bit while the pieces fall
    const state = { limp: 0 };
    const redraw = (): void => {
      const now = lerpPose(pose, limp, state.limp);
      const lines = figureSegments(now);
      for (const piece of pieces) {
        const segments = piece.tracked.map((p) => pieceSegment(lines, p));
        const cutEnds = piece.tracked.flatMap((p, i) => {
          const seg = segments[i];
          if (!seg || p.cutAt === null) return [];
          return [p.cutAt === 'from' ? seg.from : seg.to];
        });
        this.drawPiece(piece.g, segments, cutEnds, now, look, piece.head, piece.gun, piece.shiftY);
      }
    };
    redraw();
    scene.tweens.add({
      targets: state,
      limp: 1,
      duration: BREAK.limpMs,
      ease: 'Sine.easeInOut',
      onUpdate: redraw,
    });

    // The top piece is thrown up a little, tumbles and comes to rest lying down
    const flight = { t: 0 };
    const start = { x, y: hit.y };
    const land = { x: topLandX, y: groundY - BREAK.restHeight };
    scene.tweens.add({
      targets: flight,
      t: 1,
      duration: BREAK.topFallMs,
      ease: 'Sine.easeIn',
      onUpdate: () => {
        const p = arcPoint(start, land, BREAK.topArcHeight, flight.t);
        top.setPosition(p.x, p.y);
        top.setAngle(push * BREAK.topSpin * flight.t);
      },
      onComplete: () => {
        this.settle(scene, top, push);
        this.growPool(scene, pools[0]);
      },
    });

    // The legs topple over, slowly at first and then faster, and settle on the ground
    scene.tweens.add({
      targets: bottom,
      angle: legsTip * BREAK.bottomTip,
      y: groundY,
      delay: BREAK.bottomDelayMs,
      duration: BREAK.bottomFallMs,
      ease: 'Quad.easeIn',
      onComplete: () => {
        this.settle(scene, bottom, legsTip);
        this.growPool(scene, pools[1]);
      },
    });
    this.growPool(scene, pools[2]);

    // Blood: a big spray, more squirts, and drips from both broken ends while they fall
    const drops = this.sprayBlood(scene, hit, groundY, push, BLOOD.drops);
    for (let i = 1; i <= BLOOD.squirts; i++) {
      scene.time.delayedCall(i * BLOOD.squirtEveryMs, () => {
        drops.push(...this.sprayBlood(scene, hit, groundY, push, BLOOD.squirtDrops));
      });
    }
    const dripper = scene.time.addEvent({
      delay: BLOOD.dripEveryMs,
      repeat: Math.floor(BLOOD.dripForMs / BLOOD.dripEveryMs),
      callback: () => {
        for (const g of [top, bottom]) {
          const end = this.cutEndOnScreen(g);
          if (end) drops.push(...this.sprayBlood(scene, end, groundY, push, BLOOD.dripDrops, 0.25));
        }
      },
    });

    scene.time.delayedCall(BREAK.fadeDelayMs, () => {
      dripper.remove();
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

  /** Where each piece's broken end is, in the piece's own coordinates. */
  private readonly cutEnds = new Map<Phaser.GameObjects.Graphics, { x: number; y: number }>();

  /** The broken end of a piece on the screen, following its spin. */
  private cutEndOnScreen(g: Phaser.GameObjects.Graphics): { x: number; y: number } | null {
    const local = this.cutEnds.get(g);
    if (!local || !g.active) return null;
    const cos = Math.cos(g.rotation);
    const sin = Math.sin(g.rotation);
    return { x: g.x + local.x * cos - local.y * sin, y: g.y + local.x * sin + local.y * cos };
  }

  /** A soft landing: rocks back a little and lies still. */
  private settle(scene: Phaser.Scene, g: Phaser.GameObjects.Graphics, push: 1 | -1): void {
    scene.tweens.add({
      targets: g,
      angle: g.angle - push * BREAK.settleRock,
      duration: BREAK.settleMs,
      yoyo: true,
      ease: 'Sine.easeOut',
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

  /** Draws one piece. `shiftY` moves it so it turns around the right point. */
  private drawPiece(
    g: Phaser.GameObjects.Graphics,
    segments: Segment[],
    cutEnds: { x: number; y: number }[],
    pose: Pose,
    look: StickFigureLook,
    withHead: boolean,
    /** The gun this piece holds, or null. */
    gun: Weapon | null,
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
    g.clear();
    const edge = PLAYER.lineWidth + 3;
    drawSegments(g, shifted, edge, look.outlineColor, look.outlineAlpha);
    if (withHead) drawHead(g, shiftedPose, edge, look.outlineColor, look.outlineAlpha);
    drawOutfit(g, shifted, shiftedPose, lookOutfit(look), withHead, shiftY);
    if (gun) drawGun(g, shiftedPose, look, gun);

    // Red at the ends where it broke
    g.fillStyle(BLOOD.color, 1);
    for (const p of cutEnds) g.fillCircle(p.x, p.y + shiftY, PLAYER.lineWidth * 0.8);
    const first = cutEnds[0];
    if (first) this.cutEnds.set(g, { x: first.x, y: first.y + shiftY });
  }

  /**
   * Red drops fly out in arcs and land on the ground as little splats.
   * `power` below 1 makes small drips instead of a big spray.
   */
  private sprayBlood(
    scene: Phaser.Scene,
    hit: { x: number; y: number },
    groundY: number,
    push: 1 | -1,
    count: number,
    power = 1,
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
        x: hit.x + forward * (5 + Math.random() * BLOOD.spread * power),
        y: groundY - Math.random() * BLOOD.landingDepth,
      };
      const arcHeight = Math.random() * BLOOD.maxArcHeight * power;
      const flight = { t: 0 };
      scene.tweens.add({
        targets: flight,
        t: 1,
        duration: BLOOD.minFlightMs + Math.random() * BLOOD.extraFlightMs,
        ease: 'Sine.easeIn',
        onUpdate: () => {
          const p = arcPoint(from, to, arcHeight, flight.t);
          drop.setPosition(p.x, p.y);
        },
        onComplete: () => {
          // Flatten into a splat on the ground
          drop.setScale(1.7, 0.5).setFillStyle(BLOOD.dark);
        },
      });
    }
    return drops;
  }
}
