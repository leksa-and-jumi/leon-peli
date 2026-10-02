import Phaser from 'phaser';
import { ENEMY, JUMP, PLAYER } from '../config';
import { jumpDelayMs } from '../logic/jump';
import { loseLife } from '../logic/lives';
import { walkTowards } from '../logic/walk';
import { BrokenFigure } from './BrokenFigure';
import { StickFigure } from './StickFigure';

/**
 * A white stick figure that walks in from the right, stops near the right edge
 * and starts shooting at the player.
 */
export class Enemy {
  readonly figure: StickFigure;
  private walkTimeMs = 0;
  private arrived = false;
  private alive = true;
  private lives: number = ENEMY.lives;
  private canShoot = true;
  private shootTimer: Phaser.Time.TimerEvent | null = null;
  private jumpTween: Phaser.Tweens.Tween | null = null;
  private readonly jumpState = { lift: 0 };

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly onShoot: (muzzle: { x: number; y: number }) => void,
  ) {
    this.figure = new StickFigure(
      scene,
      ENEMY.startX,
      PLAYER.feetY,
      {
        color: ENEMY.color,
        outlineColor: ENEMY.outlineColor,
        outlineAlpha: ENEMY.outlineAlpha,
        facing: -1,
      },
      'aim',
    );
  }

  /** Stop shooting, for example when the player is out of lives. */
  stopShooting(): void {
    this.shootTimer?.remove();
    this.shootTimer = null;
    this.canShoot = false;
  }

  isAlive(): boolean {
    return this.alive;
  }

  private isAirborne(): boolean {
    return this.jumpTween?.isPlaying() ?? false;
  }

  /**
   * The player shot from a crouch: jump so the top of the jump comes
   * just as the bullet arrives, and it flies under the feet.
   */
  dodge(bulletX: number, bulletSpeed: number): void {
    if (!this.alive) return;
    const distance = this.figure.bounds().left - bulletX;
    const delay = jumpDelayMs(distance, bulletSpeed, JUMP.riseMs);
    this.scene.time.delayedCall(delay, () => {
      this.jump();
    });
  }

  private jump(): void {
    if (!this.alive) return;
    // A new jump starts from wherever it is now, even in the air
    this.jumpTween?.stop();
    this.figure.setStance('jump');
    this.jumpTween = this.scene.tweens.add({
      targets: this.jumpState,
      lift: JUMP.height,
      duration: JUMP.riseMs,
      hold: JUMP.hangMs,
      yoyo: true,
      ease: 'Sine.easeOut',
      onUpdate: () => {
        this.figure.setLift(this.jumpState.lift);
      },
      onComplete: () => {
        this.figure.setLift(0);
        this.figure.setStance('aim');
      },
    });
  }

  /**
   * Hit by a bullet: blink red, or break in two when it was the last life.
   * Returns true if it broke.
   */
  takeHit(hit: { x: number; y: number }): boolean {
    if (!this.alive) return false;
    this.lives = loseLife(this.lives);
    if (this.lives > 0) {
      this.figure.flash(PLAYER.hitColor, PLAYER.hitFlashMs);
      return false;
    }
    this.breakAt(hit);
    return true;
  }

  /** Out of lives: stop shooting and break in two where it hit. */
  private breakAt(hit: { x: number; y: number }): void {
    if (!this.alive) return;
    this.alive = false;
    this.shootTimer?.remove();
    this.jumpTween?.stop();
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
    );
    f.destroy();
  }

  update(deltaMs: number): void {
    if (this.arrived || !this.alive) return;
    const x = walkTowards(this.figure.getX(), ENEMY.stopX, ENEMY.walkSpeed, deltaMs);
    this.figure.setX(x);

    // Switch legs every step so it looks like walking
    this.walkTimeMs += deltaMs;
    const step = Math.floor(this.walkTimeMs / ENEMY.stepMs);
    if (!this.isAirborne()) this.figure.setStance(step % 2 === 0 ? 'aim' : 'stride');

    if (x === ENEMY.stopX && this.canShoot) {
      this.arrived = true;
      if (!this.isAirborne()) this.figure.setStance('aim');
      this.shootTimer = this.scene.time.addEvent({
        startAt: ENEMY.shootIntervalMs - ENEMY.firstShotMs,
        delay: ENEMY.shootIntervalMs,
        loop: true,
        callback: () => {
          this.onShoot(this.figure.muzzlePosition());
        },
      });
    }
  }
}
