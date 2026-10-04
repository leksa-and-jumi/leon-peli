import Phaser from 'phaser';
import { ATMOSPHERE, GAME_WIDTH, MINIMAP } from '../config';
import { mapX } from '../logic/minimap';
import type { WorldBounds } from '../logic/world';

/** What the little map shows this frame. */
export interface MapView {
  playerX: number;
  /** The part of the world on the screen right now. */
  screenLeft: number;
  enemies: readonly { x: number; color: number }[];
  doorX: number | null;
  keys: readonly { x: number; color: number }[];
}

/** A small map at the bottom of the screen, from wall to wall. */
export class MiniMap {
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly left = GAME_WIDTH / 2 - MINIMAP.width / 2;

  constructor(
    scene: Phaser.Scene,
    private readonly bounds: WorldBounds,
  ) {
    this.g = scene.add.graphics().setDepth(ATMOSPHERE.hudDepth).setScrollFactor(0);
  }

  draw(view: MapView): void {
    const { width, height, y, colors } = MINIMAP;
    const at = (x: number): number => this.left + mapX(x, this.bounds, width);
    const g = this.g;
    g.clear();
    // Dark strip with stone walls at both ends
    g.fillStyle(colors.back, 0.65);
    g.fillRoundedRect(this.left - 8, y - height / 2, width + 16, height, 6);
    g.fillStyle(colors.wall, 1);
    g.fillRect(this.left - 8, y - height / 2, 6, height);
    g.fillRect(this.left + width + 2, y - height / 2, 6, height);
    // The part you can see on the screen
    g.lineStyle(1.5, colors.screen, 0.6);
    const screenLeft = at(view.screenLeft);
    const screenRight = at(view.screenLeft + GAME_WIDTH);
    g.strokeRect(screenLeft, y - height / 2 + 2, screenRight - screenLeft, height - 4);
    // The door
    if (view.doorX !== null) {
      const dx = at(view.doorX);
      g.fillStyle(colors.door, 1);
      g.fillRect(dx - 4, y - 7, 8, 13);
      g.fillStyle(colors.doorFrame, 1);
      g.fillRect(dx - 5, y - 8, 10, 2);
    }
    // Keys still hidden, each in its own colour
    for (const key of view.keys) {
      g.fillStyle(key.color, 1);
      g.fillCircle(at(key.x), y - 2, 3.5);
    }
    // Enemies
    for (const enemy of view.enemies) {
      g.fillStyle(enemy.color, 1);
      g.fillCircle(at(enemy.x), y + 3, 3);
    }
    // You
    g.fillStyle(0x000000, 1);
    g.fillCircle(at(view.playerX), y, 5);
    g.fillStyle(colors.player, 1);
    g.fillCircle(at(view.playerX), y, 3.5);
  }
}
