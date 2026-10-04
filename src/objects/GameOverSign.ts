import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_OVER, GAME_WIDTH } from '../config';

/** "You died" sign in the middle of the screen, with an OK button back to the menu. */
export function showGameOverSign(
  scene: Phaser.Scene,
  onOk: () => void,
  /** The score, if it was a new record for this level. */
  newRecord: number | null = null,
  /** A short line at the top, like "everything is saved". */
  note: string | null = null,
): void {
  const { panel, button } = GAME_OVER;
  const cx = GAME_WIDTH / 2;
  const cy = GAME_HEIGHT / 2;

  // Darken the whole game a little so the sign stands out
  const dim = scene.add.rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x000000, GAME_OVER.dimAlpha);

  const box = scene.add.graphics();
  box.fillStyle(panel.color, panel.alpha);
  box.fillRoundedRect(cx - panel.width / 2, cy - panel.height / 2, panel.width, panel.height, 18);
  box.lineStyle(4, panel.border, 1);
  box.strokeRoundedRect(cx - panel.width / 2, cy - panel.height / 2, panel.width, panel.height, 18);

  const skull = scene.add.text(cx, cy - 70, '💀', { fontSize: '56px' }).setOrigin(0.5);
  const text = scene.add
    .text(cx, cy + 5, GAME_OVER.text, {
      fontSize: '30px',
      color: GAME_OVER.textColor,
      align: 'center',
      fontStyle: 'bold',
    })
    .setOrigin(0.5);

  const buttonY = cy + panel.height / 2 - button.height / 2 - 24;
  const ok = scene.add
    .rectangle(cx, buttonY, button.width, button.height, button.color)
    .setStrokeStyle(3, panel.border)
    .setInteractive({ useHandCursor: true });
  const okText = scene.add
    .text(cx, buttonY, 'OK', { fontSize: '28px', color: GAME_OVER.textColor, fontStyle: 'bold' })
    .setOrigin(0.5);
  const extras: Phaser.GameObjects.Text[] = [];
  if (newRecord !== null) {
    extras.push(
      scene.add
        .text(cx, cy + 56, `🏆 New record! / Uusi ennätys! ${String(newRecord)}`, {
          fontSize: '18px',
          color: GAME_OVER.recordColor,
          fontStyle: 'bold',
        })
        .setOrigin(0.5),
    );
  }

  if (note !== null) {
    extras.push(
      scene.add
        .text(cx, cy - panel.height / 2 + 30, note, {
          fontSize: '15px',
          color: GAME_OVER.recordColor,
          align: 'center',
        })
        .setOrigin(0.5),
    );
  }

  // Above everything, and it stays on the screen however far you walked
  for (const o of [dim, box, skull, text, ok, okText, ...extras]) {
    o.setDepth(GAME_OVER.depth).setScrollFactor(0);
  }
  ok.on('pointerover', () => ok.setFillStyle(button.hoverColor));
  ok.on('pointerout', () => ok.setFillStyle(button.color));
  ok.on('pointerdown', onOk);
}
