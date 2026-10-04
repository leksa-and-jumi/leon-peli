import Phaser from 'phaser';
import { BABY_DRAGON, PLAYER } from '../config';
import { glide, helperSpot } from '../logic/helper';
import { smoothingStep } from '../logic/pose';
import { StickFigure } from './StickFigure';

/** Your baby dragon friend: a little orange dragon flying behind you. */
export class BabyDragon {
  readonly figure: StickFigure;
  private x: number;

  constructor(scene: Phaser.Scene, startX: number) {
    this.x = startX;
    this.figure = new StickFigure(
      scene,
      startX,
      PLAYER.feetY,
      {
        color: BABY_DRAGON.outfit.color,
        outlineColor: 0x000000,
        outlineAlpha: 0.5,
        facing: 1,
        height: BABY_DRAGON.height,
        outfit: BABY_DRAGON.outfit,
      },
      'jump',
    );
    this.figure.setWeapon('fireBreath');
  }

  /** Every frame: fly after the player, bobbing up and down. */
  update(
    deltaMs: number,
    playerX: number,
    facing: 1 | -1,
    playerLift: number,
    timeMs: number,
  ): void {
    const spot = helperSpot(playerX, facing, BABY_DRAGON.behind, timeMs, BABY_DRAGON.bob);
    this.x = glide(this.x, spot.x, smoothingStep(deltaMs, BABY_DRAGON.glideSpeed));
    this.figure.setX(this.x);
    this.figure.setLift(BABY_DRAGON.flyHeight + Math.max(playerLift, 0) + spot.lift);
  }

  getX(): number {
    return this.x;
  }
}
