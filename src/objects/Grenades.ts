import Phaser from 'phaser';
import { GRENADE } from '../config';
import { stepDrop, type Drop } from '../logic/blood';
import { throwVelocity } from '../logic/grenade';

interface Flying {
  drop: Drop;
  shape: Phaser.GameObjects.Container;
  timeLeftMs: number;
  onExplode: (x: number) => void;
}

/**
 * Grenades: thrown in an arc, spinning, and when they land they explode
 * with a flash, a ball of fire, smoke, flying dirt and a shaking screen.
 */
export class Grenades {
  private readonly flying: Flying[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly onBoom: () => void,
  ) {}

  /** Throw from `from` so it lands at `targetX` on the ground; `onExplode` gets the blast spot. */
  throw(
    from: { x: number; y: number },
    targetX: number,
    groundY: number,
    onExplode: (x: number) => void,
  ): void {
    const { flightMs, gravity, colors } = GRENADE;
    const v = throwVelocity(targetX - from.x, groundY - from.y, flightMs, gravity);
    const body = this.scene.add.ellipse(0, 0, 10, 12, colors.body).setStrokeStyle(1.5, 0x111111);
    const lever = this.scene.add.rectangle(2, -7, 6, 2.5, colors.lever);
    const shape = this.scene.add.container(from.x, from.y, [body, lever]);
    this.flying.push({
      drop: { x: from.x, y: from.y, ...v },
      shape,
      timeLeftMs: flightMs,
      onExplode,
    });
  }

  update(deltaMs: number): void {
    for (let i = this.flying.length - 1; i >= 0; i--) {
      const f = this.flying[i];
      if (!f) continue;
      f.drop = stepDrop(f.drop, deltaMs, GRENADE.gravity);
      f.shape.setPosition(f.drop.x, f.drop.y);
      f.shape.rotation += (deltaMs / 1000) * 9;
      f.timeLeftMs -= deltaMs;
      if (f.timeLeftMs <= 0) {
        this.flying.splice(i, 1);
        f.shape.destroy();
        this.explode(f.drop.x, f.drop.y);
        f.onExplode(f.drop.x);
      }
    }
  }

  private explode(x: number, y: number): void {
    this.onBoom();
    this.scene.cameras.main.shake(GRENADE.shakeMs, GRENADE.shake);
    const { radius } = GRENADE;
    const flash = this.scene.add.circle(x, y - 10, radius * 0.4, 0xfff3c4, 0.95);
    const fire = this.scene.add.circle(x, y - 15, radius * 0.35, 0xff7a1a, 0.85);
    this.scene.tweens.add({
      targets: flash,
      scale: 2.4,
      alpha: 0,
      duration: 220,
      onComplete: () => {
        flash.destroy();
      },
    });
    this.scene.tweens.add({
      targets: fire,
      scale: 2.6,
      alpha: 0,
      y: y - 50,
      duration: 650,
      ease: 'Quad.easeOut',
      onComplete: () => {
        fire.destroy();
      },
    });
    // Thick smoke rising
    for (let i = 0; i < 9; i++) {
      const smoke = this.scene.add.circle(
        x + (Math.random() - 0.5) * 40,
        y - 10,
        10,
        0x3a3533,
        0.6,
      );
      this.scene.tweens.add({
        targets: smoke,
        x: smoke.x + (Math.random() - 0.5) * 60,
        y: y - 60 - Math.random() * 80,
        scale: 3 + Math.random() * 2,
        alpha: 0,
        duration: 1400 + Math.random() * 900,
        delay: i * 40,
        ease: 'Sine.easeOut',
        onComplete: () => {
          smoke.destroy();
        },
      });
    }
    // Dirt and stones flying out
    for (let i = 0; i < 14; i++) {
      const bit = this.scene.add.rectangle(x, y - 5, 3 + Math.random() * 3, 3, 0x5e5549);
      const angle = -Math.PI * (0.1 + Math.random() * 0.8);
      const distance = 40 + Math.random() * radius;
      this.scene.tweens.add({
        targets: bit,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance * 0.8 + 30,
        angle: Math.random() * 360,
        alpha: 0,
        duration: 600 + Math.random() * 400,
        ease: 'Quad.easeOut',
        onComplete: () => {
          bit.destroy();
        },
      });
    }
    // A black burn mark stays on the ground for a while
    const scorch = this.scene.add.ellipse(x, y, radius * 0.9, 14, 0x0d0b09, 0.6);
    this.scene.tweens.add({
      targets: scorch,
      alpha: 0,
      delay: 4000,
      duration: 1500,
      onComplete: () => {
        scorch.destroy();
      },
    });
  }
}
