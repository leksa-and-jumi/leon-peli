import Phaser from 'phaser';
import { GUN_FX, SPECIAL_BULLETS } from '../config';
import { bounceOnGround, stepDrop, type Drop } from '../logic/blood';
import { bulletHeading, type Bullet } from '../logic/bullets';

interface Shell {
  drop: Drop;
  shape: Phaser.GameObjects.Rectangle;
  spin: number;
  groundY: number;
  resting: boolean;
  /** When to start fading away (scene time, ms). */
  fadeAt: number;
}

/**
 * Everything that makes shooting look real: a bright muzzle flash with a glow,
 * a puff of smoke, glowing bullet trails, and brass shells that fly out of
 * the gun, spin, bounce on the stones and lie there for a while.
 */
export class GunEffects {
  private readonly shells: Shell[] = [];
  private readonly trails: Phaser.GameObjects.Graphics;

  constructor(private readonly scene: Phaser.Scene) {
    this.trails = scene.add.graphics();
  }

  /** Flash, smoke and a flying shell for one shot. */
  shot(
    muzzle: { x: number; y: number },
    hand: { x: number; y: number },
    facing: 1 | -1,
    groundY: number,
  ): void {
    this.flash(muzzle, facing);
    this.smoke(muzzle, facing);
    this.ejectShell(hand, facing, groundY);
  }

  /** A star-shaped burst of fire pointing forward, with a soft glow around it. */
  private flash(at: { x: number; y: number }, facing: 1 | -1): void {
    const { glowRadius, length, durationMs } = GUN_FX.flash;
    const g = this.scene.add.graphics({ x: at.x, y: at.y });
    g.fillStyle(GUN_FX.flash.glow, 0.25);
    g.fillCircle(0, 0, glowRadius);
    g.fillStyle(GUN_FX.flash.outer, 0.9);
    g.fillTriangle(0, -6, 0, 6, facing * length, 0);
    g.fillTriangle(0, 0, facing * length * 0.4, -9, facing * length * 0.5, 0);
    g.fillTriangle(0, 0, facing * length * 0.4, 9, facing * length * 0.5, 0);
    g.fillStyle(GUN_FX.flash.inner, 1);
    g.fillCircle(facing * 3, 0, 4);
    this.scene.tweens.add({
      targets: g,
      alpha: 0,
      scale: 1.3,
      duration: durationMs,
      onComplete: () => {
        g.destroy();
      },
    });
  }

  /** Grey smoke that drifts up and spreads out. */
  private smoke(at: { x: number; y: number }, facing: 1 | -1): void {
    for (let i = 0; i < GUN_FX.smoke.puffs; i++) {
      const puff = this.scene.add.circle(
        at.x + facing * i * 4,
        at.y,
        3 + Math.random() * 3,
        GUN_FX.smoke.color,
        GUN_FX.smoke.alpha,
      );
      this.scene.tweens.add({
        targets: puff,
        x: puff.x + facing * (10 + Math.random() * 20),
        y: puff.y - (15 + Math.random() * 20),
        scale: 3 + Math.random() * 2,
        alpha: 0,
        duration: GUN_FX.smoke.ms * (0.7 + Math.random() * 0.6),
        ease: 'Sine.easeOut',
        onComplete: () => {
          puff.destroy();
        },
      });
    }
  }

  /** A brass shell pops out of the side of the gun, backwards and up. */
  private ejectShell(at: { x: number; y: number }, facing: 1 | -1, groundY: number): void {
    const { width, height, color } = GUN_FX.shell;
    const shape = this.scene.add.rectangle(at.x, at.y, width, height, color);
    this.shells.push({
      shape,
      drop: {
        x: at.x,
        y: at.y,
        vx: -facing * (50 + Math.random() * 90),
        vy: -(140 + Math.random() * 120),
      },
      spin: (Math.random() - 0.5) * 30,
      groundY: groundY - Math.random() * GUN_FX.shell.landingDepth,
      resting: false,
      fadeAt: this.scene.time.now + GUN_FX.shell.lieMs,
    });
    // Not too many shells lying around at once
    while (this.shells.length > GUN_FX.shell.max) {
      this.shells.shift()?.shape.destroy();
    }
  }

