import Phaser from 'phaser';
import { LIANAS } from '../config';
import { ropeEnd, type Spot } from '../logic/liana';

/** The vines hanging from the branch. They sway a little, and the one you hold swings with you. */
export class Lianas {
  private readonly g: Phaser.GameObjects.Graphics;
  private timeMs = 0;

  constructor(scene: Phaser.Scene) {
    this.g = scene.add.graphics();
  }

  /** The end of vine `index`, leaning by `angle`. */
  end(index: number, angle: number): Spot {
    const anchor = LIANAS.anchors[index] ?? { x: 0, y: 0 };
    return ropeEnd(anchor, LIANAS.length, angle);
  }

  /** How far a vine nobody holds leans right now (a gentle sway). */
  idleAngle(index: number): number {
    return Math.sin(this.timeMs / 900 + index * 1.7) * 0.04;
  }

  /** Draw all vines; `held` is the one being swung and how far it leans. */
  draw(deltaMs: number, held: { index: number; angle: number } | null): void {
    this.timeMs += deltaMs;
    const { vine, leaf } = LIANAS.colors;
    this.g.clear();
    LIANAS.anchors.forEach((anchor, index) => {
      const angle = held?.index === index ? held.angle : this.idleAngle(index);
      const end = this.end(index, angle);
      // A slightly wavy vine from the branch to the end
      this.g.lineStyle(4, vine, 1);
      this.g.beginPath();
      this.g.moveTo(anchor.x, anchor.y);
      const steps = 12;
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const wave = Math.sin(t * Math.PI * 3 + this.timeMs / 400) * 3 * (1 - t);
        this.g.lineTo(anchor.x + (end.x - anchor.x) * t + wave, anchor.y + (end.y - anchor.y) * t);
      }
      this.g.strokePath();
      // Leaves along it and a knot at the end to hold on to
      this.g.fillStyle(leaf, 1);
      for (let i = 2; i < steps; i += 2) {
        const t = i / steps;
        const side = i % 4 === 0 ? 1 : -1;
        this.g.fillEllipse(
          anchor.x + (end.x - anchor.x) * t + side * 5,
          anchor.y + (end.y - anchor.y) * t,
          9,
          5,
        );
      }
      this.g.fillStyle(vine, 1);
      this.g.fillCircle(end.x, end.y, 5);
    });
  }
}
