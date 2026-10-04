import Phaser from 'phaser';
import { browserStorage } from '../browserStorage';
import {
  ATMOSPHERE,
  BOSS,
  BRUTE,
  BUBBLES,
  BULLET,
  COLORS,
  DIFFICULTIES,
  DUST,
  CROUCH_HINT,
  ENEMY,
  GAME_HEIGHT,
  GAME_OVER,
  GAME_WIDTH,
  GIANT,
  GRENADE,
  KNOCKDOWN,
  OUTFITS,
  PIG_AXE,
  SPECIAL_BULLETS,
  STAGES,
  SWING,
  LIANAS,
  PLAYER,
  RELOAD_BAR,
  RIFLE_DEATHS,
  RUN_SAVE_EVERY_MS,
  START_POINTS,
  WEAPONS,
  WORLD,
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
import {
  canGrab,
  flightTime,
  flipSpin,
  flipTucked,
  pendulumStep,
  releaseVelocity,
  type Swing,
} from '../logic/liana';
import { bumps, knockdownAt } from '../logic/knockdown';
import { bulletPowers, poisonStep, type BulletPowers } from '../logic/ammo';
import {
  canOpen,
  doorReward,
  keysNeeded,
  nextStage,
  stageOnlyKind,
  stageLayout,
} from '../logic/stage';
import { drawWorldWall } from '../objects/WorldWall';
import { MiniMap } from '../objects/MiniMap';
import { createRandom } from '../logic/ruins';
import { HiddenKeys } from '../objects/HiddenKeys';
import { StageDoor } from '../objects/StageDoor';
import {
  canSpawn,
  clampCamera,
  clampToWorld,
  followCamera,
  spawnSide,
  spawnX,
  type RepeatedSpot,
  type WorldBounds,
} from '../logic/world';
import { smoothingStep } from '../logic/pose';
import {
  afterDeath,
  loadSave,
  type RunState,
  stageFor,
  withStage,
  recordScore,
  weaponsFor,
  revivedRun,
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
import { PointBubbles } from '../objects/PointBubbles';
import { GunEffects } from '../objects/GunEffects';
import { showGameOverSign } from '../objects/GameOverSign';
import { RuinsBackground } from '../objects/RuinsBackground';
import { StickFigure } from '../objects/StickFigure';
import type { ShopData } from './ShopScene';

/** Leo's game: the black stick figure in the ruins against the white ones. */
export class MainScene extends Phaser.Scene {
  private player!: StickFigure;
  /** The walkable world, between the two big ruin walls. */
  private readonly bounds: WorldBounds = {
    left: PLAYER.x - WORLD.halfWidth,
    right: PLAYER.x + WORLD.halfWidth,
  };
  /** Everyone fighting you right now: up to three, from both sides. */
  private enemies: Foe[] = [];
  /** When the next enemy may come in. */
  private nextSpawnAt = 0;
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
  private hanging: { vine: RepeatedSpot; swing: Swing } | null = null;
  /** Flying off a vine: where you are, how long you've flown, and which way you flip. */
  private flight: { drop: Drop; elapsed: number; airTime: number; turn: 1 | -1 } | null = null;
  /** Crashed into someone: lying on your back, then getting up by yourself. */
  private knocked: { elapsed: number; startLift: number; startSpin: number; back: 1 | -1 } | null =
    null;
  /** Bending the knees for a moment after landing a flip. */
  private landingUntil = 0;
  /** After letting go, no grabbing again until this time. */
  private regrabAt = 0;
  private lianas!: Lianas;
  private bubbles!: PointBubbles;
  private lastGrenadeMs: number | null = null;
  private grenades!: Grenades;
  private grenadeBar!: Phaser.GameObjects.Graphics;
  private muted = false;
  private ownedOutfits = new Set<OutfitId>(['black']);
  /** Bullets bought in the shop for this game ('poison', 'explosive'). */
  private ownedItems = new Set<string>();
  /** Which stage you're on (one door and its hidden keys), and the keys found so far. */
  private stage = 1;
  private stageSeed = 0;
  private keysFound: number[] = [];
  private door: StageDoor | null = null;
  private hiddenKeys: HiddenKeys | null = null;
  private stageText: Phaser.GameObjects.Text | null = null;
  private doorArrow: Phaser.GameObjects.Text | null = null;
  /** Standing at the door right now (so the sign shows once per visit). */
  private atDoor = false;
  /** Going through the door to the next stage. */
  private leaving = false;
  private miniMap!: MiniMap;
  /** Poisoned enemies, and when each one loses its next life. */
  private poisoned = new Map<Foe, number>();
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
    this.knocked = null;
    this.landingUntil = 0;
    this.regrabAt = 0;
    this.lastGrenadeMs = null;
    this.enemies = [];
    this.nextSpawnAt = 0;
    this.enemyCount = 0;
    this.ownedOutfits = new Set<OutfitId>(['black']);
    this.ownedItems = new Set<string>();
    this.poisoned = new Map<Foe, number>();
    this.wornOutfit = 'black';
    // You go on from the stage you reached on this level, even after dying
    this.stage = stageFor(loadSave(browserStorage()), this.difficulty);
    this.stageSeed = Math.floor(Math.random() * 1e9);
    this.keysFound = [];
    this.door = null;
    this.hiddenKeys = null;
    this.stageText = null;
    this.doorArrow = null;
    this.atDoor = false;
    this.leaving = false;
    // An unfinished game on this level continues where it was left
    const run = loadSave(browserStorage()).runs[this.difficulty];
    if (run) {
      this.score = run.score;
      this.earned = run.earned;
      this.lives = run.lives;
      // The enemy that was coming comes again
      this.enemyCount = Math.max(run.enemyCount - 1, 0);
      for (const o of run.ownedOutfits) if (o in OUTFITS) this.ownedOutfits.add(o as OutfitId);
      for (const item of run.ownedItems) this.ownedItems.add(item);
      this.stage = run.stage;
      this.stageSeed = run.stageSeed;
      this.keysFound = [...run.keysFound];
    }

    this.muted = loadSave(browserStorage()).muted;
    this.sfx = new Sfx(this, this.muted);

    const atmosphere = new Atmosphere(this);
    new RuinsBackground(this, atmosphere);
    atmosphere.addVignette(ATMOSPHERE.vignette.depth);
    this.lianas = new Lianas(this);
    // The world ends at a huge ruin wall on each side
    drawWorldWall(this, this.bounds.left, -1);
    drawWorldWall(this, this.bounds.right, 1);
    if (DIFFICULTIES[this.difficulty].stages === true) this.buildStage();
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
      this.player.setX(clampToWorld(run.playerX, this.bounds, WORLD.wallMargin));
      const worn = run.wornOutfit in OUTFITS ? (run.wornOutfit as OutfitId) : 'black';
      if (this.ownedOutfits.has(worn))
        this.wear({ id: worn, emoji: '', name: '', price: 0, outfit: worn });
    }
    // The camera keeps you in the middle as you walk through the endless ruins
    this.cameras.main.scrollX = clampCamera(
      this.player.getX() - GAME_WIDTH / 2,
      this.bounds,
      GAME_WIDTH,
      WORLD.cameraOvershoot,
    );

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
    // Texts and bars stay put on the screen while the world scrolls
    this.add
      .text(16, 16, CROUCH_HINT, { fontSize: '18px', color: COLORS.text })
      .setDepth(ATMOSPHERE.hudDepth)
      .setScrollFactor(0);
    this.add
      .text(16, RELOAD_BAR.y - 8, '🔫', { fontSize: '20px' })
      .setDepth(ATMOSPHERE.hudDepth)
      .setScrollFactor(0);
    this.reloadBar = this.add.graphics().setDepth(ATMOSPHERE.hudDepth).setScrollFactor(0);
    this.add
      .text(16, RELOAD_BAR.y + RELOAD_BAR.gap - 8, '💣', { fontSize: '20px' })
      .setDepth(ATMOSPHERE.hudDepth)
      .setScrollFactor(0);
    this.grenadeBar = this.add.graphics().setDepth(ATMOSPHERE.hudDepth).setScrollFactor(0);
    this.bestBefore = loadSave(browserStorage()).best[this.difficulty] ?? 0;
    this.bestText = this.add
      .text(GAME_WIDTH - 16, 52, formatBest(Math.max(this.bestBefore, this.earned)), {
        fontSize: '16px',
        color: COLORS.text,
      })
      .setOrigin(1, 0)
      .setDepth(ATMOSPHERE.hudDepth)
      .setScrollFactor(0);
    this.scoreText = this.add
      .text(GAME_WIDTH / 2, 16, formatScore(this.score), {
        fontSize: '28px',
        color: COLORS.text,
        fontStyle: 'bold',
      })
      .setOrigin(0.5, 0)
      .setDepth(ATMOSPHERE.hudDepth)
      .setScrollFactor(0);
    this.livesText = this.add
      .text(GAME_WIDTH - 16, 16, this.livesLabel(), { fontSize: '26px' })
      .setOrigin(1, 0)
      .setDepth(ATMOSPHERE.hudDepth)
      .setScrollFactor(0);

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
        // Clicking a button (like 🏠 back to the menu) doesn't shoot
        if (over.length > 0) return;
        this.tryShoot();
      },
    );

    // Every level has a button back to the menu (the game is saved, so you can go on later)
    this.addMenuButton();
    if (this.door) this.addStageHud();
    this.miniMap = new MiniMap(this, this.bounds);
    this.cameras.main.fadeIn(300);

    // Now and then a 3-point bubble floats up: catch it!
    this.bubbles = new PointBubbles(this, () => {
      this.sfx.pop();
      this.gainPoints(BUBBLES.points);
    });
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
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: true });
    button.on('pointerdown', () => {
      this.saveRun();
      this.scene.start('MenuScene');
    });
  }

  /** Remember this game, so it continues if the page is closed (not after dying). */
  private saveRun(): void {
    if (!this.playerAlive || this.leaving) return;
    writeSave(
      browserStorage(),
      withRun(loadSave(browserStorage()), this.difficulty, this.runState()),
    );
  }

  /** Everything needed to go on with this game later. */
  private runState(): RunState {
    return {
      score: this.score,
      earned: this.earned,
      lives: this.lives,
      enemyCount: this.enemyCount,
      playerX: this.player.getX(),
      ownedOutfits: [...this.ownedOutfits],
      wornOutfit: this.wornOutfit,
      ownedItems: [...this.ownedItems],
      stage: this.stage,
      stageSeed: this.stageSeed,
      keysFound: [...this.keysFound],
    };
  }

  /** The door out of this stage and its hidden keys, always in the same places for this stage. */
  private buildStage(): void {
    const layout = stageLayout(createRandom(this.stageSeed), this.stage, PLAYER.x, STAGES);
    this.door = new StageDoor(this, layout.doorX);
    this.hiddenKeys = new HiddenKeys(this, layout.keys, this.keysFound, (number) => {
      this.keysFound.push(number);
      this.sfx.pop();
      this.updateStageText();
      this.saveRun();
    });
  }

  /** "🚪 Stage 2 · 🔑 1/2" in the corner, plus a big banner when the stage starts. */
  private addStageHud(): void {
    this.stageText = this.add
      .text(GAME_WIDTH - 16, 80, '', { fontSize: '18px', color: COLORS.text })
      .setOrigin(1, 0)
      .setDepth(ATMOSPHERE.hudDepth)
      .setScrollFactor(0);
    this.updateStageText();
    this.doorArrow = this.add
      .text(0, 300, '', { fontSize: '30px' })
      .setDepth(ATMOSPHERE.hudDepth)
      .setScrollFactor(0);
    const banner = this.add
      .text(GAME_WIDTH / 2, 230, `🚪 Stage ${String(this.stage)} / Taso ${String(this.stage)}`, {
        fontSize: '44px',
        color: COLORS.text,
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setDepth(ATMOSPHERE.hudDepth)
      .setScrollFactor(0);
    this.tweens.add({
      targets: banner,
      alpha: 0,
      delay: STAGES.bannerMs - 600,
      duration: 600,
      onComplete: () => {
        banner.destroy();
      },
    });
  }

  private updateStageText(): void {
    const needed = keysNeeded(this.stage);
    this.stageText?.setText(
      `🚪 ${String(this.stage)}/${String(STAGES.last)}   🔑 ${String(this.keysFound.length)}/${String(needed)}`,
    );
  }

  /** Pick up keys, try the door, and point the way to it when it's off the screen. */
  private updateStage(): void {
    const door = this.door;
    if (!door || !this.playerAlive || this.leaving) return;
    this.hiddenKeys?.update(this.player.bounds());
    const there = door.reaches(this.player.getX()) && !this.hanging && !this.flight;
    if (there && !this.atDoor) {
      if (canOpen(this.keysFound.length, this.stage)) this.goToNextStage();
      else door.showNeedKeys(keysNeeded(this.stage) - this.keysFound.length);
    }
    this.atDoor = there;
    // An arrow at the screen edge shows which way the door is
    const left = this.cameras.main.scrollX;
    const arrow = this.doorArrow;
    if (!arrow) return;
    if (door.x < left) arrow.setText('⬅️🚪').setX(12).setVisible(true);
    else if (door.x > left + GAME_WIDTH)
      arrow
        .setText('🚪➡️')
        .setX(GAME_WIDTH - 82)
        .setVisible(true);
    else arrow.setVisible(false);
  }

  /** Big "+20 ⭐" rising over the door. */
  private showReward(points: number): void {
    const text = this.add
      .text(GAME_WIDTH / 2, 260, `+${String(points)} ⭐`, {
        fontSize: '48px',
        color: '#fff59d',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setDepth(ATMOSPHERE.hudDepth)
      .setScrollFactor(0);
    this.tweens.add({ targets: text, y: 200, scale: 1.3, duration: 900, ease: 'Quad.easeOut' });
  }

  /** All the keys: the door swings open, and the next stage starts. */
  private goToNextStage(): void {
    this.leaving = true;
    this.door?.swingOpen();
    this.sfx.buy();
    // Points for getting through: 10 for the first door, 20 for the second...
    const reward = doorReward(this.stage);
    this.gainPoints(reward);
    this.showReward(reward);
    for (const enemy of this.enemies) enemy.stopShooting();
    const next: RunState = {
      ...this.runState(),
      stage: nextStage(this.stage, STAGES.last),
      stageSeed: Math.floor(Math.random() * 1e9),
      keysFound: [],
      playerX: PLAYER.x,
    };
    const save = withRun(loadSave(browserStorage()), this.difficulty, next);
    writeSave(browserStorage(), withStage(save, this.difficulty, next.stage));
    this.time.delayedCall(700, () => {
      this.cameras.main.fadeOut(400);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.restart({ difficulty: this.difficulty });
      });
    });
  }

  private isCrouching(): boolean {
    return this.crouchKeys.some((k) => k.isDown);
  }

  private tryShoot(): void {
    // Both hands are busy holding a vine
    if (!this.playerAlive || this.hanging || this.knocked) return;
    // The gun has to reload between shots
    if (!canShoot(this.time.now, this.lastShotMs, this.cooldownMs())) return;
    this.lastShotMs = this.time.now;
    if (this.player.getWeapon() === 'axe') {
      this.chopAxe();
      return;
    }
    const muzzle = this.player.muzzlePosition();
    const facing = this.player.getFacing();
    const powers = bulletPowers(this.player.getWeapon(), {
      poison: this.ownedItems.has('poison'),
      explosive: this.ownedItems.has('explosive'),
    });
    this.shoot(muzzle, facing, this.player, 0, powers);
    // Shots from a crouch toward the white ones are always jumped over
    if (this.isCrouching()) {
      for (const enemy of this.enemies) enemy.dodge(muzzle.x, BULLET.speed, facing);
    }
  }

  /** In the pig suit: swing the axe at whoever is right in front of you. */
  private chopAxe(): void {
    this.chopping = true;
    // Lift it back, then strike: the hit lands when the axe comes down
    this.player.swing(() => {
      this.sfx.chop();
      if (!this.playerAlive) return;
      const facing = this.player.getFacing();
      const target = this.nearestEnemy((e) =>
        inReach(this.player.getX(), facing, e.figure.getX(), PIG_AXE.reach),
      );
      if (target) this.hitEnemy(target, PLAYER.feetY - 70, facing, PIG_AXE.damage);
    });
    this.time.delayedCall(SWING.windupMs + PIG_AXE.chopMs, () => {
      this.chopping = false;
    });
  }

  update(_time: number, delta: number): void {
    if (this.playerAlive) this.movePlayer(delta);
    // The camera glides along to keep you in the middle
    const camera = this.cameras.main;
    camera.scrollX = clampCamera(
      followCamera(
        camera.scrollX,
        this.player.getX(),
        GAME_WIDTH,
        smoothingStep(delta, WORLD.cameraSpeed),
      ),
      this.bounds,
      GAME_WIDTH,
      WORLD.cameraOvershoot,
    );
    this.spawnWhenThereIsRoom();
    this.updateStage();
    for (const enemy of this.enemies) enemy.update(delta);
    // Broken ones are gone (their pieces stay on the ground by themselves)
    this.enemies = this.enemies.filter((e) => e.isAlive());

    // Bullets that fly off the screen are gone
    const area = {
      left: camera.scrollX - WORLD.bulletMargin,
      right: camera.scrollX + GAME_WIDTH + WORLD.bulletMargin,
      top: 0,
      bottom: GAME_HEIGHT,
    };
    this.playerBullets = moveBullets(this.playerBullets, BULLET.speed, delta, area);
    this.enemyBullets = moveBullets(this.enemyBullets, ENEMY.bulletSpeed, delta, area);

    // The player's bullets hit the first enemy in their way
    for (const bullet of [...this.playerBullets]) {
      const target = this.enemies.find(
        (e) => e.isAlive() && bulletHits(bullet, BULLET, e.figure.bounds()),
      );
      if (!target) continue;
      this.playerBullets = this.playerBullets.filter((b) => b !== bullet);
      if (bullet.explosive === true) {
        // Boom, right inside them
        this.gunFx.burst({ x: target.figure.getX(), y: bullet.y });
        this.sfx.explosion();
      }
      const damage = bullet.explosive === true ? SPECIAL_BULLETS.explosiveDamage : 1;
      this.hitEnemy(target, bullet.y, bullet.direction, damage);
      // Poison keeps working on them, one life every ten seconds
      if (bullet.poison === true && target.isAlive() && !this.poisoned.has(target)) {
        this.poisoned.set(target, this.time.now + SPECIAL_BULLETS.poisonEveryMs);
      }
    }
    this.updatePoison(delta);

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
    this.bubbles.update(delta, this.playerAlive ? this.player.bounds() : null);
    this.lianas.draw(
      delta,
      this.hanging
        ? {
            id: this.hanging.vine.id,
            angle: this.hanging.swing.angle,
            speed: this.hanging.swing.speed,
          }
        : null,
    );
    this.drawReloadBar();
    this.miniMap.draw({
      playerX: this.player.getX(),
      screenLeft: this.cameras.main.scrollX,
      enemies: this.enemies.map((e) => ({ x: e.figure.getX(), color: e.figure.getLook().color })),
      doorX: this.door?.x ?? null,
      keys: this.hiddenKeys?.remaining() ?? [],
    });
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
    if (this.knocked) {
      this.updateKnockdown(delta);
      return;
    }

    // Walk as far as the big ruin walls at the ends of the world
    const x = moveX(
      this.player.getX(),
      direction,
      PLAYER.walkSpeed,
      delta,
      this.bounds.left + WORLD.wallMargin,
      this.bounds.right - WORLD.wallMargin,
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
    const landing = this.time.now < this.landingUntil;
    const upright = landing ? 'crouch' : holdsAxe ? 'raise' : 'stand';
    // While swinging, the swing moves the arms
    if (!this.chopping) this.player.setStance(this.isCrouching() ? 'crouch' : upright);
    this.player.setWalking(direction !== 0 ? PLAYER.stepMs : null);
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
    if (this.flight || this.knocked || this.jumpLift > 0) return;
    this.jumpSpeed = PLAYER.jumpSpeed;
    this.sfx.footstep();
  }

  /** While jumping or flying: grab the end of a vine if your hands reach it. */
  private tryGrab(): boolean {
    if (this.time.now < this.regrabAt) return false;
    const handsY = this.player.bounds().top + 8;
    const x = this.player.getX();
    for (const vine of this.lianas.near(x - LIANAS.length, x + LIANAS.length)) {
      const angle = this.lianas.idleAngle(vine.id);
      const end = this.lianas.end(vine, angle);
      if (canGrab(x, handsY, end, LIANAS.grabReachX, LIANAS.grabReachY)) {
        this.hanging = { vine, swing: { angle, speed: 0 } };
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
    const end = this.lianas.end(this.hanging.vine, this.hanging.swing.angle);
    this.player.setX(end.x);
    const feetY = end.y + LIANAS.hangDrop * PLAYER.height;
    this.player.setLift(PLAYER.feetY - feetY);
    this.player.setStance('hang');
  }

  /** Let go of the vine: fly off the way you were swinging and do one flip before landing. */
  private letGo(): void {
    if (!this.hanging) return;
    const swing = releaseVelocity(this.hanging.swing, LIANAS.length);
    // Push off a little upward, for a higher flip
    const v = { vx: swing.vx, vy: swing.vy - LIANAS.releaseBoost };
    const lift = this.playerLift();
    const airTime = flightTime(Math.max(lift, 0), -v.vy, PLAYER.gravity);
    const turn = v.vx === 0 ? this.player.getFacing() : v.vx > 0 ? 1 : -1;
    this.flight = {
      drop: { x: this.player.getX(), y: this.player.getFeetY(), vx: v.vx, vy: v.vy },
      elapsed: 0,
      airTime: Math.max(airTime, 0.3),
      turn,
    };
    this.hanging = null;
    this.regrabAt = this.time.now + LIANAS.regrabMs;
    this.sfx.footstep();
  }

  /** Flying after letting go: fall with gravity, spin, and land on your feet. */
  private updateFlight(delta: number): void {
    if (!this.flight) return;
    const f = this.flight;
    f.elapsed += delta / 1000;
    f.drop = stepDrop(f.drop, delta, PLAYER.gravity);
    f.drop.x = clampToWorld(f.drop.x, this.bounds, WORLD.wallMargin);
    this.player.setX(f.drop.x);
    const lift = PLAYER.feetY - f.drop.y;
    if (lift <= 0) {
      // Landed! Bend the knees and kick up dust
      this.flight = null;
      this.player.setLift(0);
      this.player.setSpin(0);
      this.player.setStance('crouch');
      this.landingUntil = this.time.now + LIANAS.landingMs;
      this.dustAt(this.player.getX(), 2);
      this.sfx.footstep(true);
      return;
    }
    // Open at the start, tucked up tight while spinning fast, open again to land
    const progress = f.elapsed / f.airTime;
    const { openStart, openEnd } = LIANAS.flip;
    this.player.setLift(lift);
    this.player.setSpin(f.turn * flipSpin(progress));
    this.player.setStance(flipTucked(progress, openStart, openEnd) ? 'tuck' : 'jump');
    if (this.crashedIntoEnemy(lift)) return;
    this.tryGrab();
  }

  /** Flying into an enemy: bounce off and fall on your back. */
  private crashedIntoEnemy(lift: number): boolean {
    if (!this.flight) return false;
    const middle = {
      x: this.player.getX(),
      y: PLAYER.feetY - lift - PLAYER.height / 2,
    };
    const crashed = this.enemies.some(
      (e) => e.isAlive() && bumps(middle, e.figure.bounds(), KNOCKDOWN.margin),
    );
    if (!crashed) return false;
    const back = this.flight.turn === 1 ? -1 : 1;
    // Carry on from wherever the flip was (as the shortest way round)
    const progress = this.flight.elapsed / this.flight.airTime;
    const spin = this.flight.turn * flipSpin(progress);
    const startSpin = Math.atan2(Math.sin(spin), Math.cos(spin));
    this.flight = null;
    this.knocked = { elapsed: 0, startLift: lift, startSpin, back };
    this.player.setWalking(null);
    this.player.setStance('stand');
    this.sfx.hurt('player');
    return true;
  }

  /** Knocked down: fall over onto your back, lie there, then get up by yourself. */
  private updateKnockdown(delta: number): void {
    if (!this.knocked) return;
    const k = this.knocked;
    k.elapsed += delta;
    const state = knockdownAt(k.elapsed, KNOCKDOWN);
    // Lying flat, the middle of the body is just above the ground
    const lyingLift = -(PLAYER.height / 2 - PLAYER.lineWidth);
    let lift = lyingLift * state.tip;
    if (state.phase === 'fall') {
      lift = k.startLift * (1 - state.tip) + lyingLift * state.tip;
      // Bounce back off the one you hit
      const x = this.player.getX() + (k.back * KNOCKDOWN.bounceBack * delta) / 1000;
      this.player.setX(clampToWorld(x, this.bounds, WORLD.wallMargin));
    }
    if (state.phase === 'lie' && k.elapsed - delta < KNOCKDOWN.fallMs) {
      // Thud!
      this.dustAt(this.player.getX(), 2);
      this.sfx.footstep(true);
    }
    // Falling backwards: the head goes the way you bounce
    const flat = k.back * (Math.PI / 2) * state.tip;
    this.player.setSpin(state.phase === 'fall' ? k.startSpin * (1 - state.tip) + flat : flat);
    this.player.setLift(lift);
    this.player.setStance(state.phase === 'rise' ? 'crouch' : 'stand');
    if (state.phase === 'done') {
      this.knocked = null;
      this.player.setSpin(0);
      this.player.setLift(0);
    }
  }

  /**
   * An enemy got hit `times` times (a bullet once, a grenade more). Screams when it
   * breaks: points and the record. New ones keep coming in by themselves.
   */
  private hitEnemy(enemy: Foe, hitY: number, push: 1 | -1, times: number): void {
    if (!enemy.isAlive()) return;
    let broke = false;
    for (let i = 0; i < times && !broke; i++) {
      broke = enemy.takeHit({ x: enemy.figure.getX(), y: hitY }, push);
    }
    if (!broke) {
      this.sfx.hurt(enemy.voice);
      return;
    }
    this.sfx.scream(enemy.voice);
    this.gainPoints(enemy.points);
    // Nobody left: the next one comes soon
    if (!this.enemies.some((e) => e.isAlive())) {
      this.nextSpawnAt = Math.min(this.nextSpawnAt, this.time.now + ENEMY.respawnMs);
    }
  }

  /** Poisoned enemies bubble green and lose a life every ten seconds. */
  private updatePoison(delta: number): void {
    for (const [enemy, nextAt] of [...this.poisoned]) {
      if (!enemy.isAlive()) {
        this.poisoned.delete(enemy);
        continue;
      }
      const box = enemy.figure.bounds();
      if (Math.random() < delta / 250)
        this.gunFx.poisonPuff({ x: enemy.figure.getX(), y: box.top + 20 });
      const step = poisonStep(nextAt, this.time.now, SPECIAL_BULLETS.poisonEveryMs);
      this.poisoned.set(enemy, step.nextAt);
      if (!step.hurt) continue;
      enemy.figure.flash(SPECIAL_BULLETS.poisonColor, PLAYER.hitFlashMs);
      this.hitEnemy(enemy, (box.top + box.bottom) / 2, enemy.figure.getFacing() === 1 ? -1 : 1, 1);
    }
  }

  /** The closest living enemy that `fits`, or null. */
  private nearestEnemy(fits: (enemy: Foe) => boolean): Foe | null {
    const x = this.player.getX();
    let best: Foe | null = null;
    for (const e of this.enemies) {
      if (!e.isAlive() || !fits(e)) continue;
      if (!best || Math.abs(e.figure.getX() - x) < Math.abs(best.figure.getX() - x)) best = e;
    }
    return best;
  }

  /** Points for breaking an enemy or catching a bubble: to spend, and toward the record. */
  private gainPoints(points: number): void {
    this.score = addPoints(this.score, points);
    this.scoreText.setText(formatScore(this.score));
    this.earned = addPoints(this.earned, points);
    this.bestText.setText(formatBest(Math.max(this.bestBefore, this.earned)));
  }

  /** G: throw a grenade the way you're facing, at the enemy if it's there (once every 30 seconds). */
  private throwGrenade(): void {
    if (!this.playerAlive || this.hanging || this.knocked) return;
    if (!canShoot(this.time.now, this.lastGrenadeMs, GRENADE.cooldownMs)) return;
    this.lastGrenadeMs = this.time.now;
    const facing = this.player.getFacing();
    const playerX = this.player.getX();
    // Aim at the closest enemy in front of you, otherwise throw a fixed distance
    const inFront = this.nearestEnemy((e) => (e.figure.getX() - playerX) * facing > 0);
    const left = this.cameras.main.scrollX;
    const target = Math.min(
      Math.max(
        inFront ? inFront.figure.getX() : playerX + facing * GRENADE.throwDistance,
        left + 20,
      ),
      left + GAME_WIDTH - 20,
    );
    this.grenades.throw(this.player.handPosition(), target, PLAYER.feetY, (x) => {
      // The blast hurts everyone near it
      for (const e of this.enemies) {
        if (e.isAlive() && inBlast(e.figure.getX(), x, GRENADE.radius)) {
          this.hitEnemy(e, PLAYER.feetY - 60, facing, GRENADE.damage);
        }
      }
    });
  }

  /** A white one has shot 10 times: it throws a grenade at you. */
  private enemyThrowsGrenade(enemy: Foe): void {
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
    if (item.id === 'poison' || item.id === 'explosive') this.ownedItems.add(item.id);
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
    if (item.id === 'poison' || item.id === 'explosive') return this.ownedItems.has(item.id);
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

  /** Send in another enemy when it's time, as long as there are fewer than three. */
  private spawnWhenThereIsRoom(): void {
    if (!this.playerAlive) return;
    const alive = this.enemies.filter((e) => e.isAlive()).length;
    if (!canSpawn(alive, ENEMY.maxAtOnce, this.time.now, this.nextSpawnAt)) return;
    this.spawnEnemy();
    const { min, max } = ENEMY.spawnGapMs;
    this.nextSpawnAt = this.time.now + min + Math.random() * (max - min);
  }

  /**
   * A new enemy walks in from just off the screen, on the left or the right.
   * Which kind depends on the level and how many have come so far.
   */
  private spawnEnemy(): void {
    this.enemyCount += 1;
    const rules = DIFFICULTIES[this.difficulty];
    // The last stages behind the doors have only one kind: red, then green, then brown
    const only = rules.stages === true ? stageOnlyKind(this.stage) : null;
    const next = only ? { kind: only } : enemyFor(rules, this.enemyCount);
    const side = spawnSide(Math.random());
    // Just off the screen, but never behind one of the big walls
    const startX = spawnX(
      side,
      this.cameras.main.scrollX,
      GAME_WIDTH,
      WORLD.spawnOffscreen,
      this.bounds,
      WORLD.wallMargin,
    );
    let enemy: Foe;
    if (next.kind !== 'white') {
      const base = next.kind === 'giant' ? GIANT : next.kind === 'brute' ? BRUTE : BOSS;
      const boss = new Boss(
        this,
        base,
        (hitY, push, damage) => {
          this.sfx.chop();
          if (this.playerAlive) this.hurtPlayer(hitY, push, damage);
        },
        () => this.player.getX(),
        next.lives,
        startX,
        this.bounds,
      );
      boss.figure.setOnStep(() => {
        this.sfx.footstep(true);
        this.dustAt(boss.figure.getX(), 2);
      });
      enemy = boss;
    } else {
      // On most levels the white ones aim at the middle of you, wherever you are
      // ...but not while you crouch: then they just shoot straight ahead
      const aimAt = rules.aimAtPlayer
        ? (): { x: number; y: number } | null => {
            if (this.isCrouching()) return null;
            const box = this.player.bounds();
            return { x: this.player.getX(), y: (box.top + box.bottom) / 2 };
          }
        : null;
      const { min, max } = ENEMY.standOff;
      let shots = 0;
      const white: Enemy = new Enemy(
        this,
        (muzzle, slope, direction) => {
          this.shoot(muzzle, direction, white.figure, slope);
          shots += 1;
          // Every 10th shot it throws a grenade too
          if (grenadeAfterShots(shots, GRENADE.enemyEveryShots)) this.enemyThrowsGrenade(white);
        },
        next.lives ?? ENEMY.lives,
        aimAt,
        {
          startX,
          standOff: min + Math.random() * (max - min),
          playerX: () => this.player.getX(),
          bounds: this.bounds,
        },
      );
      white.figure.setOnStep(() => {
        this.sfx.footstep(false, true);
        this.dustAt(white.figure.getX());
      });
      enemy = white;
    }
    this.enemies.push(enemy);
  }

  /** Hearts, or "∞" on the test level where you can't die. */
  private livesLabel(): string {
    if (DIFFICULTIES[this.difficulty].invincible) return '♾️ 🧪';
    return formatLives(this.lives, PLAYER.lives);
  }

  /** A bullet, axe or club hit the player: lose lives, and break on the last one. */
  private hurtPlayer(hitY: number, push: 1 | -1, damage = 1): void {
    // Safe while going through the door
    if (this.leaving) return;
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
    for (const enemy of this.enemies) enemy.stopShooting();
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
    // Everything is kept: next time you go on from here with full lives
    writeSave(
      browserStorage(),
      withRun(death.save, this.difficulty, revivedRun(this.runState(), PLAYER.lives, PLAYER.x)),
    );

    this.time.delayedCall(GAME_OVER.delayMs, () => {
      showGameOverSign(
        this,
        () => {
          // Back to the start menu to pick a level again
          this.scene.start('MenuScene');
        },
        record.newRecord ? this.earned : null,
        death.lostRifle ? 0 : death.deathsLeft,
        GAME_OVER.savedNote,
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
    /** Who shoots: the player or one of the white ones. */
    gun: StickFigure,
    /** How steeply the bullet goes down (negative = up). Straight if not given. */
    slope = 0,
    /** Poison or exploding bullets from the shop. */
    powers: BulletPowers = { poison: false, explosive: false },
  ): void {
    const bullet: Bullet = { ...muzzle, direction, slope, ...powers };
    if (gun === this.player) {
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
