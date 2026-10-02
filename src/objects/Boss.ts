import Phaser from 'phaser';
import { BOSS, ENEMY, PLAYER } from '../config';
import { healthFraction } from '../logic/health';
import { loseLife } from '../logic/lives';
import { walkTowards } from '../logic/walk';
import { BrokenFigure } from './BrokenFigure';
import type { Foe } from './Enemy';
import { StickFigure } from './StickFigure';

/**
 * The big axe guy. Comes every 15th time, walks all the way up to the player
 * and chops with his axe. Takes 10 hits, and has a health bar over his head.
 */
export class Boss implements Foe {
  readonly figure: StickFigure;
  readonly points = BOSS.points;
  private readonly healthBar: Phaser.GameObjects.Graphics;
  private walkTimeMs = 0;
  private arrived = false;
  private alive = true;
  private canChop = true;
  private lives: number = BOSS.lives;
  private chopTimer: Phaser.Time.TimerEvent | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    /** Called when the axe lands on the player. */
    private readonly onChop: (hitY: number) => void,
  ) {
    this.figure = new StickFigure(
      scene,
      ENEMY.startX,
      PLAYER.feetY,
      {
        color: BOSS.color,
        outlineColor: BOSS.outlineColor,
        outlineAlpha: BOSS.outlineAlpha,
        facing: -1,
        height: BOSS.height,
      },
      'raise',
    );
    this.figure.setWeapon('axe');
    this.healthBar = scene.add.graphics();
    this.drawHealthBar();
  }

  isAlive(): boolean {
    return this.alive;
  }

  /** The boss is too big to jump over bullets. */
  dodge(): void {
    // Nothing: only the white ones can jump.
  }

  stopShooting(): void {
    this.canChop = false;
    this.chopTimer?.remove();
    this.chopTimer = null;
  }

  takeHit(hit: { x: number; y: number }): boolean {
    if (!this.alive) return false;
    this.lives = loseLife(this.lives);
    this.drawHealthBar();
    if (this.lives > 0) {
      this.figure.flash(PLAYER.hitColor, PLAYER.hitFlashMs);
      return false;
    }
    this.alive = false;
    this.chopTimer?.remove();
    this.healthBar.destroy();
    const f = this.figure;
    new BrokenFigure(
      this.scene,
      f.pose(),
      f.getLook(),
      f.getX(),
      f.getFeetY(),
      hit,
      PLAYER.feetY,
      1,
      'axe',
    );
    f.destroy();
    return true;
  }

  update(deltaMs: number): void {
    if (this.arrived || !this.alive) return;
    const stopX = PLAYER.x + BOSS.reach;
    const x = walkTowards(this.figure.getX(), stopX, BOSS.walkSpeed, deltaMs);
    this.figure.setX(x);
    this.drawHealthBar();

    this.walkTimeMs += deltaMs;
    const step = Math.floor(this.walkTimeMs / BOSS.stepMs);
    this.figure.setStance(step % 2 === 0 ? 'raise' : 'raiseStride');

    if (x === stopX) {
      this.arrived = true;
      this.figure.setStance('raise');
      if (!this.canChop) return;
      this.chopTimer = this.scene.time.addEvent({
        delay: BOSS.chopIntervalMs,
        loop: true,
        callback: () => {
          this.chop();
        },
      });
    }
  }

  /** Swing the axe down, hurt the player, then raise it again. */
  private chop(): void {
    if (!this.alive || !this.canChop) return;
    this.figure.setStance('chop');
    this.onChop(this.figure.muzzlePosition().y);
    this.scene.time.delayedCall(BOSS.chopDownMs, () => {
      if (this.alive) this.figure.setStance('raise');
    });
  }

  private drawHealthBar(): void {
    if (!this.alive) return;
    const { width, height, gap, back, fill } = BOSS.healthBar;
    const x = this.figure.getX() - width / 2;
    const y = this.figure.bounds().top - gap - height;
    this.healthBar.clear();
    this.healthBar.fillStyle(back, 1);
    this.healthBar.fillRect(x, y, width, height);
    this.healthBar.fillStyle(fill, 1);
    this.healthBar.fillRect(x, y, width * healthFraction(this.lives, BOSS.lives), height);
  }
}