  /** Every frame: move the shells and draw the bullets' glowing trails. */
  update(deltaMs: number, bullets: readonly Bullet[]): void {
    const now = this.scene.time.now;
    for (let i = this.shells.length - 1; i >= 0; i--) {
      const s = this.shells[i];
      if (!s) continue;
      if (now >= s.fadeAt) {
        s.shape.setAlpha(s.shape.alpha - deltaMs / GUN_FX.shell.fadeMs);
        if (s.shape.alpha <= 0) {
          s.shape.destroy();
          this.shells.splice(i, 1);
          continue;
        }
      }
      if (s.resting) continue;
      const bounced = bounceOnGround(
        stepDrop(s.drop, deltaMs, GUN_FX.shell.gravity),
        s.groundY,
        GUN_FX.shell.bounciness,
        GUN_FX.shell.minBounce,
      );
      s.drop = bounced.drop;
      s.resting = bounced.resting;
      s.shape.setPosition(s.drop.x, s.drop.y);
      s.shape.rotation += (s.resting ? 0 : s.spin) * (deltaMs / 1000);
      if (s.resting) s.shape.setRotation(Math.round(s.shape.rotation / Math.PI) * Math.PI);
    }

    // Each bullet: a fading streak behind it and a bright hot tip
    const { length, color, tip, width } = GUN_FX.trail;
    this.trails.clear();
    for (const b of bullets) {
      const steps = 6;
      // The trail points back the way the bullet came (aimed bullets fly at an angle)
      const heading = bulletHeading(b);
      for (let k = 0; k < steps; k++) {
        const near = (length * k) / steps;
        const far = (length * (k + 1)) / steps;
        // Poison bullets leave a green trail, exploding ones an orange one
        const trail = b.explosive
          ? SPECIAL_BULLETS.explosiveColor
          : b.poison
            ? SPECIAL_BULLETS.poisonColor
            : color;
        this.trails.lineStyle(width * (1 - k / steps), trail, 0.6 * (1 - k / steps));
        this.trails.lineBetween(
          b.x - heading.x * near,
          b.y - heading.y * near,
          b.x - heading.x * far,
          b.y - heading.y * far,
        );
      }
      this.trails.fillStyle(tip, 1);
      this.trails.fillCircle(b.x, b.y, width * 0.9);
    }
  }

  /** An exploding bullet goes off inside someone: a quick fireball and sparks. */
  burst(at: { x: number; y: number }): void {
    const flash = this.scene.add.circle(at.x, at.y, 14, 0xfff3c4, 0.95);
    const fire = this.scene.add.circle(at.x, at.y, 12, SPECIAL_BULLETS.explosiveColor, 0.85);
    for (const [shape, scale, ms] of [
      [flash, 2.5, 200],
      [fire, 3, 450],
    ] as const) {
      this.scene.tweens.add({
        targets: shape,
        scale,
        alpha: 0,
        duration: ms,
        ease: 'Quad.easeOut',
        onComplete: () => {
          shape.destroy();
        },
      });
    }
    for (let i = 0; i < 10; i++) {
      const spark = this.scene.add.circle(at.x, at.y, 2, 0xffd54f, 1);
      const angle = Math.random() * Math.PI * 2;
      const distance = 25 + Math.random() * 35;
      this.scene.tweens.add({
        targets: spark,
        x: at.x + Math.cos(angle) * distance,
        y: at.y + Math.sin(angle) * distance,
        alpha: 0,
        duration: 300 + Math.random() * 200,
        onComplete: () => {
          spark.destroy();
        },
      });
    }
  }

  /** A little green bubble rising from someone who's poisoned. */
  poisonPuff(at: { x: number; y: number }): void {
    const puff = this.scene.add.circle(
      at.x + (Math.random() - 0.5) * 20,
      at.y,
      2 + Math.random() * 3,
      SPECIAL_BULLETS.poisonColor,
      0.8,
    );
    this.scene.tweens.add({
      targets: puff,
      y: puff.y - 30 - Math.random() * 20,
      alpha: 0,
      duration: 700,
      onComplete: () => {
        puff.destroy();
      },
    });
  }
}
