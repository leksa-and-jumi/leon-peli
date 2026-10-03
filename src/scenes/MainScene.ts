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
  GRENADE,
  OUTFITS,
  PIG_AXE,
  SWING,
  LIANAS,
  PLAYER,
  RELOAD_BAR,
  RIFLE_DEATHS,
  RUN_SAVE_EVERY_MS,
  START_POINTS,
  WEAPONS,
  type OutfitId,
  type Weapon,
} from '../config';
import { bulletHits, moveBullets, type Bullet } from '../logic/bullets';
import { formatLives, loseLife } from '../logic/lives';
import { canShoot, reloadProgress } from '../logic/reload';
import { addPoints, formatBest, formatScore } from '../logic/score';
import { grenadeAfterShots, inBlast } from '../logic/grenade';
import { inReach } from '../logic/melee';
import { moveDirection, moveX } from '../logic/move';
import { stepDrop, type Drop } from '../logic/blood';
import { jumpStep } from '../logic/hop';
import { canGrab, flightTime, pendulumStep, releaseVelocity, type Swing } from '../logic/liana';
import {
  afterDeath,
  loadSave,
  recordScore,
  weaponsFor,
  withoutRun,
  withRun,
  withWeapons,
  writeSave,
} from '../logic/save';
import { buy, type ShopItem } from '../logic/shop';
import { enemyFor, type Difficulty } from '../logic/difficulty';
import { BrokenFigure } from '../objects/BrokenFigure';
import { Sfx } from '../audio/Sfx';
import { Atmosphere } from '../objects/Atmosphere';
import { Boss } from '../objects/Boss';
import { Enemy, type Foe } from '../objects/Enemy';
import { Grenades } from '../objects/Grenades';
import { Lianas } from '../objects/Lianas';
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
  /** The gun you'd hold without the pig suit: the pistol, or the rifle if bought here. */
  private gun: 'pistol' | 'rifle' = 'pistol';
  /** Swinging the axe right now (the arm is down). */
  private chopping = false;
  /** Jumping: how high the feet are and how fast they're going up. */
  private jumpLift = 0;
  private jumpSpeed = 0;
  /** Holding a vine: which one, and how it swings. */
  private hanging: { index: number; swing: Swing } | null = null;
  /** Flying off a vine with a flip. */
  private flight: { drop: Drop; spin: number; spinSpeed: number } | null = null;
  /** After letting go, no grabbing again until this time. */
  private regrabAt = 0;
  private lianas!: Lianas;
  private lastGrenadeMs: number | null = null;
  private enemyShots = 0;
  private grenades!: Grenades;
  private grenadeBar!: Phaser.GameObjects.Graphics;
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
    this.hanging = null;
    this.flight = null;
    this.regrabAt = 0;
    this.lastGrenadeMs = null;
    this.enemyShots = 0;
    this.enemyCount = 0;
    this.ownedOutfits = new Set<OutfitId>(['black']);
    this.wornOutfit = 'black';
    // An unfinished game on this level continues where it was left
    const run = loadSave(browserStorage()).runs[this.difficulty];
    if (run) {
      this.score = run.score;
      this.earned = run.earned;
      this.lives = run.lives;
      // The enemy that was coming comes again
      this.enemyCount = Math.max(run.enemyCount - 1, 0);
      for (const o of run.ownedOutfits) if (o in OUTFITS) this.ownedOutfits.add(o as OutfitId);
    }

    this.muted = loadSave(browserStorage()).muted;
    this.sfx = new Sfx(this, this.muted);

    const atmosphere = new Atmosphere(this);
    new RuinsBackground(this, atmosphere);
    atmosphere.addVignette(ATMOSPHERE.vignette.depth);
    this.lianas = new Lianas(this);
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
    // A bought rifle is saved for this level, so it's still yours after dying (up to 5 times)
    const levelWeapons = weaponsFor(loadSave(browserStorage()), this.difficulty);
    this.gun = levelWeapons.rifle ? 'rifle' : 'pistol';
    this.chopping = false;
    this.player.setWeapon(this.gun);
    this.rifleUpgrade = levelWeapons.rifleUpgrade;
    if (run) {
      this.player.setX(Math.min(Math.max(run.playerX, PLAYER.minX), PLAYER.maxX));
      const worn = run.wornOutfit in OUTFITS ? (run.wornOutfit as OutfitId) : 'black';
      if (this.ownedOutfits.has(worn))
        this.wear({ id: worn, emoji: '', name: '', price: 0, outfit: worn });
    }
    this.spawnEnemy();

    // Keep saving while playing, so closing the page doesn't lose the game
    this.time.addEvent({
      delay: RUN_SAVE_EVERY_MS,
      loop: true,
      callback: () => {
        this.saveRun();
      },
    });
    const saveOnLeave = (): void => {
      this.saveRun();
    };
    window.addEventListener('pagehide', saveOnLeave);
    document.addEventListener('visibilitychange', saveOnLeave);
    this.events.once('shutdown', () => {
      window.removeEventListener('pagehide', saveOnLeave);
      document.removeEventListener('visibilitychange', saveOnLeave);
    });
    this.gunFx = new GunEffects(this);
    this.grenades = new Grenades(this, () => {
      this.sfx.explosion();
    });
    this.add
      .text(16, 16, CROUCH_HINT, { fontSize: '18px', color: COLORS.text })
      .setDepth(ATMOSPHERE.hudDepth);
    this.add.text(16, RELOAD_BAR.y - 8, '🔫', { fontSize: '20px' }).setDepth(ATMOSPHERE.hudDepth);
    this.reloadBar = this.add.graphics().setDepth(ATMOSPHERE.hudDepth);
    this.add
      .text(16, RELOAD_BAR.y + RELOAD_BAR.gap - 8, '💣', { fontSize: '20px' })
      .setDepth(ATMOSPHERE.hudDepth);
    this.grenadeBar = this.add.graphics().setDepth(ATMOSPHERE.hudDepth);
    this.bestBefore = loadSave(browserStorage()).best[this.difficulty] ?? 0;
    this.bestText = this.add
      .text(GAME_WIDTH - 16, 52, formatBest(Math.max(this.bestBefore, this.earned)), {
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
      .text(GAME_WIDTH - 16, 16, this.livesLabel(), { fontSize: '26px' })
      .setOrigin(1, 0)
      .setDepth(ATMOSPHERE.hudDepth);

    const keyboard = this.input.keyboard;
    if (!keyboard) {
      throw new Error('Keyboard input is not available');
    }
    const { KeyCodes } = Phaser.Input.Keyboard;
    this.crouchKeys = [keyboard.addKey(KeyCodes.S), keyboard.addKey(KeyCodes.DOWN)];
    keyboard.on('keydown-G', () => {
      this.throwGrenade();
    });
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
    this.input.on(
      'pointerdown',
      (pointer: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
        if (pointer.rightButtonDown() || pointer.middleButtonDown()) return;
        // Clicking a button (like 🏠 on the test level) doesn't shoot
        if (over.length > 0) return;
        this.tryShoot();
      },
    );

    // The test level has a button back to the menu
    if (this.difficulty === 'test') this.addMenuButton();
  }

  private addMenuButton(): void {
    const button = this.add
      .text(GAME_WIDTH / 2, 62, '🏠 Menu / Valikko', {
        fontSize: '18px',
        color: COLORS.text,
        backgroundColor: '#2e7d32',
        padding: { x: 10, y: 5 },
      })
      .setOrigin(0.5, 0)
      .setDepth(ATMOSPHERE.hudDepth)
      .setInteractive({ useHandCursor: true });
    button.on('pointerdown', () => {
      this.saveRun();
      this.scene.start('MenuScene');
    });
  }

  /** Remember this game, so it continues if the page is closed (not after dying). */
  private saveRun(): void {
    if (!this.playerAlive) return;
    writeSave(
      browserStorage(),
      withRun(loadSave(browserStorage()), this.difficulty, {
        score: this.score,
        earned: this.earned,
        lives: this.lives,
        enemyCount: this.enemyCount,
        playerX: this.player.getX(),
        ownedOutfits: [...this.ownedOutfits],
        wornOutfit: this.wornOutfit,
      }),
    );
  }

  private isCrouching(): boolean {
    return this.crouchKeys.some((k) => k.isDown);
  }

  private tryShoot(): void {
    // Both hands are busy holding a vine
    if (!this.playerAlive || this.hanging) return;
    // The gun has to reload between shots
    if (!canShoot(this.time.now, this.lastShotMs, this.cooldownMs())) return;
    this.lastShotMs = this.time.now;
    if (this.player.getWeapon() === 'axe') {
      this.chopAxe();
      return;
    }
    const muzzle = this.player.muzzlePosition();
    const facing = this.player.getFacing();
    this.shoot(muzzle, facing, 'player');
    // Shots from a crouch toward the white ones are always jumped over
    if (this.isCrouching() && facing === 1) this.enemy.dodge(muzzle.x, BULLET.speed);
  }

  /** In the pig suit: swing the axe at whoever is right in front of you. */
  private chopAxe(): void {
    this.chopping = true;
    // Lift it back, then strike: the hit lands when the axe comes down
    this.player.swing(() => {
      this.sfx.chop();
      if (!this.playerAlive) return;
      const facing = this.player.getFacing();
      if (
        this.enemy.isAlive() &&
        inReach(this.player.getX(), facing, this.enemy.figure.getX(), PIG_AXE.reach)
      ) {
        this.hitEnemy(PLAYER.feetY - 70, facing, PIG_AXE.damage);
      }
    });
    this.time.delayedCall(SWING.windupMs + PIG_AXE.chopMs, () => {
      this.chopping = false;
    });
  }

  update(_time: number, delta: number): void {
    if (this.playerAlive) this.movePlayer(delta);
    this.enemy.update(delta);

    this.playerBullets = moveBullets(this.playerBullets, BULLET.speed, delta, GAME_WIDTH);
    this.enemyBullets = moveBullets(this.enemyBullets, ENEMY.bulletSpeed, delta, GAME_WIDTH);

    // The player's bullets hit the enemy
    if (this.enemy.isAlive()) {
      const enemyBox = this.enemy.figure.bounds();
      const hitBullet = this.playerBullets.find((b) => bulletHits(b, BULLET, enemyBox));
      if (hitBullet) {
        this.playerBullets = this.playerBullets.filter((b) => b !== hitBullet);
        this.hitEnemy(hitBullet.y, hitBullet.direction, 1);
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
    this.grenades.update(delta);
    this.lianas.draw(
      delta,
      this.hanging ? { index: this.hanging.index, angle: this.hanging.swing.angle } : null,
    );
    this.drawReloadBar();
  }

  /** A/D or the arrows walk left and right. S or the down arrow crouches while held down. */
  private movePlayer(delta: number): void {
    const direction = moveDirection(
      this.leftKeys.some((k) => k.isDown),
      this.rightKeys.some((k) => k.isDown),
    );
    // Turn the way you walk (and the gun turns too)
    if (direction !== 0) this.player.setFacing(direction);

    // On a vine, A/D swing it; flying off a vine does a flip
    if (this.hanging) {
      this.updateHanging(delta, direction);
      return;
    }
    if (this.flight) {
      this.updateFlight(delta);
      return;
    }

    const x = moveX(
      this.player.getX(),
      direction,
      PLAYER.walkSpeed,
      delta,
      PLAYER.minX,
      this.maxX(),
    );
    this.player.setX(x);

    // In the air: fly up and come back down, and grab a vine if you reach one
    if (this.jumpLift > 0 || this.jumpSpeed > 0) {
      const step = jumpStep(this.jumpLift, this.jumpSpeed, delta, PLAYER.gravity);
      this.jumpLift = step.lift;
      this.jumpSpeed = step.speed;
      this.player.setLift(this.jumpLift);
      this.player.setStance('jump');
      this.player.setWalking(null);
      if (this.tryGrab()) return;
      if (!step.landed) return;
    }

    // Legs swing while walking, and shuffle while walking crouched
    const holdsAxe = this.player.getWeapon() === 'axe';
    const upright = holdsAxe ? 'raise' : 'stand';
    // While swinging, the swing moves the arms
    if (!this.chopping) this.player.setStance(this.isCrouching() ? 'crouch' : upright);
    this.player.setWalking(direction !== 0 ? PLAYER.stepMs : null);
  }

  /** How far right you can go (closer to the enemies with the axe). */
  private maxX(): number {
    return this.player.getWeapon() === 'axe' ? PIG_AXE.maxX : PLAYER.maxX;
  }

  /** How high the player's feet are right now. */
  private playerLift(): number {
    return PLAYER.feetY - this.player.getFeetY();
  }

  /** Space: jump from the ground, or let go of a vine and flip through the air. */
  private startJump(): void {
    if (!this.playerAlive) return;
    if (this.hanging) {
      this.letGo();
      return;
    }
    if (this.flight || this.jumpLift > 0) return;
    this.jumpSpeed = PLAYER.jumpSpeed;
    this.sfx.footstep();
  }

  /** While jumping or flying: grab the end of a vine if your hands reach it. */
  private tryGrab(): boolean {
    if (this.time.now < this.regrabAt) return false;
    const handsY = this.player.bounds().top + 8;
    for (let index = 0; index < LIANAS.anchors.length; index++) {
      const angle = this.lianas.idleAngle(index);
      const end = this.lianas.end(index, angle);
      if (canGrab(this.player.getX(), handsY, end, LIANAS.grabReachX, LIANAS.grabReachY)) {
        this.hanging = { index, swing: { angle, speed: 0 } };
        this.jumpLift = 0;
        this.jumpSpeed = 0;
        this.flight = null;
        this.player.setSpin(0);
        this.player.setWalking(null);
        this.player.setStance('hang');
        this.sfx.footstep();
        return true;
      }
    }
    return false;
  }

  /** Swinging on a vine: A/D push the swing, and you hang from its end. */
  private updateHanging(delta: number, input: -1 | 0 | 1): void {
    if (!this.hanging) return;
    const rules = { ...LIANAS.swing, length: LIANAS.length };
    this.hanging.swing = pendulumStep(this.hanging.swing, input, delta, rules);
    const end = this.lianas.end(this.hanging.index, this.hanging.swing.angle);
    this.player.setX(end.x);
    const feetY = end.y + LIANAS.hangDrop * PLAYER.height;
    this.player.setLift(PLAYER.feetY - feetY);
    this.player.setStance('hang');
  }

  /** Let go of the vine: fly off the way you were swinging and do one flip before landing. */
  private letGo(): void {
    if (!this.hanging) return;
    const v = releaseVelocity(this.hanging.swing, LIANAS.length);
    const lift = this.playerLift();
    const airTime = flightTime(Math.max(lift, 0), -v.vy, PLAYER.gravity);
    const turn = v.vx === 0 ? this.player.getFacing() : Math.sign(v.vx);
    this.flight = {
      drop: { x: this.player.getX(), y: this.player.getFeetY(), vx: v.vx, vy: v.vy },
      spin: 0,
      spinSpeed: (turn * Math.PI * 2) / Math.max(airTime, 0.3),
    };
    this.hanging = null;
    this.regrabAt = this.time.now + LIANAS.regrabMs;
    this.sfx.footstep();
  }

  /** Flying after letting go: fall with gravity, spin, and land on your feet. */
  private updateFlight(delta: number): void {
    if (!this.flight) return;
    const f = this.flight;
    f.drop = stepDrop(f.drop, delta, PLAYER.gravity);
    f.drop.x = Math.min(Math.max(f.drop.x, PLAYER.minX), this.maxX());
    this.player.setX(f.drop.x);
    const lift = PLAYER.feetY - f.drop.y;
    if (lift <= 0) {
      // Landed!
      this.flight = null;
      this.player.setLift(0);
      this.player.setSpin(0);
      this.player.setStance('stand');
      this.dustAt(this.player.getX(), 2);
      this.sfx.footstep(true);
      return;
    }
    f.spin += (f.spinSpeed * delta) / 1000;
    this.player.setLift(lift);
    this.player.setSpin(f.spin);
    this.player.setStance('jump');
    this.tryGrab();
  }

  /**
   * The enemy got hit `times` times (a bullet once, a grenade more). Screams when it
   * breaks: points, the record and a new enemy after a moment.
   */
  private hitEnemy(hitY: number, push: 1 | -1, times: number): void {
    if (!this.enemy.isAlive()) return;
    let broke = false;
    for (let i = 0; i < times && !broke; i++) {
      broke = this.enemy.takeHit({ x: this.enemy.figure.getX(), y: hitY }, push);
    }
    if (!broke) {
      this.sfx.hurt(this.enemy.voice);
      return;
    }
    this.sfx.scream(this.enemy.voice);
    this.score = addPoints(this.score, this.enemy.points);
    this.scoreText.setText(formatScore(this.score));
    this.earned = addPoints(this.earned, this.enemy.points);
    this.bestText.setText(formatBest(Math.max(this.bestBefore, this.earned)));
    this.time.delayedCall(ENEMY.respawnMs, () => {
      this.spawnEnemy();
    });
  }

  /** G: throw a grenade the way you're facing, at the enemy if it's there (once every 30 seconds). */
  private throwGrenade(): void {
    if (!this.playerAlive || this.hanging) return;
    if (!canShoot(this.time.now, this.lastGrenadeMs, GRENADE.cooldownMs)) return;
    this.lastGrenadeMs = this.time.now;
    const facing = this.player.getFacing();
    // Aim at the enemy if it's in front of you, otherwise throw a fixed distance
    const enemyX = this.enemy.figure.getX();
    const enemyInFront = this.enemy.isAlive() && (enemyX - this.player.getX()) * facing > 0;
    const target = Math.min(
      Math.max(enemyInFront ? enemyX : this.player.getX() + facing * GRENADE.throwDistance, 20),
      GAME_WIDTH - 20,
    );
    this.grenades.throw(this.player.handPosition(), target, PLAYER.feetY, (x) => {
      if (this.enemy.isAlive() && inBlast(this.enemy.figure.getX(), x, GRENADE.radius)) {
        this.hitEnemy(PLAYER.feetY - 60, facing, GRENADE.damage);
      }
    });
  }

  /** A white one has shot 10 times: it throws a grenade at you. */
  private enemyThrowsGrenade(): void {
    const enemy = this.enemy;
    if (!this.playerAlive || !enemy.isAlive()) return;
    this.grenades.throw(enemy.figure.handPosition(), this.player.getX(), PLAYER.feetY, (x) => {
      const close = inBlast(this.player.getX(), x, GRENADE.radius);
      const jumpedOver = this.playerLift() > GRENADE.safeHeight;
      if (this.playerAlive && close && !jumpedOver) {
        this.hurtPlayer(PLAYER.feetY - 60, x < this.player.getX() ? 1 : -1, GRENADE.enemyDamage);
      }
    });
  }

  /** M turns all sounds off and on. The choice is saved. */
  private toggleSound(): void {
    this.muted = !this.muted;
    this.sfx.setMuted(this.muted);
    writeSave(browserStorage(), { ...loadSave(browserStorage()), muted: this.muted });
  }

  /** How long the weapon in the hand reloads. The rifle upgrade makes the rifle much faster. */
  private cooldownMs(): number {
    const weapon = this.player.getWeapon();
    if (weapon === 'axe') return PIG_AXE.cooldownMs;
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

    // The grenade bar fills up over 30 seconds
    const grenadeReady = reloadProgress(this.time.now, this.lastGrenadeMs, GRENADE.cooldownMs);
    const gy = y + RELOAD_BAR.gap;
    this.grenadeBar.clear();
    this.grenadeBar.fillStyle(empty, 1);
    this.grenadeBar.fillRect(x, gy, width, height);
    this.grenadeBar.fillStyle(grenadeReady >= 1 ? ready : filling, 1);
    this.grenadeBar.fillRect(x, gy, width * grenadeReady, height);
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
      this.livesText.setText(this.livesLabel());
    }
    if (item.id === 'rifle') {
      this.gun = 'rifle';
      this.player.setWeapon(this.weaponFor(this.wornOutfit));
      const save = loadSave(browserStorage());
      writeSave(browserStorage(), withWeapons(save, this.difficulty, { rifle: true, deaths: 0 }));
    }
    if (item.id === 'rifleUpgrade') {
      this.rifleUpgrade = true;
      const save = loadSave(browserStorage());
      writeSave(browserStorage(), withWeapons(save, this.difficulty, { rifleUpgrade: true }));
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
    if (item.id === 'rifle') return this.gun === 'rifle';
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
    this.player.setWeapon(this.weaponFor(outfit));
  }

  /** The pig fights with an axe, the troll with its small gun; other clothes keep your gun. */
  private weaponFor(outfit: OutfitId): Weapon {
    if (outfit === 'pig') return 'axe';
    if (outfit === 'troll') return 'smallGun';
    return this.gun;
  }

  /** Every 30th one is the giant, every 15th the axe guy, the others white stick figures. */
  private spawnEnemy(): void {
    if (!this.playerAlive) return;
    this.enemyCount += 1;
    this.enemyShots = 0;
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
        this.enemyShots += 1;
        if (grenadeAfterShots(this.enemyShots, GRENADE.enemyEveryShots)) this.enemyThrowsGrenade();
      },
      next.lives ?? ENEMY.lives,
    );
    this.enemy.figure.setOnStep(() => {
      this.sfx.footstep(false, true);
      this.dustAt(this.enemy.figure.getX());
    });
  }

  /** Hearts, or "∞" on the test level where you can't die. */
  private livesLabel(): string {
    if (DIFFICULTIES[this.difficulty].invincible) return '♾️ 🧪';
    return formatLives(this.lives, PLAYER.lives);
  }

  /** A bullet, axe or club hit the player: lose lives, and break on the last one. */
  private hurtPlayer(hitY: number, push: 1 | -1, damage = 1): void {
    // On the test level you can't die: just blink
    if (DIFFICULTIES[this.difficulty].invincible) {
      this.sfx.hurt('player');
      this.player.flash(PLAYER.hitColor, PLAYER.hitFlashMs);
      return;
    }
    this.lives = loseLife(this.lives, damage);
    this.livesText.setText(this.livesLabel());
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
    // With the rifle, every death counts: after 5 it's gone from this level
    const death = afterDeath(record.save, this.difficulty, RIFLE_DEATHS);
    // Dying ends this game: next time the level starts fresh
    writeSave(browserStorage(), withoutRun(death.save, this.difficulty));

    this.time.delayedCall(GAME_OVER.delayMs, () => {
      showGameOverSign(
        this,
        () => {
          // Back to the start menu to pick a level again
          this.scene.start('MenuScene');
        },
        record.newRecord ? this.earned : null,
        death.lostRifle ? 0 : death.deathsLeft,
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
