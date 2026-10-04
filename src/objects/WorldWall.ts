import Phaser from 'phaser';
import { PLAYER, WORLD } from '../config';
import { createRandom } from '../logic/ruins';

/**
 * A huge crumbling ruin wall at the end of the world: you can't get past it.
 * `side` -1 is the left wall (its face points right), 1 the right one.
 */
export function drawWorldWall(scene: Phaser.Scene, faceX: number, side: 1 | -1): void {
  const { width, height, stone, dark, light, moss } = WORLD.wall;
  const random = createRandom(side === 1 ? 91 : 19);
  const g = scene.add.graphics();
  const base = PLAYER.feetY + 25;
  const left = side === 1 ? faceX : faceX - width;
  const blockW = 50;
  const blockH = 26;
  // Big stone blocks, every other row shifted like real masonry
  for (let row = 0; row * blockH < height; row++) {
    const y = base - (row + 1) * blockH;
    // Higher up, more blocks have fallen off the top
    const ragged = row * blockH > height - 140;
    const shift = row % 2 === 0 ? 0 : -blockW / 2;
    for (let x = left + shift; x < left + width; x += blockW) {
      const x0 = Math.max(x, left);
      const x1 = Math.min(x + blockW, left + width);
      if (ragged && random() < (row * blockH - (height - 140)) / 140) continue;
      const shade = random();
      g.fillStyle(shade < 0.3 ? dark : shade > 0.8 ? light : stone, 1);
      g.fillRect(x0, y, x1 - x0, blockH);
      g.lineStyle(2, dark, 1);
      g.strokeRect(x0, y, x1 - x0, blockH);
      // Cracks here and there
      if (random() < 0.2) {
        g.lineStyle(1.5, 0x3e3a33, 0.9);
        g.lineBetween(x0 + 10, y + 4, x0 + 22, y + blockH - 5);
      }
    }
  }
  // Moss creeping up from the bottom and hanging vines
  for (let i = 0; i < 60; i++) {
    g.fillStyle(moss, 0.4 + random() * 0.5);
    g.fillCircle(left + random() * width, base - random() * random() * height, 2 + random() * 4);
  }
  g.lineStyle(2.5, 0x3d5e2c, 1);
  for (let i = 0; i < 4; i++) {
    const x = left + 15 + random() * (width - 30);
    const top = base - height + 30 + random() * 60;
    g.lineBetween(x, top, x + (random() - 0.5) * 10, top + 120 + random() * 120);
  }
  // A heap of fallen stones in front of the wall
  for (let i = 0; i < 14; i++) {
    const x = faceX - side * (random() * 70);
    g.fillStyle(random() < 0.5 ? stone : dark, 1);
    g.fillEllipse(x, base - 4 - random() * 14, 18 + random() * 22, 12 + random() * 10);
  }
}
