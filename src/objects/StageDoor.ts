import Phaser from 'phaser';
import { COLORS, PLAYER, STAGES } from '../config';

/**
 * The way out to the next stage: a stone doorway with a heavy wooden door.
 * It stays locked until you have all the keys, then swings open with light behind it.
 */
export class StageDoor {
  private readonly door: Phaser.GameObjects.Graphics;
  private readonly sign: Phaser.GameObjects.Text;
  private open = false;

  constructor(
    private readonly scene: Phaser.Scene,
    readonly x: number,
  ) {
    const { width, height, stone, stoneDark, light } = STAGES.door;
    const ground = PLAYER.feetY;
    const frame = scene.add.graphics();
    // Light that shines out once the door opens
    frame.fillStyle(light, 1);
    frame.fillRect(x - width / 2 + 12, ground - height + 12, width - 24, height - 12);
    // Stone pillars and a stone top around the door
    frame.fillStyle(stone, 1);
    frame.fillRect(x - width / 2 - 16, ground - height, 18, height);
    frame.fillRect(x + width / 2 - 2, ground - height, 18, height);
    frame.fillRect(x - width / 2 - 22, ground - height - 18, width + 44, 22);
    frame.lineStyle(2, stoneDark, 1);
    for (let y = ground - height + 20; y < ground; y += 24) {
      frame.lineBetween(x - width / 2 - 16, y, x - width / 2 + 2, y);
      frame.lineBetween(x + width / 2 - 2, y, x + width / 2 + 16, y);
    }
    frame.strokeRect(x - width / 2 - 22, ground - height - 18, width + 44, 22);
    // The door itself, drawn from its hinge on the left so it can swing open
    this.door = scene.add.graphics({ x: x - width / 2 + 2, y: ground });
    this.drawDoor();
    this.sign = scene.add
      .text(x, ground - height - 40, '', {
        fontSize: '18px',
        color: COLORS.text,
        align: 'center',
        backgroundColor: '#3e2723',
        padding: { x: 8, y: 4 },
      })
      .setOrigin(0.5, 1)
      .setVisible(false);
  }

  private drawDoor(): void {
    const { width, height, wood, woodDark, iron } = STAGES.door;
    const w = width - 4;
    const g = this.door;
    g.fillStyle(wood, 1);
    g.fillRect(0, -height + 4, w, height - 4);
    // Planks and iron bands
    g.lineStyle(2, woodDark, 1);
    for (let px = w / 4; px < w; px += w / 4) g.lineBetween(px, -height + 4, px, 0);
    g.fillStyle(iron, 1);
    g.fillRect(0, -height + 30, w, 8);
    g.fillRect(0, -40, w, 8);
    // A big lock with a keyhole
    g.fillStyle(0xb08d57, 1);
    g.fillRoundedRect(w - 30, -height / 2 - 18, 22, 30, 4);
    g.fillStyle(0x1a1a1a, 1);
    g.fillCircle(w - 19, -height / 2 - 6, 4);
    g.fillRect(w - 21, -height / 2 - 4, 4, 9);
  }

  /** Is the player standing at the door? */
  reaches(playerX: number): boolean {
    return Math.abs(playerX - this.x) < STAGES.doorReach;
  }

  /** Tell the player how many keys are still missing. */
  showNeedKeys(missing: number): void {
    const en = missing === 1 ? 'You need a key!' : `You need ${String(missing)} more keys!`;
    const fi = missing === 1 ? 'Tarvitset avaimen!' : `Tarvitset vielä ${String(missing)} avainta!`;
    this.sign.setText(`🔒 ${en}\n${fi}`).setVisible(true);
    this.scene.time.delayedCall(STAGES.signMs, () => {
      this.sign.setVisible(false);
    });
  }

  /** Swing the door open (the light shines out). */
  swingOpen(): void {
    if (this.open) return;
    this.open = true;
    this.sign.setVisible(false);
    this.scene.tweens.add({
      targets: this.door,
      scaleX: 0.15,
      duration: 500,
      ease: 'Quad.easeOut',
    });
  }
}
