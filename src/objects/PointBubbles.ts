import Phaser from 'phaser';
import { BUBBLES } from '../config';
import type { Box } from '../logic/bullets';
import { floatedAway, nextBubbleDelay, riseStep, touches, type Bubble } from '../logic/bubbles';

interface LiveBubble {
  state: Bubble;
  view: Phaser.GameObjects.Container;
}

/**
 * Now and then a shiny bubble with 3 points floats up through the air.
 * Touch it (walk, jump or swing into it) or click it to catch it; otherwise it floats away.
 */
export class PointBubbles {
  private bubbles: LiveBubble[] = [];
  private nextAt: number;

  constructor(
    private readonly scene: Phaser.Scene,
    /** Called when one is caught. */
    private readonly onCatch: () => void,
  ) {
    this.nextAt = scene.time.now + this.randomDelay();
  }

  private randomDelay(): number {
    return nextBubbleDelay(Math.random(), BUBBLES.minDelayMs, BUBBLES.maxDelayMs);
  }

  /** Every frame: maybe send up a new bubble, move them all, and catch the ones the player touches. */
  update(deltaMs: number, player: Box | null): void {
    if (this.scene.time.now >= this.nextAt) {
      this.spawn();
      this.nextAt = this.scene.time.now + this.randomDelay();
    }
    for (const b of [...this.bubbles]) {
      b.state = riseStep(b.state, deltaMs, BUBBLES.rise);
      b.view.setPosition(b.state.x, b.state.y);
      if (player && touches({ ...b.state, radius: BUBBLES.radius }, player)) {
        this.catch(b);
      } else if (floatedAway(b.state, BUBBLES.radius)) {
        this.remove(b);
      }
    }
  }

  private spawn(): void {
    const x = BUBBLES.minX + Math.random() * (BUBBLES.maxX - BUBBLES.minX);
    const state: Bubble = { baseX: x, x, y: BUBBLES.startY, age: 0, phase: Math.random() * 6 };
    const { radius, colors } = BUBBLES;
    // A see-through blue ball with a bright edge, a shine, and "3" in the middle
    const g = this.scene.add.graphics();
    g.fillStyle(colors.fill, 0.55);
    g.fillCircle(0, 0, radius);
    g.lineStyle(2.5, colors.edge, 0.9);
    g.strokeCircle(0, 0, radius);
    g.fillStyle(colors.shine, 0.7);
    g.fillEllipse(-radius * 0.38, -radius * 0.42, radius * 0.55, radius * 0.32);
    const label = this.scene.add
      .text(0, 1, String(BUBBLES.points), {
        fontSize: '22px',
        fontStyle: 'bold',
        color: colors.text,
        stroke: '#0d47a1',
        strokeThickness: 4,
      })
      .setOrigin(0.5);
    const view = this.scene.add
      .container(x, state.y, [g, label])
      .setDepth(BUBBLES.depth)
      .setSize(radius * 2, radius * 2)
      .setInteractive(new Phaser.Geom.Circle(radius, radius, radius), Phaser.Geom.Circle.Contains);
    const bubble: LiveBubble = { state, view };
    view.on('pointerdown', () => {
      if (this.bubbles.includes(bubble)) this.catch(bubble);
    });
    this.bubbles.push(bubble);
  }

  /** Pop! A ring bursts out and "+3" floats up. */
  private catch(b: LiveBubble): void {
    const { x, y } = b.state;
    this.remove(b);
    this.onCatch();
    const ring = this.scene.add.circle(x, y, BUBBLES.radius).setDepth(BUBBLES.depth);
    ring.setStrokeStyle(3, BUBBLES.colors.pop, 1);
    this.scene.tweens.add({
      targets: ring,
      scale: 2.2,
      alpha: 0,
      duration: 300,
      onComplete: () => {
        ring.destroy();
      },
    });
    const plus = this.scene.add
      .text(x, y, `+${String(BUBBLES.points)} ⭐`, {
        fontSize: '22px',
        fontStyle: 'bold',
        color: BUBBLES.colors.text,
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(BUBBLES.depth);
    this.scene.tweens.add({
      targets: plus,
      y: y - 50,
      alpha: 0,
      duration: 900,
      onComplete: () => {
        plus.destroy();
      },
    });
  }

  private remove(b: LiveBubble): void {
    this.bubbles = this.bubbles.filter((other) => other !== b);
    b.view.destroy();
  }
}
