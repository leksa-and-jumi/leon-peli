import Phaser from 'phaser';
import { BULLET, COLORS, CROUCH_HINT, ENEMY, GAME_WIDTH, PLAYER } from '../config';
import { bulletHits, moveBullets, type Bullet } from '../logic/bullets';
import { Enemy } from '../objects/Enemy';
import { RuinsBackground } from '../objects/RuinsBackground';
import { StickFigure } from '../objects/StickFigure';

/** Leo's game: the black stick figure in the ruins against the white ones. */
export class MainScene extends Phaser.Scene {
  private player!: StickFigure;
  private enemy!: Enemy;
  private crouchKey!: Phaser.Input.Keyboard.Key;
  private playerBullets: Bullet[] = [];
  private enemyBullets: Bullet[] = [];
  private bulletGraphics!: Phaser.GameObjects.Graphics;

  constructor() {
    super('MainScene');
  }

  create(): void {
    new RuinsBackground(this);
    this.player = new StickFigure(this, PLAYER.x, PLAYER.feetY, {
      color: PLAYER.color,
      outlineColor: PLAYER.outlineColor,
      outlineAlpha: PLAYER.outlineAlpha,
      facing: 1,
    });
    this.spawnEnemy();
    this.bulletGraphics = this.add.graphics();
    this.add.text(16, 16, CROUCH_HINT, { fontSize: '18px', color: COLORS.text });

    const keyboard = this.input.keyboard;
    if (!keyboard) {
      throw new Error('Keyboard input is not available');
    }
    this.crouchKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.C);

    // Left mouse click shoots
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.leftButtonDown()) this.shoot(this.player.muzzlePosition(), 1);
    });
  }

  update(_time: number, delta: number): void {
    // Crouch only while C is held down
    this.player.setStance(this.crouchKey.isDown ? 'crouch' : 'stand');
    this.enemy.update(delta);

    this.playerBullets = moveBullets(this.playerBullets, BULLET.speed, delta, GAME_WIDTH);
    this.enemyBullets = moveBullets(this.enemyBullets, ENEMY.bulletSpeed, delta, GAME_WIDTH);

    // The player's bullets break a white figure in two where they hit
    if (this.enemy.isAlive()) {
      const enemyBox = this.enemy.figure.bounds();
      const hitBullet = this.playerBullets.find((b) => bulletHits(b, BULLET, enemyBox));
      if (hitBullet) {
        this.playerBullets = this.playerBullets.filter((b) => b !== hitBullet);
        this.enemy.breakAt({ x: this.enemy.figure.getX(), y: hitBullet.y });
        this.time.delayedCall(ENEMY.respawnMs, () => {
          this.spawnEnemy();
        });
      }
    }

    // White figures' bullets that hit the player disappear, and the player blinks red
    const playerBox = this.player.bounds();
    const hit = this.enemyBullets.some((b) => bulletHits(b, BULLET, playerBox));
    if (hit) {
      this.enemyBullets = this.enemyBullets.filter((b) => !bulletHits(b, BULLET, playerBox));
      this.player.flash(PLAYER.hitColor, PLAYER.hitFlashMs);
    }

    this.drawBullets();
  }

  private spawnEnemy(): void {
    this.enemy = new Enemy(this, (muzzle) => {
      this.shoot(muzzle, -1);
    });
  }

  private drawBullets(): void {
    this.bulletGraphics.clear();
    this.bulletGraphics.fillStyle(BULLET.color, 1);
    for (const b of [...this.playerBullets, ...this.enemyBullets]) {
      this.bulletGraphics.fillRect(
        b.x - BULLET.width / 2,
        b.y - BULLET.height / 2,
        BULLET.width,
        BULLET.height,
      );
    }
  }

  private shoot(muzzle: { x: number; y: number }, direction: 1 | -1): void {
    const bullet = { ...muzzle, direction };
    if (direction === 1) this.playerBullets.push(bullet);
    else this.enemyBullets.push(bullet);

    // Quick flash at the end of the gun
    const { color, radius, durationMs } = BULLET.flash;
    const flash = this.add.circle(muzzle.x, muzzle.y, radius, color);
    this.time.delayedCall(durationMs, () => {
      flash.destroy();
    });
  }
}
