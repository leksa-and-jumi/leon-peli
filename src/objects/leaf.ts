import Phaser from 'phaser';

/**
 * A pointed leaf shape: starts at (x, y) and points along `angle`.
 * Round at the bottom, sharp at the tip, like a jungle leaf.
 */
export function leafPoints(
  x: number,
  y: number,
  angle: number,
  length: number,
  width: number,
): Phaser.Math.Vector2[] {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const at = (along: number, across: number): Phaser.Math.Vector2 =>
    new Phaser.Math.Vector2(x + along * cos - across * sin, y + along * sin + across * cos);
  const steps = 8;
  const side = (s: number): number =>
    (width / 2) * Math.pow(Math.sin(Math.PI * s), 0.7) * (1 - 0.3 * s);
  const points: Phaser.Math.Vector2[] = [];
  for (let i = 0; i <= steps; i++) points.push(at((i / steps) * length, side(i / steps)));
  for (let i = steps - 1; i > 0; i--) points.push(at((i / steps) * length, -side(i / steps)));
  return points;
}

/** Draws a two-tone leaf with a vein down the middle. */
export function drawLeaf(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  angle: number,
  size: number,
  colors: { dark: number; light: number; vein: number },
): void {
  const length = size;
  const width = size * 0.6;
  g.fillStyle(colors.dark, 1);
  g.fillPoints(leafPoints(x, y, angle, length, width), true);
  // The lit half is a slightly thinner leaf on top
  g.fillStyle(colors.light, 1);
  g.fillPoints(leafPoints(x, y, angle - 0.08, length * 0.92, width * 0.55), true);
  g.lineStyle(1, colors.vein, 0.8);
  g.lineBetween(x, y, x + Math.cos(angle) * length * 0.85, y + Math.sin(angle) * length * 0.85);
}
