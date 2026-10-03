import Phaser from 'phaser';
import { LIANAS } from '../config';
import { ropeEnd, type Spot } from '../logic/liana';
import { drawLeaf } from './leaf';

/** Points along a vine, from the branch (t = 0) to the end (t = 1). */
const STEPS = 26;

/**
 * The woody jungle vines hanging from the branch. They sway a little, and the
 * one you hold swings with you, bending behind as it goes.
 */
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

  /**
   * Draw all vines; `held` is the one being swung: how far it leans and how fast
   * it's swinging (so it can bend behind).
   */
  draw(deltaMs: number, held: { index: number; angle: number; speed: number } | null): void {
    this.timeMs += deltaMs;
    this.g.clear();
    LIANAS.anchors.forEach((anchor, index) => {
      const isHeld = held?.index === index;
      const angle = isHeld ? held.angle : this.idleAngle(index);
      // Swinging fast, the middle of the vine lags behind; hanging still, it barely moves
      const bend = isHeld
        ? -held.speed * LIANAS.bend
        : Math.sin(this.timeMs / 700 + index * 2.3) * 2;
      this.drawVine(anchor, this.end(index, angle), bend, index);
    });
  }

  private drawVine(anchor: Spot, end: Spot, bend: number, index: number): void {
    const { wood, woodDark, strand, shine, leaf, leafLight, leafVein } = LIANAS.colors;
    const dx = end.x - anchor.x;
    const dy = end.y - anchor.y;
    const length = Math.hypot(dx, dy) || 1;
    // Sideways from the vine
    const px = -dy / length;
    const py = dx / length;
    const points: Spot[] = [];
    for (let i = 0; i <= STEPS; i++) {
      const t = i / STEPS;
      // Old vines have little kinks in them, always in the same places
      const kink = Math.sin(t * 9 + index * 4.1) * 2.5 * Math.sin(Math.PI * t);
      const sideways = bend * Math.sin(Math.PI * t) + kink;
      points.push({ x: anchor.x + dx * t + px * sideways, y: anchor.y + dy * t + py * sideways });
    }
    // Thick and woody at the top, thinner at the end
    const widthAt = (t: number): number => 7 - 3 * t;

    for (let i = 0; i < STEPS; i++) {
      const a = points[i];
      const b = points[i + 1];
      if (!a || !b) continue;
      const w = widthAt(i / STEPS);
      this.g.lineStyle(w + 2, woodDark, 1);
      this.g.lineBetween(a.x, a.y, b.x, b.y);
      this.g.lineStyle(w, wood, 1);
      this.g.lineBetween(a.x, a.y, b.x, b.y);
    }
    // A thinner green vine twisting around the woody one
    for (let i = 0; i < STEPS; i++) {
      const a = points[i];
      const b = points[i + 1];
      if (!a || !b) continue;
      const t = i / STEPS;
      const turn = t * 26 + index;
      if (Math.cos(turn) < 0) continue; // behind the woody vine
      const off = (s: number): number => Math.sin(s) * widthAt(t) * 0.45;
      const turnB = ((i + 1) / STEPS) * 26 + index;
      this.g.lineStyle(2.2, strand, 1);
      this.g.lineBetween(
        a.x + px * off(turn),
        a.y + py * off(turn),
        b.x + px * off(turnB),
        b.y + py * off(turnB),
      );
    }
    // Moonlight on one side
    this.g.lineStyle(1, shine, 0.45);
    for (let i = 0; i < STEPS; i++) {
      const a = points[i];
      const b = points[i + 1];
      if (!a || !b) continue;
      const o = widthAt(i / STEPS) * 0.3;
      this.g.lineBetween(a.x + px * o, a.y + py * o, b.x + px * o, b.y + py * o);
    }

    // Leaves on little stems, on both sides, gently fluttering
    const along = Math.atan2(dy, dx);
    const colors = { dark: leaf, light: leafLight, vein: leafVein };
    for (let i = 3; i < STEPS - 1; i += 3) {
      const p = points[i];
      if (!p) continue;
      const side = (i / 3) % 2 === 0 ? 1 : -1;
      const flutter = Math.sin(this.timeMs / 500 + i * 1.3 + index) * 0.15;
      const leafAngle = along - side * 1.1 + flutter;
      const stemX = p.x + Math.cos(leafAngle) * 4;
      const stemY = p.y + Math.sin(leafAngle) * 4;
      this.g.lineStyle(1.2, strand, 1);
      this.g.lineBetween(p.x, p.y, stemX, stemY);
      drawLeaf(this.g, stemX, stemY, leafAngle, 13 + ((i * 7) % 5), colors);
    }
    // Little curly tendrils
    this.g.lineStyle(1.2, strand, 1);
    for (let i = 5; i < STEPS - 2; i += 7) {
      const p = points[i];
      if (!p) continue;
      const side = i % 2 === 0 ? 1 : -1;
      this.g.beginPath();
      this.g.arc(p.x + px * side * 6, p.y + py * side * 6, 4, 0, Math.PI * 1.5, side < 0);
      this.g.strokePath();
    }

    // A knotted loop at the end to hold on to
    this.g.fillStyle(woodDark, 1);
    this.g.fillCircle(end.x, end.y, 6);
    this.g.fillStyle(wood, 1);
    this.g.fillCircle(end.x - 1, end.y - 1, 4.5);
    this.g.lineStyle(3, wood, 1);
    this.g.strokeCircle(end.x, end.y + 9, 5);
    drawLeaf(this.g, end.x + 3, end.y + 2, along + 0.9, 12, colors);
  }
}
