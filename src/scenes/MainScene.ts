import Phaser from 'phaser';
import { PLAYER } from '../config';
import { RuinsBackground } from '../objects/RuinsBackground';
import { StickFigure } from '../objects/StickFigure';

/** Leo's game: the stick figure stands in the ruins with a gun. */
export class MainScene extends Phaser.Scene {
  constructor() {
    super('MainScene');
  }

  create(): void {
    new RuinsBackground(this);
    new StickFigure(this, PLAYER.x, PLAYER.feetY);
  }
}
