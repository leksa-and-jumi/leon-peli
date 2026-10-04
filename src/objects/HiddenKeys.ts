import Phaser from 'phaser';
import { STAGES } from '../config';
import type { Box } from '../logic/bullets';
import { touches } from '../logic/bubbles';

interface HiddenKey {
  number: number;
  x: number;
  y: number;
  view: Phaser.GameObjects.Container;
}

/** The keys hidden around a stage. Each has its own colour; touch one and it's yours. */
export class HiddenKeys {
  private keys: HiddenKey[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    spots: readonly { x: number; y: number }[],
    /** Keys already found (by number) aren't there any more. */
    found: readonly number[],
    private readonly onFound: (number: number) => void,
  ) {
    spots.forEach((spot, number) => {
      if (found.includes(number)) return;
      const color = STAGES.keyColors[number % STAGES.keyColors.length] ?? 0xffd54f;
      const view = scene.add.container(spot.x, spot.y, [drawKey(scene, color, number)]);
      // It bobs gently and glints now and then
      scene.tweens.add({
        targets: view,
        y: spot.y - 8,
        duration: 900,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
      this.keys.push({ number, x: spot.x, y: spot.y, view });
    });
  }

  /** Every frame: pick up any key the player touches. */
  update(player: Box | null): void {
    if (!player) return;
    for (const key of [...this.keys]) {
      if (!touches({ x: key.x, y: key.view.y, radius: STAGES.keyRadius }, player)) continue;
      this.keys = this.keys.filter((k) => k !== key);
      // Fly up and vanish with a sparkle
      this.scene.tweens.add({
        targets: key.view,
        y: key.view.y - 60,
        scale: 1.6,
        alpha: 0,
        duration: 500,
        onComplete: () => {
          key.view.destroy();
        },
      });
      this.onFound(key.number);
    }
  }
}

/**
 * A chunky old key with a soft glow. Every key number looks a bit different:
 * the handle can be a ring, a clover, a square, a heart or a diamond, and the
 * stem and teeth change too.
 */
function drawKey(scene: Phaser.Scene, color: number, number: number): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  g.fillStyle(color, 0.25);
  g.fillCircle(0, 0, 22);
  g.lineStyle(4, color, 1);
  g.fillStyle(color, 1);
  // The handle
  const bow = number % 5;
  const bx = -11;
  if (bow === 0) {
    g.strokeCircle(bx, 0, 7);
  } else if (bow === 1) {
    for (const [dx, dy] of [
      [0, -5],
      [-5, 3],
      [5, 3],
    ] as const) {
      g.strokeCircle(bx + dx, dy, 3.5);
    }
  } else if (bow === 2) {
    g.strokeRect(bx - 7, -7, 14, 14);
  } else if (bow === 3) {
    g.fillCircle(bx - 3.5, -2.5, 4.5);
    g.fillCircle(bx + 3.5, -2.5, 4.5);
    g.fillTriangle(bx - 8, -1, bx + 8, -1, bx, 8);
  } else {
    g.fillPoints(
      [
        new Phaser.Math.Vector2(bx, -9),
        new Phaser.Math.Vector2(bx + 8, 0),
        new Phaser.Math.Vector2(bx, 9),
        new Phaser.Math.Vector2(bx - 8, 0),
      ],
      true,
    );
  }
  // A little gem in the middle of some handles
  if (number % 2 === 1) {
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(bx, 0, 2);
    g.fillStyle(color, 1);
  }
  // The stem gets longer on some keys
  const stem = 18 + (number % 3) * 4;
  g.fillRect(-3, -2.5, stem + 3, 5);
  // Teeth: a different pattern for every key
  const pattern = ((number + 1) * 37) % 64;
  for (let t = 0; t < 3; t++) {
    const tall = 3 + ((pattern >> (t * 2)) & 3) * 2;
    g.fillRect(stem - 4 - t * 5, 2, 3.5, tall);
  }
  g.fillStyle(0xffffff, 0.8);
  g.fillCircle(bx - 3, -3, 1.4);
  return g;
}
