import Phaser from 'phaser';
import { BLOOD, BREAK, type Weapon } from '../config';
import { arcPoint } from '../logic/arc';
import { dropShape, stepDrop, type Drop } from '../logic/blood';
import { cutTracked, figureSegments, pieceSegment, type Segment } from '../logic/cut';
import { lerpPose, limpPose, type Pose } from '../logic/pose';
import {
  drawGun,
  drawHead,
  drawOutfit,
  drawSegments,
  lookLineWidth,
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
    const view = scene.cameras.main.worldView;
    const tipsOff = x + push * legsLength < view.left || x + push * legsLength > view.right;
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
      this.stopBlood();
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
    const lineWidth = lookLineWidth(look);
    const edge = lineWidth + 3;
    drawSegments(g, shifted, edge, look.outlineColor, look.outlineAlpha, lineWidth);
    if (withHead) drawHead(g, shiftedPose, edge, look.outlineColor, look.outlineAlpha, lineWidth);
    drawOutfit(g, shifted, shiftedPose, lookOutfit(look), withHead, shiftY, lineWidth);
    if (gun) drawGun(g, shiftedPose, look, gun);

    // Red at the ends where it broke
    g.fillStyle(BLOOD.color, 1);
    for (const p of cutEnds) g.fillCircle(p.x, p.y + shiftY, lineWidth * 0.8);
    const first = cutEnds[0];
    if (first) this.cutEnds.set(g, { x: first.x, y: first.y + shiftY });
  }

  /** Blood drops still in the air. They fall with gravity every frame until they land. */
  private readonly flying: {
    drop: Drop;
    shape: Phaser.GameObjects.Ellipse;
    landY: number;
  }[] = [];

  private bloodScene: Phaser.Scene | null = null;

  /** Every frame: move the flying drops, stretch them the way they fly, splat them on landing. */
  private updateBlood(_time: number, deltaMs: number): void {
    const scene = this.bloodScene;
    if (!scene) return;
    for (let i = this.flying.length - 1; i >= 0; i--) {
      const f = this.flying[i];
      if (!f) continue;
      if (!f.shape.active) {
        this.flying.splice(i, 1);
        continue;
      }
      f.drop = stepDrop(f.drop, deltaMs, BLOOD.gravity);
      if (f.drop.y >= f.landY) {
        // Splat: flat and dark on the ground
        f.shape
          .setPosition(f.drop.x, f.landY)
          .setRotation(0)
          .setScale(1.5 + Math.random(), 0.4)
          .setFillStyle(BLOOD.dark);
        this.flying.splice(i, 1);
        continue;
      }
      const { angle, stretch } = dropShape(f.drop.vx, f.drop.vy, BLOOD.maxStretch);
      f.shape.setPosition(f.drop.x, f.drop.y).setRotation(angle).setScale(stretch, 0.8);
    }
  }

  private startBlood(scene: Phaser.Scene): void {
    this.bloodScene = scene;
    scene.events.on('update', this.updateBlood, this);
    scene.events.once('shutdown', this.stopBlood, this);
  }

  private stopBlood(): void {
    const scene = this.bloodScene;
    if (!scene) return;
    scene.events.off('update', this.updateBlood, this);
    scene.events.off('shutdown', this.stopBlood, this);
    this.bloodScene = null;
  }

  /**
   * Blood shoots out of `from`: drops fly with gravity and splat on the ground,
   * and a fine red mist puffs out and fades. `power` below 1 makes small drips.
   */
  private sprayBlood(
    scene: Phaser.Scene,
    from: { x: number; y: number },
    groundY: number,
    push: 1 | -1,
    count: number,
    power = 1,
  ): Phaser.GameObjects.Shape[] {
    if (!this.bloodScene) this.startBlood(scene);
    const made: Phaser.GameObjects.Shape[] = [];
    for (let i = 0; i < count; i++) {
      const radius = BLOOD.minRadius + Math.random() * (BLOOD.maxRadius - BLOOD.minRadius);
      // Darker and lighter reds, like real blood
      const color = Phaser.Display.Color.Interpolate.ColorWithColor(
        Phaser.Display.Color.ValueToColor(BLOOD.color),
        Phaser.Display.Color.ValueToColor(BLOOD.dark),
        100,
        Math.random() * 70,
      );
      const shape = scene.add.ellipse(
        from.x,
        from.y,
        radius * 2,
        radius * 2,
        Phaser.Display.Color.GetColor(color.r, color.g, color.b),
      );
      made.push(shape);
      // Most drops fly forward (the way the bullet went), a few backward
      const forward = Math.random() < 0.8 ? push : -push;
      this.flying.push({
        shape,
        landY: groundY - Math.random() * BLOOD.landingDepth,
        drop: {
          x: from.x,
          y: from.y,
          vx: forward * (40 + Math.random() * BLOOD.speed) * power,
          vy: -(Math.random() * BLOOD.upSpeed) * power + 30,
        },
      });
    }
    // Fine mist: lots of tiny see-through drops that puff out and fade fast
    const mistCount = Math.round(BLOOD.mist * power);
    for (let i = 0; i < mistCount; i++) {
      const puff = scene.add.circle(from.x, from.y, 0.8 + Math.random() * 1.6, BLOOD.color, 0.6);
      made.push(puff);
      const angle = Math.random() * Math.PI * 2;
      const distance = 10 + Math.random() * BLOOD.mistSpread;
      scene.tweens.add({
        targets: puff,
        x: from.x + Math.cos(angle) * distance + push * distance * 0.5,
        y: from.y + Math.sin(angle) * distance * 0.6,
        alpha: 0,
        duration: BLOOD.mistMs * (0.6 + Math.random() * 0.8),
        ease: 'Quad.easeOut',
      });
    }
    return made;
  }
}
