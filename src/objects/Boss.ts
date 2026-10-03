import Phaser from 'phaser';
import type { Voice } from '../audio/Sfx';
import { ENEMY, PLAYER, type BigFoeKind } from '../config';
import { healthFraction } from '../logic/health';
import { loseLife } from '../logic/lives';
import { canShoot } from '../logic/reload';
import { facingToward, followTarget, walkTowards } from '../logic/walk';
import { BrokenFigure } from './BrokenFigure';
import type { Foe } from './Enemy';
import { StickFigure } from './StickFigure';

/**
 * A big enemy that follows the player wherever they go and swings when close:
 * the red axe guy (every 15th) or the giant with a club (every 30th).
 * Has a health bar over his head. `kind` holds his size, speed, lives and so on.
 */
export class Boss implements Foe {
  readonly figure: StickFigure;
  readonly points: number;
  readonly voice: Voice;
  private readonly healthBar: Phaser.GameObjects.Graphics;
  private chopping = false;
  private alive = true;
  private canChop = true;
  private lives: number;
  private lastChopMs: number | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly kind: BigFoeKind,
    /**
     * Called when the axe or club lands on the player. `push` is the way the swing goes,
     * `damage` how many hearts it takes.
     */
    private readonly onChop: (hitY: number, push: 1 | -1, damage: number) => void,
    /** Where the player is now, so he can follow. */
    private readonly getPlayerX: () => number,
    /** How many hits he takes, if different from `kind.lives` (like on Hard). */
    private readonly maxLives: number = kind.lives,
  ) {
    this.points = kind.points;
    this.voice = kind.voice;
    this.lives = maxLives;
    this.figure = new StickFigure(
      scene,
      ENEMY.startX,
      PLAYER.feetY,
      {
        color: this.kind.color,
        outlineColor: this.kind.outlineColor,
        outlineAlpha: this.kind.outlineAlpha,
        facing: -1,
        height: this.kind.height,
      },
      'raise',
    );
    this.figure.setWeapon(kind.weapon);
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
  }

  takeHit(hit: { x: number; y: number }, push: 1 | -1): boolean {
    if (!this.alive) return false;
    this.lives = loseLife(this.lives);
    this.drawHealthBar();
    if (this.lives > 0) {
      this.figure.flash(PLAYER.hitColor, PLAYER.hitFlashMs);
      return false;
    }
    this.alive = false;
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
      push,
      this.kind.weapon,
    );
    f.destroy();
    return true;
  }

  update(deltaMs: number): void {
    if (!this.alive) return;
    // Always follow the player, standing next to them on his side (and on the screen)
    const playerX = this.getPlayerX();
    const oldX = this.figure.getX();
    const target = followTarget(oldX, playerX, this.kind.reach, this.kind.minX, this.kind.maxX);
    const x = walkTowards(oldX, target, this.kind.walkSpeed, deltaMs);
    this.figure.setX(x);
    // Face the way he walks; when standing, face the player
    this.figure.setFacing(
      facingToward(x, x !== target ? target : playerX, this.figure.getFacing()),
    );
    this.drawHealthBar();

    if (!this.chopping) this.figure.setStance('raise');
    if (x !== target) {
      // Still walking: swing the legs
      this.figure.setWalking(this.kind.stepMs);
      return;
    }

    // Next to the player: chop right away, then again after every pause
    this.figure.setWalking(null);
    if (this.canChop && canShoot(this.scene.time.now, this.lastChopMs, this.kind.chopIntervalMs)) {
      this.lastChopMs = this.scene.time.now;
      this.chop();
    }
  }

  /** Swing the axe down, hurt the player, then raise it again. */
  private chop(): void {
    if (!this.alive || !this.canChop) return;
    this.chopping = true;
    this.figure.setStance('chop');
    this.onChop(this.figure.muzzlePosition().y, this.figure.getFacing(), this.kind.damage);
    this.scene.time.delayedCall(this.kind.chopDownMs, () => {
      this.chopping = false;
      if (this.alive) this.figure.setStance('raise');
    });
  }

  private drawHealthBar(): void {
    if (!this.alive) return;
    const { width, height, gap, back, fill } = this.kind.healthBar;
    const x = this.figure.getX() - width / 2;
    const y = this.figure.bounds().top - gap - height;
    this.healthBar.clear();
    this.healthBar.fillStyle(back, 1);
    this.healthBar.fillRect(x, y, width, height);
    this.healthBar.fillStyle(fill, 1);
    this.healthBar.fillRect(x, y, width * healthFraction(this.lives, this.maxLives), height);
  }
}
