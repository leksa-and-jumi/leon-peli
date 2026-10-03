import Phaser from 'phaser';
import { BULLET, ENEMY, JUMP, PLAYER, POINTS_PER_KILL } from '../config';
import { dodgeWindow, nextLift, wantsToBeUp, type JumpWindow } from '../logic/jump';
import { loseLife } from '../logic/lives';
import { walkTowards } from '../logic/walk';
import { aimAngle, turnToward } from '../logic/aim';
import { standSpot } from '../logic/world';
import type { Voice } from '../audio/Sfx';
import { BrokenFigure } from './BrokenFigure';
import { StickFigure } from './StickFigure';

/** Anything the player can shoot at: a white stick figure or the boss. */
export interface Foe {
  readonly figure: StickFigure;
  /** Points the player gets for breaking it. */
  readonly points: number;
  /** How it sounds when hit or breaking. */
  readonly voice: Voice;
  update(deltaMs: number): void;
  isAlive(): boolean;
  /** Returns true if this hit broke it. `push` is the way the bullet flew. */
  takeHit(hit: { x: number; y: number }, push: 1 | -1): boolean;
  /** The player shot from a crouch, the way `direction` (1 = right, -1 = left). */
  dodge(bulletX: number, bulletSpeed: number, direction: 1 | -1): void;
  /** The player is out of lives: stop attacking. */
  stopShooting(): void;
}

/**
 * A white stick figure that walks in from the right, stops near the right edge
 * and starts shooting at the player.
 */
export class Enemy implements Foe {
  readonly figure: StickFigure;
  readonly points = POINTS_PER_KILL;
  readonly voice = 'white';
  private arrived = false;
  private alive = true;
  private lives: number;
  private canShoot = true;
  private shootTimer: Phaser.Time.TimerEvent | null = null;
  /** Times it must be in the air, one for every low bullet coming. */
  private jumpWindows: JumpWindow[] = [];
  private lift = 0;

  /** How far the gun arm is turned to aim, in radians (negative = up). */
  private aim = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    /**
     * Shoots from the muzzle the way it faces (`direction`);
     * `slope` is how steeply the bullet goes down (negative = up).
     */
    private readonly onShoot: (
      muzzle: { x: number; y: number },
      slope: number,
      direction: 1 | -1,
    ) => void,
    /** Hits it takes to break this one (depends on the difficulty). */
    lives: number = ENEMY.lives,
    /** Where to aim (the player), or null to always shoot straight ahead. */
    private readonly aimAt: (() => { x: number; y: number }) | null = null,
    /**
     * In the endless world: where it comes in, how far from the player it stands,
     * and where the player is (it follows when the player walks away).
     * Without it, it walks in from the right and stops near the right edge.
     */
    private readonly place: {
      startX: number;
      standOff: number;
      playerX: () => number;
    } | null = null,
  ) {
    this.lives = lives;
    const startX = place?.startX ?? ENEMY.startX;
    this.figure = new StickFigure(
      scene,
      startX,
      PLAYER.feetY,
      {
        color: ENEMY.color,
        outlineColor: ENEMY.outlineColor,
        outlineAlpha: ENEMY.outlineAlpha,
        facing: place && startX < place.playerX() ? 1 : -1,
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

  /**
   * The player shot from a crouch: plan to be up in the air when the bullet
   * arrives, and stay up until it has passed under the feet.
   */
  dodge(bulletX: number, bulletSpeed: number, direction: 1 | -1 = 1): void {
    if (!this.alive) return;
    const box = this.figure.bounds();
    // How far the bullet has to fly to reach it (only bullets coming its way)
    const distance = direction === 1 ? box.left - bulletX : bulletX - box.right;
    if (distance < 0) return;
    this.jumpWindows.push(
      dodgeWindow(
        this.scene.time.now,
        distance,
        bulletSpeed,
        box.right - box.left + BULLET.width,
        JUMP.riseMs,
        JUMP.marginMs,
      ),
    );
  }

  /** Go up while any bullet is coming under, then land softly when they're gone. */
  private updateJump(deltaMs: number): void {
    const now = this.scene.time.now;
    this.jumpWindows = this.jumpWindows.filter((w) => w.end >= now);
    const wantUp = wantsToBeUp(this.jumpWindows, now);
    this.lift = nextLift(this.lift, wantUp, deltaMs, JUMP.height, JUMP.riseMs);
    this.figure.setLift(this.lift);
    if (wantUp || this.lift > 0) this.figure.setStance('jump');
    else this.figure.setStance('aim');
  }

  /** Turn the gun arm, little by little, toward wherever the player is. */
  private updateAim(deltaMs: number): void {
    if (!this.aimAt) return;
    const f = this.figure;
    const shoulder = {
      x: f.getX() + f.pose().shoulder.x,
      y: f.getFeetY() + f.pose().shoulder.y,
    };
    const target = aimAngle(shoulder, this.aimAt(), f.getFacing(), ENEMY.aim.maxAngle);
    this.aim = turnToward(this.aim, target, (ENEMY.aim.turnSpeed * deltaMs) / 1000);
    f.setAim(this.aim);
  }

  /**
   * Hit by a bullet: blink red, or break in two when it was the last life.
   * Returns true if it broke.
   */
  takeHit(hit: { x: number; y: number }, push: 1 | -1): boolean {
    if (!this.alive) return false;
    this.lives = loseLife(this.lives);
    if (this.lives > 0) {
      this.figure.flash(PLAYER.hitColor, PLAYER.hitFlashMs);
      return false;
    }
    this.breakAt(hit, push);
    return true;
  }

  /** Out of lives: stop shooting and break in two where it hit. */
  private breakAt(hit: { x: number; y: number }, push: 1 | -1): void {
    if (!this.alive) return;
    this.alive = false;
    this.shootTimer?.remove();
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
    );
    f.destroy();
  }

  update(deltaMs: number): void {
    if (!this.alive) return;
    this.updateJump(deltaMs);
    this.updateAim(deltaMs);
    const stop = this.stopX();
    const oldX = this.figure.getX();
    // Once there, it only walks again when the player has gone far away
    if (this.arrived && Math.abs(stop - oldX) <= ENEMY.followSlack) {
      this.figure.setWalking(null);
      return;
    }
    const x = walkTowards(oldX, stop, ENEMY.walkSpeed, deltaMs);
    this.figure.setX(x);

    // Legs swing while walking
    this.figure.setWalking(ENEMY.stepMs);

    if (x === stop && !this.arrived && this.canShoot) {
      this.arrived = true;
      this.figure.setWalking(null);
      this.shootTimer = this.scene.time.addEvent({
        startAt: ENEMY.shootIntervalMs - ENEMY.firstShotMs,
        delay: ENEMY.shootIntervalMs,
        loop: true,
        callback: () => {
          this.onShoot(
            this.figure.muzzlePosition(),
            Math.tan(this.figure.getAim()),
            this.figure.getFacing(),
          );
        },
      });
    }
  }

  /** Where it wants to stand: near the right edge, or a bit away from the player on its side. */
  private stopX(): number {
    if (!this.place) return ENEMY.stopX;
    const playerX = this.place.playerX();
    const x = this.figure.getX();
    const side = x < playerX ? -1 : 1;
    // Always face the player, even if they jump over to the other side
    this.figure.setFacing(side === 1 ? -1 : 1);
    return standSpot(playerX, side, this.place.standOff);
  }
}
