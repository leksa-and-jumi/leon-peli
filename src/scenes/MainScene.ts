import Phaser from 'phaser';
import { BULLET, COLORS, CROUCH_HINT, ENEMY, GAME_OVER, GAME_WIDTH, PLAYER } from '../config';
import { bulletHits, moveBullets, type Bullet } from '../logic/bullets';
import { formatLives, loseLife } from '../logic/lives';
import { BrokenFigure } from '../objects/BrokenFigure';
import { Enemy } from '../objects/Enemy';
import { showGameOverSign } from '../objects/GameOverSign';
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
  private lives = 0;
  private livesText!: Phaser.GameObjects.Text;
  private playerAlive = true;

  constructor() {
    super('MainScene');
  }

  create(): void {
    // Start fresh (also when playing again after the OK button)
    this.playerBullets = [];
    this.enemyBullets = [];
    this.lives = PLAYER.lives;
    this.playerAlive = true;

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
    this.livesText = this.add
      .text(GAME_WIDTH - 16, 16, formatLives(this.lives, PLAYER.lives), { fontSize: '26px' })
      .setOrigin(1, 0);

    const keyboard = this.input.keyboard;
    if (!keyboard) {
      throw new Error('Keyboard input is not available');
    }
    this.crouchKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.C);

    // Left mouse click shoots
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!pointer.leftButtonDown() || !this.playerAlive) return;
      const muzzle = this.player.muzzlePosition();
      this.shoot(muzzle, 1);
      // Shots from a crouch are always jumped over
      if (this.crouchKey.isDown) this.enemy.dodge(muzzle.x, BULLET.speed);
    });
  }

  update(_time: number, delta: number): void {
    // Crouch only while C is held down
    if (this.playerAlive) this.player.setStance(this.crouchKey.isDown ? 'crouch' : 'stand');
    this.enemy.update(delta);

    this.playerBullets = moveBullets(this.playerBullets, BULLET.speed, delta, GAME_WIDTH);
    this.enemyBullets = moveBullets(this.enemyBullets, ENEMY.bulletSpeed, delta, GAME_WIDTH);

    // The player's bullets hit a white figure: the second hit breaks it in two
    if (this.enemy.isAlive()) {
      const enemyBox = this.enemy.figure.bounds();
      const hitBullet = this.playerBullets.find((b) => bulletHits(b, BULLET, enemyBox));
      if (hitBullet) {
        this.playerBullets = this.playerBullets.filter((b) => b !== hitBullet);
        const broke = this.enemy.takeHit({ x: this.enemy.figure.getX(), y: hitBullet.y });
        if (broke) {
          this.time.delayedCall(ENEMY.respawnMs, () => {
            this.spawnEnemy();
          });
        }
      }
    }

    // White figures' bullets that hit the player disappear, and the player blinks red
    if (this.playerAlive) {
      const playerBox = this.player.bounds();
      const hit = this.enemyBullets.find((b) => bulletHits(b, BULLET, playerBox));
      if (hit) {
        this.enemyBullets = this.enemyBullets.filter((b) => !bulletHits(b, BULLET, playerBox));
        this.lives = loseLife(this.lives);
        this.livesText.setText(formatLives(this.lives, PLAYER.lives));
        if (this.lives === 0) this.breakPlayer(hit.y);
        else this.player.flash(PLAYER.hitColor, PLAYER.hitFlashMs);
      }
    }

    this.drawBullets();
  }

  private spawnEnemy(): void {
    if (!this.playerAlive) return;
    this.enemy = new Enemy(this, (muzzle) => {
      this.shoot(muzzle, -1);
    });
  }

  /** Out of lives: the player breaks in two like the white ones, and the shooting stops. */
  private breakPlayer(hitY: number): void {
    this.playerAlive = false;
    this.enemy.stopShooting();
    const p = this.player;
    new BrokenFigure(
      this,
      p.pose(),
      p.getLook(),
      p.getX(),
      p.getFeetY(),
      { x: p.getX(), y: hitY },
      PLAYER.feetY,
      -1,
    );
    p.destroy();

    this.time.delayedCall(GAME_OVER.delayMs, () => {
      showGameOverSign(this, () => {
        this.scene.restart();
      });
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
