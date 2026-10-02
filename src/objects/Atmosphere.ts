import Phaser from 'phaser';
import { ATMOSPHERE, GAME_HEIGHT, GAME_WIDTH, RUINS } from '../config';

/** Something that drifts slowly sideways and comes back from the other side. */
interface Drifter {
  shape: Phaser.GameObjects.Graphics;
  speed: number;
  width: number;
}

/**
 * Things in the night that move: clouds sliding over the moon, stars that
 * twinkle, and mist drifting over the ground. Plus darker screen edges.
 */
export class Atmosphere {
  private readonly drifters: Drifter[] = [];

  constructor(private readonly scene: Phaser.Scene) {
    scene.events.on('update', this.tick, this);
    scene.events.once('shutdown', () => {
      scene.events.off('update', this.tick, this);
    });
  }

  /** Stars that slowly glow brighter and dimmer. Kept away from the moon. */
  addTwinklingStars(): void {
    const { count, maxY } = ATMOSPHERE.stars;
    const { x: moonX, y: moonY, radius } = RUINS.moon;
    let made = 0;
    while (made < count) {
      const x = Math.random() * GAME_WIDTH;
      const y = Math.random() * maxY;
      if (Math.hypot(x - moonX, y - moonY) < radius * 2.5) continue;
      const star = this.scene.add.circle(x, y, 1 + Math.random() * 0.8, 0xffffff, 0.2);
      this.scene.tweens.add({
        targets: star,
        alpha: 0.6 + Math.random() * 0.4,
        duration: 600 + Math.random() * 1800,
        yoyo: true,
        repeat: -1,
        delay: Math.random() * 2000,
        ease: 'Sine.easeInOut',
      });
      made += 1;
    }
  }

  /** Dark clouds sliding slowly across the sky, sometimes over the moon. */
  addClouds(): void {
    const { count, color, alpha, minY, maxY } = ATMOSPHERE.clouds;
    for (let i = 0; i < count; i++) {
      const g = this.scene.add.graphics();
      const width = 120 + Math.random() * 140;
      g.fillStyle(color, alpha);
      for (let k = 0; k < 6; k++) {
        g.fillEllipse(
          (k / 5) * width - width / 2,
          (Math.random() - 0.5) * 14,
          50 + Math.random() * 50,
          18 + Math.random() * 16,
        );
      }
      g.setPosition(Math.random() * (GAME_WIDTH + width), minY + Math.random() * (maxY - minY));
      this.drifters.push({ shape: g, speed: 6 + Math.random() * 10, width });
    }
  }

  /** Thin mist floating over the ground. */
  addGroundMist(): void {
    const { count, color, alpha } = ATMOSPHERE.mist;
    for (let i = 0; i < count; i++) {
      const g = this.scene.add.graphics();
      const width = 260 + Math.random() * 200;
      g.fillStyle(color, alpha);
      g.fillEllipse(0, 0, width, 40);
      g.fillEllipse(width * 0.2, -8, width * 0.6, 26);
      g.setPosition(Math.random() * GAME_WIDTH, RUINS.groundY - 10 + Math.random() * 40);
      this.drifters.push({ shape: g, speed: 8 + Math.random() * 8, width });
    }
  }

  /** Darker edges around the screen, like an old camera. Drawn above the game, under the texts. */
  addVignette(depth: number): void {
    const { size, alpha } = ATMOSPHERE.vignette;
    const g = this.scene.add.graphics().setDepth(depth);
    const black = 0x000000;
    g.fillGradientStyle(black, black, black, black, alpha, 0, alpha, 0);
    g.fillRect(0, 0, size, GAME_HEIGHT);
    g.fillGradientStyle(black, black, black, black, 0, alpha, 0, alpha);
    g.fillRect(GAME_WIDTH - size, 0, size, GAME_HEIGHT);
    g.fillGradientStyle(black, black, black, black, alpha, alpha, 0, 0);
    g.fillRect(0, 0, GAME_WIDTH, size);
    g.fillGradientStyle(black, black, black, black, 0, 0, alpha, alpha);
    g.fillRect(0, GAME_HEIGHT - size, GAME_WIDTH, size);
  }

  private tick(_time: number, deltaMs: number): void {
    for (const d of this.drifters) {
      d.shape.x += (d.speed * deltaMs) / 1000;
      if (d.shape.x - d.width / 2 > GAME_WIDTH) d.shape.x = -d.width / 2;
    }
  }
}
