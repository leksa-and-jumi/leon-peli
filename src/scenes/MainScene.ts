import Phaser from 'phaser';
import {
  BOSS,
  BULLET,
  COLORS,
  CROUCH_HINT,
  ENEMY,
  GAME_OVER,
  GAME_WIDTH,
  OUTFITS,
  PLAYER,
  RELOAD_BAR,
  START_POINTS,
  WEAPONS,
  type OutfitId,
} from '../config';
import { bulletHits, moveBullets, type Bullet } from '../logic/bullets';
import { formatLives, loseLife } from '../logic/lives';
import { canShoot, reloadProgress } from '../logic/reload';
import { addPoints, formatScore } from '../logic/score';
import { moveDirection, moveX } from '../logic/move';
import { loadSave, writeSave, type SaveStorage } from '../logic/save';
import { buy, type ShopItem } from '../logic/shop';
import { isBossTurn } from '../logic/spawn';
import { BrokenFigure } from '../objects/BrokenFigure';
import { Sfx } from '../audio/Sfx';
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
  private leftKey!: Phaser.Input.Keyboard.Key;
  private rightKey!: Phaser.Input.Keyboard.Key;
  private playerBullets: Bullet[] = [];
  private enemyBullets: Bullet[] = [];
  private bulletGraphics!: Phaser.GameObjects.Graphics;
  private lives = 0;
  private livesText!: Phaser.GameObjects.Text;
  private playerAlive = true;
  private lastShotMs: number | null = null;
  private score = 0;
  private shopClosedKeyTime: number | null = null;
  private sfx!: Sfx;
  private muted = false;
  private ownedOutfits = new Set<OutfitId>(['black']);
  private wornOutfit: OutfitId = 'black';
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
    this.score = START_POINTS;
    this.enemyCount = 0;
    this.ownedOutfits = new Set<OutfitId>(['black']);
    this.wornOutfit = 'black';

    this.muted = loadSave(browserStorage()).muted;
    this.sfx = new Sfx(this, this.muted);

    new RuinsBackground(this);
    this.player = new StickFigure(this, PLAYER.x, PLAYER.feetY, {
      color: PLAYER.color,
      outlineColor: PLAYER.outlineColor,
      outlineAlpha: PLAYER.outlineAlpha,
      facing: 1,
    });
    this.player.setOnStep(() => {
      this.sfx.footstep();
    });
    // A bought rifle is saved, so it's still yours after dying
    if (loadSave(browserStorage()).rifle) this.player.setWeapon('rifle');
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
    this.crouchKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    keyboard.on('keydown-M', () => {
      this.toggleSound();
    });
    this.leftKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.rightKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    keyboard.on('keydown-K', (event: KeyboardEvent) => {
      // The same K press that closed the shop must not open it again
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
      const facing = this.player.getFacing();
      this.shoot(muzzle, facing, 'player');
      // Shots from a crouch toward the white ones are always jumped over
      if (this.crouchKey.isDown && facing === 1) this.enemy.dodge(muzzle.x, BULLET.speed);
    });
  }

  update(_time: number, delta: number): void {
    if (this.playerAlive) this.movePlayer(delta);
    this.enemy.update(delta);

    this.playerBullets = moveBullets(this.playerBullets, BULLET.speed, delta, GAME_WIDTH);
    this.enemyBullets = moveBullets(this.enemyBullets, ENEMY.bulletSpeed, delta, GAME_WIDTH);

    // The player's bullets hit a white figure: the second hit breaks it in two
    if (this.enemy.isAlive()) {
      const enemyBox = this.enemy.figure.bounds();
      const hitBullet = this.playerBullets.find((b) => bulletHits(b, BULLET, enemyBox));
      if (hitBullet) {
        this.playerBullets = this.playerBullets.filter((b) => b !== hitBullet);
        const broke = this.enemy.takeHit(
          { x: this.enemy.figure.getX(), y: hitBullet.y },
          hitBullet.direction,
        );
        if (broke) this.sfx.scream(this.enemy.voice);
        else this.sfx.hurt(this.enemy.voice);
        if (broke) {
          this.score = addPoints(this.score, this.enemy.points);
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
        this.hurtPlayer(hit.y, hit.direction);
      }
    }

    this.drawBullets();
    this.drawReloadBar();
  }

  /** A and D walk left and right. S crouches while held down. */
  private movePlayer(delta: number): void {
    const direction = moveDirection(this.leftKey.isDown, this.rightKey.isDown);
    // Turn the way you walk (and the gun turns too)
    if (direction !== 0) this.player.setFacing(direction);
    const x = moveX(
      this.player.getX(),
      direction,
      PLAYER.walkSpeed,
      delta,
      PLAYER.minX,
      PLAYER.maxX,
    );
    this.player.setX(x);

    // Legs swing while walking, and shuffle while walking crouched
    this.player.setStance(this.crouchKey.isDown ? 'crouch' : 'stand');
    this.player.setWalking(direction !== 0 ? PLAYER.stepMs : null);
  }

  /** M turns all sounds off and on. The choice is saved. */
  private toggleSound(): void {
    this.muted = !this.muted;
    this.sfx.setMuted(this.muted);
    writeSave(browserStorage(), { ...loadSave(browserStorage()), muted: this.muted });
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

  /** K opens the shop. The game waits until the shop closes. */
  private openShop(): void {
    if (!this.playerAlive) return;
    const data: ShopData = {
      getScore: () => this.score,
      owns: (item) => this.owns(item),
      purchase: (item) => this.purchase(item),
      wears: (item) => item.outfit === this.wornOutfit,
      wear: (item) => {
        this.wear(item);
      },
      onClose: (keyTime) => {
        this.shopClosedKeyTime = keyTime ?? null;
        this.scene.resume();
      },
    };
    this.scene.launch('ShopScene', data);
    this.scene.pause();
  }

  private purchase(item: ShopItem): boolean {
    const result = buy(this.score, item, this.owns(item));
    if (!result.ok) return false;
    this.score = result.score;
    this.scoreText.setText(formatScore(this.score));
    this.sfx.buy();
    if (item.id === 'life') {
      this.lives += 1;
      this.livesText.setText(formatLives(this.lives, PLAYER.lives));
    }
    if (item.id === 'rifle') {
      this.player.setWeapon('rifle');
      writeSave(browserStorage(), { ...loadSave(browserStorage()), rifle: true });
    }
    const outfit = outfitOf(item);
    if (outfit) {
      this.ownedOutfits.add(outfit);
      this.wear(item);
    }
    return true;
  }

  /** Does the player already have this one-time item? */
  private owns(item: ShopItem): boolean {
    if (item.id === 'rifle') return this.player.getWeapon() === 'rifle';
    const outfit = outfitOf(item);
    return outfit !== null && this.ownedOutfits.has(outfit);
  }

  /** Put on clothes the player owns. */
  private wear(item: ShopItem): void {
    const outfit = outfitOf(item);
    if (!outfit || !this.ownedOutfits.has(outfit)) return;
    this.wornOutfit = outfit;
    this.player.setOutfit(OUTFITS[outfit]);
  }

  /** Every 15th one is the axe boss, the others are white stick figures. */
  private spawnEnemy(): void {
    if (!this.playerAlive) return;
    this.enemyCount += 1;
    if (isBossTurn(this.enemyCount, BOSS.every)) {
      this.enemy = new Boss(
        this,
        (hitY, push) => {
          this.sfx.chop();
          if (this.playerAlive) this.hurtPlayer(hitY, push);
        },
        () => this.player.getX(),
      );
      this.enemy.figure.setOnStep(() => {
        this.sfx.footstep(true);
      });
      return;
    }
    this.enemy = new Enemy(this, (muzzle) => {
      this.shoot(muzzle, -1, 'enemy');
    });
    this.enemy.figure.setOnStep(() => {
      this.sfx.footstep(false, true);
    });
  }

  /** A bullet or the axe hit the player: lose a life, and break on the last one. */
  private hurtPlayer(hitY: number, push: 1 | -1): void {
    this.lives = loseLife(this.lives);
    this.livesText.setText(formatLives(this.lives, PLAYER.lives));
    this.sfx[this.lives === 0 ? 'scream' : 'hurt']('player');
    if (this.lives === 0) this.breakPlayer(hitY, push);
    else this.player.flash(PLAYER.hitColor, PLAYER.hitFlashMs);
  }

  /** Out of lives: the player breaks in two like the white ones, and the shooting stops. */
  private breakPlayer(hitY: number, push: 1 | -1): void {
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
      push,
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

  private shoot(
    muzzle: { x: number; y: number },
    direction: 1 | -1,
    shooter: 'player' | 'enemy',
  ): void {
    const bullet = { ...muzzle, direction };
    if (shooter === 'player') {
      this.playerBullets.push(bullet);
      this.sfx.gunshot(this.player.getWeapon());
    } else {
      this.enemyBullets.push(bullet);
      this.sfx.gunshot('pistol', true);
    }

    // Quick flash at the end of the gun
    const { color, radius, durationMs } = BULLET.flash;
    const flash = this.add.circle(muzzle.x, muzzle.y, radius, color);
    this.time.delayedCall(durationMs, () => {
      flash.destroy();
    });
  }
}

/** Which outfit a shop item gives, or null if it isn't clothes. */
function outfitOf(item: ShopItem): OutfitId | null {
  return item.outfit !== undefined && item.outfit in OUTFITS ? (item.outfit as OutfitId) : null;
}

/** The browser's storage for the save, or null if the browser doesn't allow it. */
function browserStorage(): SaveStorage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
