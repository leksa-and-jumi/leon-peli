import Phaser from 'phaser';
import { BULLET, COLORS, CROUCH_HINT, GAME_WIDTH, PLAYER } from '../config';
import { moveBullets, type Bullet } from '../logic/bullets';
import { RuinsBackground } from '../objects/RuinsBackground';
import { StickFigure } from '../objects/StickFigure';

/** Leo's game: the stick figure stands in the ruins with a gun. */
export class MainScene extends Phaser.Scene {
  private player!: StickFigure;
  private crouchKey!: Phaser.Input.Keyboard.Key;
  private bullets: Bullet[] = [];
  private bulletGraphics!: Phaser.GameObjects.Graphics;

  constructor() {
    super('MainScene');
  }

  create(): void {
    new RuinsBackground(this);
    this.player = new StickFigure(this, PLAYER.x, PLAYER.feetY);
    this.bulletGraphics = this.add.graphics();
    this.add.text(16, 16, CROUCH_HINT, { fontSize: '18px', color: COLORS.text });

    const keyboard = this.input.keyboard;
    if (!keyboard) {
      throw new Error('Keyboard input is not available');
    }
    this.crouchKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.C);

    // Left mouse click shoots
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.leftButtonDown()) this.shoot();
    });
  }

  update(_time: number, delta: number): void {
    // Crouch only while C is held down
    this.player.setCrouching(this.crouchKey.isDown);

    this.bullets = moveBullets(this.bullets, BULLET.speed, delta, GAME_WIDTH);
    this.bulletGraphics.clear();
    this.bulletGraphics.fillStyle(BULLET.color, 1);
    for (const b of this.bullets) {
      this.bulletGraphics.fillRect(b.x, b.y - BULLET.height / 2, BULLET.width, BULLET.height);
    }
  }

  private shoot(): void {
    const muzzle = this.player.muzzlePosition();
    this.bullets.push(muzzle);

    // Quick flash at the end of the gun
    const { color, radius, durationMs } = BULLET.flash;
    const flash = this.add.circle(muzzle.x, muzzle.y, radius, color);
    this.time.delayedCall(durationMs, () => {
      flash.destroy();
    });
  }
}
