import Phaser from 'phaser';
import { PLAYER } from '../config';

/**
 * The player: a black stick figure holding a gun pointing right.
 * Drawn around its feet, so `x`/`feetY` is where it stands.
 */
export class StickFigure {
  private readonly g: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, x: number, feetY: number) {
    this.g = scene.add.graphics({ x, y: feetY });
    // Pale edge first, then the black figure on top of it
    this.drawBody(PLAYER.lineWidth + 3, PLAYER.outlineColor, PLAYER.outlineAlpha);
    this.drawBody(PLAYER.lineWidth, PLAYER.color, 1);
    this.drawGun();
  }

  /** Sizes are parts of the figure's height, so changing `PLAYER.height` scales everything. */
  private drawBody(lineWidth: number, color: number, alpha: number): void {
    const h = PLAYER.height;
    const hip = { x: 0, y: -h * 0.42 };
    const neck = { x: 0, y: -h * 0.78 };
    const shoulder = { x: 0, y: -h * 0.72 };
    const headRadius = h * 0.11;

    this.g.lineStyle(lineWidth, color, alpha);
    // Legs, standing a bit apart
    this.g.lineBetween(hip.x, hip.y, -h * 0.15, 0);
    this.g.lineBetween(hip.x, hip.y, h * 0.15, 0);
    // Body
    this.g.lineBetween(hip.x, hip.y, neck.x, neck.y);
    // Back arm hangs down, front arm holds the gun straight out
    this.g.lineBetween(shoulder.x, shoulder.y, -h * 0.12, -h * 0.48);
    this.g.lineBetween(shoulder.x, shoulder.y, h * 0.3, -h * 0.66);
    // Head
    this.g.fillStyle(color, alpha);
    this.g.fillCircle(
      0,
      neck.y - headRadius + lineWidth / 2,
      headRadius + (lineWidth - PLAYER.lineWidth) / 2,
    );
  }

  private drawGun(): void {
    const h = PLAYER.height;
    const handX = h * 0.3;
    const handY = -h * 0.66;
    const { body, shine } = PLAYER.gun;
    // Pale edge around the gun, like the figure has
    this.g.fillStyle(PLAYER.outlineColor, PLAYER.outlineAlpha);
    this.g.fillRect(handX - 4, handY - 9, 34, 12);
    this.g.fillRect(handX - 4, handY - 4, 12, 18);
    this.g.fillStyle(body, 1);
    // Barrel pointing right
    this.g.fillRect(handX - 2, handY - 7, 30, 8);
    // Handle going down from the hand
    this.g.fillRect(handX - 2, handY - 2, 8, 14);
    // A little shine on top of the barrel
    this.g.fillStyle(shine, 1);
    this.g.fillRect(handX, handY - 7, 26, 2);
  }
}
