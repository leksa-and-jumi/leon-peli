import Phaser from 'phaser';
import { ATMOSPHERE, SPAWN_PANEL } from '../config';
import type { EnemyKind } from '../logic/spawn';

/**
 * The test level's buttons: a little picture of each enemy. Click one and that
 * enemy walks in, with all its own tricks.
 */
export function addSpawnPanel(scene: Phaser.Scene, onPick: (kind: EnemyKind) => void): void {
  const { x, y, size, gap, back, border } = SPAWN_PANEL;
  SPAWN_PANEL.kinds.forEach((entry, i) => {
    const cy = y + i * (size + gap);
    const button = scene.add
      .rectangle(x, cy, size, size, back, 0.85)
      .setStrokeStyle(2, border)
      .setScrollFactor(0)
      .setDepth(ATMOSPHERE.hudDepth)
      .setInteractive({ useHandCursor: true });
    const icon = scene.add.graphics({ x, y: cy }).setScrollFactor(0).setDepth(ATMOSPHERE.hudDepth);
    drawIcon(icon, entry.color, entry.weapon, entry.kind === 'brute');
    button.on('pointerover', () => button.setStrokeStyle(3, 0xffffff));
    button.on('pointerout', () => button.setStrokeStyle(2, border));
    button.on('pointerdown', () => {
      onPick(entry.kind);
    });
  });
}

/** A tiny stick figure in the enemy's colour, holding what it fights with. */
function drawIcon(
  g: Phaser.GameObjects.Graphics,
  color: number,
  weapon: 'gun' | 'axe' | 'club' | 'beret',
  thick: boolean,
): void {
  const line = thick ? 5 : 3;
  // A dark edge first so the white one shows too
  for (const [width, c] of [
    [line + 2, 0x000000],
    [line, color],
  ] as const) {
    g.lineStyle(width, c, 1);
    g.lineBetween(0, -8, 0, 6);
    g.lineBetween(0, 6, -6, 18);
    g.lineBetween(0, 6, 6, 18);
    g.lineBetween(0, -4, 9, -2);
    g.lineBetween(0, -4, -7, 2);
  }
  g.fillStyle(0x000000, 1);
  g.fillCircle(0, -14, 7);
  g.fillStyle(color, 1);
  g.fillCircle(0, -14, 6);
  if (weapon === 'gun' || weapon === 'beret') {
    g.fillStyle(0x333333, 1);
    g.fillRect(8, -6, 12, 4);
  }
  if (weapon === 'beret') {
    g.fillStyle(0xc62828, 1);
    g.fillEllipse(-1, -19, 14, 6);
  }
  if (weapon === 'axe') {
    g.lineStyle(2, 0x795548, 1);
    g.lineBetween(10, -2, 13, -20);
    g.fillStyle(0xbdbdbd, 1);
    g.fillTriangle(13, -20, 21, -24, 20, -12);
  }
  if (weapon === 'club') {
    g.lineStyle(5, 0x7a5233, 1);
    g.lineBetween(10, -2, 15, -22);
  }
}
