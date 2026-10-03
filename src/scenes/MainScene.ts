import Phaser from 'phaser';
import { browserStorage } from '../browserStorage';
import {
  ATMOSPHERE,
  BOSS,
  BULLET,
  COLORS,
  DIFFICULTIES,
  DUST,
  CROUCH_HINT,
  ENEMY,
  GAME_OVER,
  GAME_WIDTH,
  GIANT,
  OUTFITS,
  PITS,
  PLAYER,
  RELOAD_BAR,
  START_POINTS,
  WEAPONS,
  type OutfitId,
} from '../config';
import { bulletHits, moveBullets, type Bullet } from '../logic/bullets';
import { formatLives, loseLife } from '../logic/lives';
import { canShoot, reloadProgress } from '../logic/reload';
import { addPoints, formatBest, formatScore } from '../logic/score';
import { moveDirection, moveX } from '../logic/move';
import { jumpStep, overPit, safeSpotBeside, type Pit } from '../logic/pits';
import { loadSave, recordScore, writeSave } from '../logic/save';
import { buy, type ShopItem } from '../logic/shop';
import { enemyFor, type Difficulty } from '../logic/difficulty';
import { BrokenFigure } from '../objects/BrokenFigure';
import { Sfx } from '../audio/Sfx';
import { Atmosphere } from '../objects/Atmosphere';
import { Boss } from '../objects/Boss';
import { Enemy, type Foe } from '../objects/Enemy';
import { GunEffects } from '../objects/GunEffects';
import { showGameOverSign } from '../objects/GameOverSign';
import { RuinsBackground } from '../objects/RuinsBackground';
import { StickFigure } from '../objects/StickFigure';
import type { ShopData } from './ShopScene';

/** Leo's game: the black stick figure in the ruins against the white ones. */
export class MainScene extends Phaser.Scene {
  private player!: StickFigure;
  private enemy!: Foe;
  private enemyCount = 0;
  /** Each move has two keys: letters on the left hand, arrows on the right. */
  private crouchKeys: Phaser.Input.Keyboard.Key[] = [];
  private leftKeys: Phaser.Input.Keyboard.Key[] = [];
  private rightKeys: Phaser.Input.Keyboard.Key[] = [];
  private playerBullets: Bullet[] = [];
  private enemyBullets: Bullet[] = [];
  private gunFx!: GunEffects;
  private lives = 0;
  private livesText!: Phaser.GameObjects.Text;
  private playerAlive = true;
  private lastShotMs: number | null = null;
  private score = 0;
  private shopClosedKeyTime: number | null = null;
  private sfx!: Sfx;
  private rifleUpgrade = false;
  /** Jumping: how high the feet are and how fast they're going up. */
  private jumpLift = 0;
  private jumpSpeed = 0;
  private falling = false;
  private muted = false;
  private ownedOutfits = new Set<OutfitId>(['black']);
  private wornOutfit: OutfitId = 'black';
  private difficulty: Difficulty = 'normal';
  /** Points earned this game (spending in the shop doesn't lower it). This is what records count. */
  private earned = 0;
  private bestBefore = 0;
  private bestText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private reloadBar!: Phaser.GameObjects.Graphics;

  constructor() {
    super('MainScene');
  }

