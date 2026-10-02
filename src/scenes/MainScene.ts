import Phaser from 'phaser';
import {
  BOSS,
  BULLET,
  COLORS,
  CROUCH_HINT,
  ENEMY,
  GAME_OVER,
  GAME_WIDTH,
  PLAYER,
  POINTS_PER_KILL,
  RELOAD_BAR,
  WEAPONS,
} from '../config';
import { bulletHits, moveBullets, type Bullet } from '../logic/bullets';
import { formatLives, loseLife } from '../logic/lives';
import { canShoot, reloadProgress } from '../logic/reload';
import { addPoints, formatScore } from '../logic/score';
import { buy, type ShopItem } from '../logic/shop';
import { isBossTurn } from '../logic/spawn';
import { BrokenFigure } from '../objects/BrokenFigure';
import { Boss } from '../objects/Boss';
import { Enemy, type Foe } from '../objects/Enemy';
import { showGameOverSign } from '../objects/GameOverSign';
import { RuinsBackground } from '../objects/RuinsBackground';
import { StickFigure } from '../objects/StickFigure';
import type { ShopData } from './ShopScene';

/** Leo's game: the black stick figure in the ruins against the white ones. */
export class MainScene extends Phaser.Scene {
  private player!: StickFigure;
  private enemy!: Foe;
  private enemyCount = 0;
  private crouchKey!: Phaser.Input.Keyboard.Key;
  private playerBullets: Bullet[] = [];
  private enemyBullets: Bullet[] = [];
  private bulletGraphics!: Phaser.GameObjects.Graphics;
  private lives = 0;
  private livesText!: Phaser.GameObjects.Text;
  private playerAlive = true;
  private lastShotMs: number | null = null;
  private score = 0;
  private shopClosedKeyTime: number | null = null;
  private scoreText!: Phaser.GameObjects.Text;
  private reloadBar!: Phaser.GameObjects.Graphics;

  constructor() {
    super('MainScene');
  }

  create(): void {
    // Start fresh (also when playing again after the OK button)
    this.playerBullets = [];
    this.enemyBullets = [];
    this.lives = PLAYER.lives;
    this.playerAlive = true;
    this.lastShotMs = null;
    this.score = 0;
    this.enemyCount = 0;

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
    this.add.text(16, RELOAD_BAR.y - 8, '🔫', { fontSize: '20px' });
    this.reloadBar = this.add.graphics();
    this.scoreText = this.add
      .text(GAME_WIDTH / 2, 16, formatScore(this.score), {
        fontSize: '28px',
        color: COLORS.text,
        fontStyle: 'bold',
      })
      .setOrigin(0.5, 0);
    this.livesText = this.add
      .text(GAME_WIDTH - 16, 16, formatLives(this.lives, PLAYER.lives), { fontSize: '26px' })
      .setOrigin(1, 0);

    const keyboard = this.input.keyboard;
    if (!keyboard) {
      throw new Error('Keyboard input is not available');
    }
    this.crouchKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.C);
    keyboard.on('keydown-S', (event: KeyboardEvent) => {
      // The same S press that closed the shop must not open it again
      if (event.timeStamp === this.shopClosedKeyTime) return;
      this.openShop();
    });

    // Left mouse click shoots
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!pointer.leftButtonDown() || !this.playerAlive) return;
      // The gun has to reload between shots
      if (!canShoot(this.time.now, this.lastShotMs, this.cooldownMs())) return;
      this.lastShotMs = this.time.now;
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
          this.score = addPoints(this.score, POINTS_PER_KILL);
          this.scoreText.setText(formatScore(this.score));
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
        this.hurtPlayer(hit.y);
      }
    }

    this.drawBullets();
    this.drawReloadBar();
  }

  /** The pistol needs to reload, the rifle doesn't. */
  private cooldownMs(): number {
    return WEAPONS[this.player.getWeapon()].cooldownMs;
  }

  private drawReloadBar(): void {
    const { x, y, width, height, empty, filling, ready } = RELOAD_BAR;
    const progress = reloadProgress(this.time.now, this.lastShotMs, this.cooldownMs());
    this.reloadBar.clear();
    this.reloadBar.fillStyle(empty, 1);
    this.reloadBar.fillRect(x, y, width, height);
    this.reloadBar.fillStyle(progress >= 1 ? ready : filling, 1);
    this.reloadBar.fillRect(x, y, width * progress, height);
  }

  /** S opens the shop. The game waits until the shop closes. */
  private openShop(): void {
    if (!this.playerAlive) return;
    const data: ShopData = {
      getScore: () => this.score,
      owns: (item) => item.id === 'rifle' && this.player.getWeapon() === 'rifle',
      purchase: (item) => this.purchase(item),
      onClose: (keyTime) => {
        this.shopClosedKeyTime = keyTime ?? null;
        this.scene.resume();
      },
    };
    this.scene.launch('ShopScene', data);
    this.scene.pause();
  }

  private purchase(item: ShopItem): boolean {
    const owned = item.id === 'rifle' && this.player.getWeapon() === 'rifle';
    const result = buy(this.score, item, owned);
    if (!result.ok) return false;
    this.score = result.score;
    this.scoreText.setText(formatScore(this.score));
    if (item.id === 'life') {
      this.lives += 1;
      this.livesText.setText(formatLives(this.lives, PLAYER.lives));
    }
    if (item.id === 'rifle') this.player.setWeapon('rifle');
    return true;
  }

  /** Every 15th one is the axe boss, the others are white stick figures. */
  private spawnEnemy(): void {
    if (!this.playerAlive) return;
    this.enemyCount += 1;
    if (isBossTurn(this.enemyCount, BOSS.every)) {
      this.enemy = new Boss(this, (hitY) => {
        if (this.playerAlive) this.hurtPlayer(hitY);
      });
      return;
    }
    this.enemy = new Enemy(this, (muzzle) => {
      this.shoot(muzzle, -1);
    });
  }

  /** A bullet or the axe hit the player: lose a life, and break on the last one. */
  private hurtPlayer(hitY: number): void {
    this.lives = loseLife(this.lives);
    this.livesText.setText(formatLives(this.lives, PLAYER.lives));
    if (this.lives === 0) this.breakPlayer(hitY);
    else this.player.flash(PLAYER.hitColor, PLAYER.hitFlashMs);
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
      p.getWeapon(),
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
