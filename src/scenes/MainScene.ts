import Phaser from 'phaser';
import { COLORS, CROUCH_HINT, PLAYER } from '../config';
import { RuinsBackground } from '../objects/RuinsBackground';
import { StickFigure } from '../objects/StickFigure';

/** Leo's game: the stick figure stands in the ruins with a gun. */
export class MainScene extends Phaser.Scene {
  private player!: StickFigure;
  private crouchKey!: Phaser.Input.Keyboard.Key;

  constructor() {
    super('MainScene');
  }

  create(): void {
    new RuinsBackground(this);
    this.player = new StickFigure(this, PLAYER.x, PLAYER.feetY);
    this.add.text(16, 16, CROUCH_HINT, { fontSize: '18px', color: COLORS.text });

    const keyboard = this.input.keyboard;
    if (!keyboard) {
      throw new Error('Keyboard input is not available');
    }
    this.crouchKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.C);
  }

  update(): void {
    // Crouch only while C is held down
    this.player.setCrouching(this.crouchKey.isDown);
  }
}