  create(data: { difficulty?: Difficulty } = {}): void {
    this.difficulty = data.difficulty ?? 'normal';
    // Start fresh (also when playing again after the OK button)
    this.playerBullets = [];
    this.enemyBullets = [];
    this.lives = PLAYER.lives;
    this.playerAlive = true;
    this.lastShotMs = null;
    this.score = START_POINTS;
    this.earned = 0;
    this.jumpLift = 0;
    this.jumpSpeed = 0;
    this.falling = false;
    this.enemyCount = 0;
    this.ownedOutfits = new Set<OutfitId>(['black']);
    this.wornOutfit = 'black';

    this.muted = loadSave(browserStorage()).muted;
    this.sfx = new Sfx(this, this.muted);

    const atmosphere = new Atmosphere(this);
    new RuinsBackground(this, atmosphere);
    atmosphere.addVignette(ATMOSPHERE.vignette.depth);
    this.player = new StickFigure(this, PLAYER.x, PLAYER.feetY, {
      color: PLAYER.color,
      outlineColor: PLAYER.outlineColor,
      outlineAlpha: PLAYER.outlineAlpha,
      facing: 1,
    });
    this.player.setOnStep(() => {
      this.sfx.footstep();
      this.dustAt(this.player.getX());
    });
    // A bought rifle is saved, so it's still yours after dying
    const save = loadSave(browserStorage());
    if (save.rifle) this.player.setWeapon('rifle');
    this.rifleUpgrade = save.rifleUpgrade;
    this.spawnEnemy();
    this.gunFx = new GunEffects(this);
    this.add
      .text(16, 16, CROUCH_HINT, { fontSize: '18px', color: COLORS.text })
      .setDepth(ATMOSPHERE.hudDepth);
    this.add.text(16, RELOAD_BAR.y - 8, '🔫', { fontSize: '20px' }).setDepth(ATMOSPHERE.hudDepth);
    this.reloadBar = this.add.graphics().setDepth(ATMOSPHERE.hudDepth);
    this.bestBefore = loadSave(browserStorage()).best[this.difficulty] ?? 0;
    this.bestText = this.add
      .text(GAME_WIDTH - 16, 52, formatBest(this.bestBefore), {
        fontSize: '16px',
        color: COLORS.text,
      })
      .setOrigin(1, 0)
      .setDepth(ATMOSPHERE.hudDepth);
    this.scoreText = this.add
      .text(GAME_WIDTH / 2, 16, formatScore(this.score), {
        fontSize: '28px',
        color: COLORS.text,
        fontStyle: 'bold',
      })
      .setOrigin(0.5, 0)
      .setDepth(ATMOSPHERE.hudDepth);
    this.livesText = this.add
      .text(GAME_WIDTH - 16, 16, formatLives(this.lives, PLAYER.lives), { fontSize: '26px' })
      .setOrigin(1, 0)
      .setDepth(ATMOSPHERE.hudDepth);

    const keyboard = this.input.keyboard;
    if (!keyboard) {
      throw new Error('Keyboard input is not available');
    }
    const { KeyCodes } = Phaser.Input.Keyboard;
    this.crouchKeys = [keyboard.addKey(KeyCodes.S), keyboard.addKey(KeyCodes.DOWN)];
    keyboard.on('keydown-M', () => {
      this.toggleSound();
    });
    this.leftKeys = [keyboard.addKey(KeyCodes.A), keyboard.addKey(KeyCodes.LEFT)];
    this.rightKeys = [keyboard.addKey(KeyCodes.D), keyboard.addKey(KeyCodes.RIGHT)];
    // Space shoots too, handy on a laptop
    // Space jumps
    keyboard.addKey(KeyCodes.SPACE).on('down', () => {
      this.startJump();
    });
    keyboard.on('keydown-K', (event: KeyboardEvent) => {
      // The same K press that closed the shop must not open it again
      if (event.timeStamp === this.shopClosedKeyTime) return;
      this.openShop();
    });

    // A mouse click or a tap on the laptop's touchpad shoots (not the right button)
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.rightButtonDown() || pointer.middleButtonDown()) return;
      this.tryShoot();
    });
  }

  private isCrouching(): boolean {
    return this.crouchKeys.some((k) => k.isDown);
  }

  private tryShoot(): void {
    if (!this.playerAlive) return;
    // The gun has to reload between shots
    if (!canShoot(this.time.now, this.lastShotMs, this.cooldownMs())) return;
    this.lastShotMs = this.time.now;
    const muzzle = this.player.muzzlePosition();
    const facing = this.player.getFacing();
    this.shoot(muzzle, facing, 'player');
    // Shots from a crouch toward the white ones are always jumped over
    if (this.isCrouching() && facing === 1) this.enemy.dodge(muzzle.x, BULLET.speed);
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
          this.earned = addPoints(this.earned, this.enemy.points);
          this.bestText.setText(formatBest(Math.max(this.bestBefore, this.earned)));
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

    this.gunFx.update(delta, [...this.playerBullets, ...this.enemyBullets]);
    this.drawReloadBar();
  }

  /** A/D or the arrows walk left and right. S or the down arrow crouches while held down. */
  private movePlayer(delta: number): void {
    // Falling into a pit: no moving until back on solid ground
    if (this.falling) return;
    const direction = moveDirection(
      this.leftKeys.some((k) => k.isDown),
      this.rightKeys.some((k) => k.isDown),
    );
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

    // In the air: fly up and come back down
    if (this.jumpLift > 0 || this.jumpSpeed > 0) {
      const step = jumpStep(this.jumpLift, this.jumpSpeed, delta, PLAYER.gravity);
      this.jumpLift = step.lift;
      this.jumpSpeed = step.speed;
      this.player.setLift(this.jumpLift);
      this.player.setStance('jump');
      this.player.setWalking(null);
      if (!step.landed) return;
    }

    // On the ground over a hole: fall in!
    const pit = overPit(x, PITS.holes, PITS.grip);
    if (pit) {
      this.fallInto(pit);
      return;
    }

    // Legs swing while walking, and shuffle while walking crouched
    this.player.setStance(this.isCrouching() ? 'crouch' : 'stand');
    this.player.setWalking(direction !== 0 ? PLAYER.stepMs : null);
  }

  /** Space: jump, if standing on the ground. */
  private startJump(): void {
    if (!this.playerAlive || this.falling || this.jumpLift > 0) return;
    this.jumpSpeed = PLAYER.jumpSpeed;
    this.sfx.footstep();
  }

  /** Down the hole: sink, lose a heart, and come back next to the edge. */
  private fallInto(pit: Pit): void {
    this.falling = true;
    this.player.setWalking(null);
    this.player.setStance('jump');
    const fall = { depth: 0 };
    this.tweens.add({
      targets: fall,
      depth: PITS.fallDepth,
      duration: PITS.fallMs,
      ease: 'Quad.easeIn',
      onUpdate: () => {
        this.player.setLift(-fall.depth);
      },
      onComplete: () => {
        this.hurtPlayer(PLAYER.feetY - PITS.fallDepth, this.player.getFacing());
        if (!this.playerAlive) return;
        this.player.setX(safeSpotBeside(pit, this.player.getFacing(), PITS.respawnGap));
        this.player.setLift(0);
        this.player.setStance('stand');
        this.falling = false;
      },
    });
  }

  /** M turns all sounds off and on. The choice is saved. */
  private toggleSound(): void {
    this.muted = !this.muted;
    this.sfx.setMuted(this.muted);
    writeSave(browserStorage(), { ...loadSave(browserStorage()), muted: this.muted });
  }

  /** How long the gun in the hand reloads. The rifle upgrade makes the rifle much faster. */
  private cooldownMs(): number {
    const weapon = this.player.getWeapon();
    if (weapon === 'rifle' && this.rifleUpgrade) return WEAPONS.rifle.upgradedCooldownMs;
    return WEAPONS[weapon].cooldownMs;
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
      hasNeeded: (item) => this.hasNeeded(item),
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
    const result = buy(this.score, item, this.owns(item), this.hasNeeded(item));
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
    if (item.id === 'rifleUpgrade') {
      this.rifleUpgrade = true;
      writeSave(browserStorage(), { ...loadSave(browserStorage()), rifleUpgrade: true });
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
    if (item.id === 'rifleUpgrade') return this.rifleUpgrade;
    const outfit = outfitOf(item);
    return outfit !== null && this.ownedOutfits.has(outfit);
  }

  /** Does the player have what this item needs first (like the rifle for its upgrade)? */
  private hasNeeded(item: ShopItem): boolean {
    if (item.needs === undefined) return true;
    return this.owns({ ...item, id: item.needs });
  }

  /** Put on clothes the player owns. */
  private wear(item: ShopItem): void {
    const outfit = outfitOf(item);
    if (!outfit || !this.ownedOutfits.has(outfit)) return;
    this.wornOutfit = outfit;
    this.player.setOutfit(OUTFITS[outfit]);
  }

  /** Every 30th one is the giant, every 15th the axe guy, the others white stick figures. */
  private spawnEnemy(): void {
    if (!this.playerAlive) return;
    this.enemyCount += 1;
    const rules = DIFFICULTIES[this.difficulty];
    const next = enemyFor(rules, this.enemyCount);
    if (next.kind !== 'white') {
      const base = next.kind === 'giant' ? GIANT : BOSS;
      this.enemy = new Boss(
        this,
        base,
        (hitY, push, damage) => {
          this.sfx.chop();
          if (this.playerAlive) this.hurtPlayer(hitY, push, damage);
        },
        () => this.player.getX(),
        next.lives,
      );
      this.enemy.figure.setOnStep(() => {
        this.sfx.footstep(true);
        this.dustAt(this.enemy.figure.getX(), 2);
      });
      return;
    }
    this.enemy = new Enemy(
      this,
      (muzzle) => {
        this.shoot(muzzle, -1, 'enemy');
      },
      next.lives ?? ENEMY.lives,
    );
    this.enemy.figure.setOnStep(() => {
      this.sfx.footstep(false, true);
      this.dustAt(this.enemy.figure.getX());
    });
  }

  /** A bullet, axe or club hit the player: lose lives, and break on the last one. */
  private hurtPlayer(hitY: number, push: 1 | -1, damage = 1): void {
    this.lives = loseLife(this.lives, damage);
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

    // Save the best score of this level
    const record = recordScore(loadSave(browserStorage()), this.difficulty, this.earned);
    writeSave(browserStorage(), record.save);

    this.time.delayedCall(GAME_OVER.delayMs, () => {
      showGameOverSign(
        this,
        () => {
          // Back to the start menu to pick a level again
          this.scene.start('MenuScene');
        },
        record.newRecord ? this.earned : null,
      );
    });
  }

  /** A little puff of dust kicked up by a footstep. `size` is bigger for heavy feet. */
  private dustAt(x: number, size = 1): void {
    for (let i = 0; i < DUST.puffs; i++) {
      const puff = this.add.circle(
        x + (Math.random() - 0.5) * 20,
        PLAYER.feetY - 2,
        (2 + Math.random() * 2) * size,
        DUST.color,
        DUST.alpha,
      );
      this.tweens.add({
        targets: puff,
        x: puff.x + (Math.random() - 0.5) * 24,
        y: puff.y - (4 + Math.random() * 8) * size,
        scale: 2.5,
        alpha: 0,
        duration: DUST.ms,
        ease: 'Sine.easeOut',
        onComplete: () => {
          puff.destroy();
        },
      });
    }
  }

  private shoot(
    muzzle: { x: number; y: number },
    direction: 1 | -1,
    shooter: 'player' | 'enemy',
  ): void {
    const bullet = { ...muzzle, direction };
    const gun = shooter === 'player' ? this.player : this.enemy.figure;
    if (shooter === 'player') {
      this.playerBullets.push(bullet);
      this.sfx.gunshot(this.player.getWeapon());
    } else {
      this.enemyBullets.push(bullet);
      this.sfx.gunshot('pistol', true);
    }
    // Flash, smoke and a brass shell flying out
    this.gunFx.shot(muzzle, gun.handPosition(), direction, PLAYER.feetY);
  }
}

/** Which outfit a shop item gives, or null if it isn't clothes. */
function outfitOf(item: ShopItem): OutfitId | null {
  return item.outfit !== undefined && item.outfit in OUTFITS ? (item.outfit as OutfitId) : null;
}
