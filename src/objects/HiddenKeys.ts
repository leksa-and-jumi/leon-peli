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
      const view = scene.add.container(spot.x, spot.y, [drawKey(scene, color)]);
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

/** A chunky old key: a ring to hold, a long stem and teeth, with a soft glow. */
function drawKey(scene: Phaser.Scene, color: number): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  g.fillStyle(color, 0.25);
  g.fillCircle(0, 0, 22);
  g.lineStyle(5, color, 1);
  g.strokeCircle(-10, 0, 7);
  g.fillStyle(color, 1);
  g.fillRect(-3, -2.5, 22, 5);
  g.fillRect(12, 2, 4, 7);
  g.fillRect(17, 2, 3, 5);
  g.fillStyle(0xffffff, 0.8);
  g.fillCircle(-13, -3, 1.6);
  return g;
}
