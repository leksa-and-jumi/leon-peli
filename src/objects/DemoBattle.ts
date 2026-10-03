import Phaser from 'phaser';
import {
  BOSS,
  BULLET,
  DEMO,
  ENEMY,
  GAME_HEIGHT,
  GAME_WIDTH,
  OUTFITS,
  PLAYER,
  RUINS,
} from '../config';
import { bulletHits, moveBullets, screenArea, type Bullet } from '../logic/bullets';
import { Boss } from './Boss';
import { Enemy, type Foe } from './Enemy';
import { GunEffects } from './GunEffects';
import { StickFigure } from './StickFigure';

/**
 * The battle behind the start menu, like a video of the game: a soldier in camo
 * shoots white stick figures (and sometimes a red axe guy) by himself, while
 * explosions flash far away in the ruins. Nobody can hurt the soldier here.
 */
export class DemoBattle {
  private readonly hero: StickFigure;
  private readonly fx: GunEffects;
  private foe: Foe | null = null;
  private spawned = 0;
  private heroBullets: Bullet[] = [];
  private foeBullets: Bullet[] = [];
  private lastShotMs = 0;

  constructor(private readonly scene: Phaser.Scene) {
    this.startWarGlow();
    this.hero = new StickFigure(scene, DEMO.heroX, PLAYER.feetY, {
      color: PLAYER.color,
      outlineColor: PLAYER.outlineColor,
      outlineAlpha: PLAYER.outlineAlpha,
      facing: 1,
      outfit: OUTFITS.camo,
    });
    this.hero.setWeapon('rifle');
    this.fx = new GunEffects(scene);
    this.spawn();
    scene.time.addEvent({
      delay: DEMO.explosionEveryMs,
      loop: true,
      callback: () => {
        this.explosion();
      },
    });
    scene.events.on('update', this.tick, this);
    scene.events.once('shutdown', () => {
      scene.events.off('update', this.tick, this);
    });
  }

  private spawn(): void {
    this.spawned += 1;
    if (this.spawned % DEMO.bossEvery === 0) {
      this.foe = new Boss(
        this.scene,
        BOSS,
        () => {
          // The axe never hurts the soldier in the video
        },
        () => this.hero.getX(),
        DEMO.bossLives,
      );
      return;
    }
    this.foe = new Enemy(this.scene, (muzzle) => {
      this.foeBullets.push({ ...muzzle, direction: -1 });
      if (this.foe) this.fx.shot(muzzle, this.foe.figure.handPosition(), -1, PLAYER.feetY);
    });
  }

  private tick(_time: number, deltaMs: number): void {
    const foe = this.foe;
    foe?.update(deltaMs);

    // The soldier shoots when an enemy is on the screen
    const now = this.scene.time.now;
    if (
      foe?.isAlive() &&
      foe.figure.getX() < GAME_WIDTH - 20 &&
      now - this.lastShotMs > DEMO.shootEveryMs
    ) {
      this.lastShotMs = now;
      const muzzle = this.hero.muzzlePosition();
      this.heroBullets.push({ ...muzzle, direction: 1 });
      this.fx.shot(muzzle, this.hero.handPosition(), 1, PLAYER.feetY);
    }

    this.heroBullets = moveBullets(
      this.heroBullets,
      BULLET.speed,
      deltaMs,
      screenArea(GAME_WIDTH, GAME_HEIGHT),
    );
    this.foeBullets = moveBullets(
      this.foeBullets,
      ENEMY.bulletSpeed,
      deltaMs,
      screenArea(GAME_WIDTH, GAME_HEIGHT),
    ).filter((b) => b.x > DEMO.heroX + 20);

    if (foe?.isAlive()) {
      const box = foe.figure.bounds();
      const hit = this.heroBullets.find((b) => bulletHits(b, BULLET, box));
      if (hit) {
        this.heroBullets = this.heroBullets.filter((b) => b !== hit);
        if (foe.takeHit({ x: foe.figure.getX(), y: hit.y }, 1)) {
          this.scene.time.delayedCall(DEMO.respawnMs, () => {
            this.spawn();
          });
        }
      }
    }
    this.fx.update(deltaMs, [...this.heroBullets, ...this.foeBullets]);
  }

  /** A warm, smoky glow along the horizon, like fires far away. */
  private startWarGlow(): void {
    const g = this.scene.add.graphics();
    const { color, alpha, height } = DEMO.glow;
    g.fillGradientStyle(color, color, color, color, 0, 0, alpha, alpha);
    g.fillRect(0, RUINS.groundY - height, GAME_WIDTH, height);
    this.scene.tweens.add({
      targets: g,
      alpha: 0.6,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  /** A flash and a cloud of smoke somewhere far away in the ruins. */
  private explosion(): void {
    const x = 160 + Math.random() * (GAME_WIDTH - 320);
    const y = RUINS.groundY - 40 - Math.random() * 60;
    const flash = this.scene.add.circle(x, y, 6, 0xffe08a, 0.9);
    const fire = this.scene.add.circle(x, y, 10, 0xff7a1a, 0.6);
    this.scene.tweens.add({
      targets: [flash, fire],
      scale: 4,
      alpha: 0,
      duration: 500,
      ease: 'Quad.easeOut',
      onComplete: () => {
        flash.destroy();
        fire.destroy();
      },
    });
    for (let i = 0; i < 5; i++) {
      const smoke = this.scene.add.circle(x, y, 8, 0x3a3340, 0.5);
      this.scene.tweens.add({
        targets: smoke,
        x: x + (Math.random() - 0.5) * 40,
        y: y - 40 - Math.random() * 60,
        scale: 3 + Math.random() * 2,
        alpha: 0,
        duration: 1800 + Math.random() * 800,
        delay: i * 80,
        ease: 'Sine.easeOut',
        onComplete: () => {
          smoke.destroy();
        },
      });
    }
  }
}
