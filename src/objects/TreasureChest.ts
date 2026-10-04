import Phaser from 'phaser';
import { ATMOSPHERE, GAME_HEIGHT, GAME_WIDTH, TREASURE } from '../config';

/**
 * The treasure behind the last door: a big chest pops up in the middle of the screen,
 * its lid swings open, golden light shines out and stars and coins fly everywhere.
 */
export function showTreasure(scene: Phaser.Scene, points: number): void {
  const cx = GAME_WIDTH / 2;
  const cy = GAME_HEIGHT / 2 + 40;
  const depth = ATMOSPHERE.hudDepth + 20;
  const { wood, woodDark, gold, glow } = TREASURE.colors;
  const fixed = <
    T extends Phaser.GameObjects.Components.ScrollFactor & Phaser.GameObjects.Components.Depth,
  >(
    o: T,
  ): T => {
    o.setScrollFactor(0).setDepth(depth);
    return o;
  };

  const dim = fixed(scene.add.rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0));
  scene.tweens.add({ targets: dim, fillAlpha: 0.55, duration: 300 });

  // Golden light behind the chest, glowing bigger and smaller
  const light = fixed(scene.add.circle(cx, cy - 20, 90, glow, 0));
  scene.tweens.add({
    targets: light,
    fillAlpha: 0.45,
    scale: 1.4,
    duration: 700,
    delay: 500,
    yoyo: true,
    repeat: 2,
  });

  // The chest: a wooden box with gold bands and a lock
  const box = fixed(scene.add.graphics({ x: cx, y: cy }));
  // A heap of gold coins inside, peeking out once the lid is up
  box.fillStyle(gold, 1);
  for (let i = 0; i < 9; i++) box.fillCircle(-56 + i * 14, -22 - (i % 3) * 3, 9);
  box.fillStyle(wood, 1);
  box.fillRect(-70, -20, 140, 70);
  box.fillStyle(woodDark, 1);
  for (const y of [0, 22]) box.fillRect(-70, y, 140, 3);
  box.fillStyle(gold, 1);
  box.fillRect(-70, -20, 12, 70);
  box.fillRect(58, -20, 12, 70);
  box.fillRect(-12, -14, 24, 26);
  box.fillStyle(0x3e2723, 1);
  box.fillCircle(0, -4, 4);
  box.fillRect(-2, -2, 4, 8);
  // The lid, hinged at its back edge so it can swing open
  const lid = fixed(scene.add.graphics({ x: cx, y: cy - 20 }));
  lid.fillStyle(wood, 1);
  lid.fillRoundedRect(-72, -34, 144, 34, { tl: 30, tr: 30, bl: 0, br: 0 });
  lid.fillStyle(gold, 1);
  lid.fillRect(-72, -6, 144, 6);
  lid.fillRect(-60, -30, 10, 30);
  lid.fillRect(50, -30, 10, 30);
  // The chest drops in with a bounce, then the lid opens
  box.setScale(0);
  lid.setScale(0);
  scene.tweens.add({ targets: [box, lid], scale: 1, duration: 450, ease: 'Back.easeOut' });
  scene.tweens.add({
    targets: lid,
    y: cy - 75,
    x: cx - 25,
    angle: -25,
    duration: 400,
    delay: 550,
    ease: 'Back.easeOut',
  });

  // Stars and coins bursting out
  scene.time.delayedCall(650, () => {
    for (let i = 0; i < 24; i++) {
      const bit = fixed(
        scene.add.text(cx, cy - 30, i % 3 === 0 ? '🪙' : '⭐', { fontSize: '26px' }).setOrigin(0.5),
      );
      const angle = -Math.PI * (0.1 + Math.random() * 0.8);
      const distance = 120 + Math.random() * 200;
      scene.tweens.add({
        targets: bit,
        x: cx + Math.cos(angle) * distance,
        y: cy - 30 + Math.sin(angle) * distance,
        angle: (Math.random() - 0.5) * 360,
        alpha: 0,
        duration: 1200 + Math.random() * 600,
        ease: 'Quad.easeOut',
      });
    }
  });

  const title = fixed(
    scene.add
      .text(cx, cy - 170, '💎 TREASURE! / AARRE! 💎', {
        fontSize: '40px',
        color: '#ffd54f',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setAlpha(0),
  );
  const reward = fixed(
    scene.add
      .text(cx, cy + 90, `+${String(points)} ⭐   👑`, {
        fontSize: '36px',
        color: '#fff59d',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setAlpha(0),
  );
  scene.tweens.add({ targets: [title, reward], alpha: 1, duration: 400, delay: 700 });
}
