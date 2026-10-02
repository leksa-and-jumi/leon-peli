import Phaser from 'phaser';
import { ENEMY, PLAYER } from '../config';
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
  private shootTimer: Phaser.Time.TimerEvent | null = null;

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

  isAlive(): boolean {
    return this.alive;
  }

  /** Hit by a bullet: stop shooting and break in two where it hit. */
  breakAt(hit: { x: number; y: number }): void {
    if (!this.alive) return;
    this.alive = false;
    this.shootTimer?.remove();
    const f = this.figure;
    new BrokenFigure(this.scene, f.pose(), f.getLook(), f.getX(), f.getFeetY(), hit);
    f.destroy();
  }

  update(deltaMs: number): void {
    if (this.arrived || !this.alive) return;
    const x = walkTowards(this.figure.getX(), ENEMY.stopX, ENEMY.walkSpeed, deltaMs);
    this.figure.setX(x);

    // Switch legs every step so it looks like walking
    this.walkTimeMs += deltaMs;
    const step = Math.floor(this.walkTimeMs / ENEMY.stepMs);
    this.figure.setStance(step % 2 === 0 ? 'aim' : 'stride');

    if (x === ENEMY.stopX) {
      this.arrived = true;
      this.figure.setStance('aim');
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
