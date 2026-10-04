import Phaser from 'phaser';
import { browserStorage } from '../browserStorage';
import { DIFFICULTIES, GAME_HEIGHT, GAME_WIDTH, MENU } from '../config';
import type { Difficulty } from '../logic/difficulty';
import { loadSave, resetSave, writeSave } from '../logic/save';
import { Atmosphere } from '../objects/Atmosphere';
import { DemoBattle } from '../objects/DemoBattle';
import { RuinsBackground } from '../objects/RuinsBackground';

/**
 * The start menu: pick Easy, Normal, Hard, Super hard or Test (or press 1–5).
 * Behind it a battle plays by itself, like a video of the game.
 */
export class MenuScene extends Phaser.Scene {
  private best: Record<string, number> = {};
  private stages: Record<string, number> = {};
  private crowns: Record<string, number> = {};
  private unfinished = new Set<string>();

  constructor() {
    super('MenuScene');
  }

  create(): void {
    const save = loadSave(browserStorage());
    this.best = save.best;
    this.stages = save.stages;
    this.crowns = save.crowns;
    this.unfinished = new Set(Object.keys(save.runs));
    const atmosphere = new Atmosphere(this);
    new RuinsBackground(this, atmosphere);
    new DemoBattle(this);
    atmosphere.addVignette(MENU.depth - 1);
    this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, MENU.dimAlpha)
      .setDepth(MENU.depth - 1);

    const cx = GAME_WIDTH / 2;
    this.add
      .text(cx, 85, MENU.title, {
        fontSize: '64px',
        color: MENU.textColor,
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 8,
      })
      .setOrigin(0.5)
      .setDepth(MENU.depth);
    this.add
      .text(cx, 145, MENU.subtitle, {
        fontSize: '22px',
        color: MENU.textColor,
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(MENU.depth);

    const levels: Difficulty[] = ['easy', 'normal', 'hard', 'superHard', 'test'];
    const { height, gap } = MENU.button;
    levels.forEach((level, i) => {
      this.addLevelButton(level, cx, 200 + i * (height + gap));
    });

    this.addResetButton();

    const keyboard = this.input.keyboard;
    levels.forEach((level, i) => {
      keyboard?.on(`keydown-${['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE'][i] ?? ''}`, () => {
        this.start(level);
      });
    });
  }

  /** A small button that starts the whole game over. It asks first! */
  private addResetButton(): void {
    const { x, y, width, height, color, hoverColor } = MENU.reset;
    const button = this.add
      .rectangle(x, y, width, height, color, 0.92)
      .setStrokeStyle(2, 0xffffff)
      .setDepth(MENU.depth)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(x, y, '🔄 Start over / Alusta', { fontSize: '16px', color: MENU.textColor })
      .setOrigin(0.5)
      .setDepth(MENU.depth);
    button.on('pointerover', () => button.setFillStyle(hoverColor));
    button.on('pointerout', () => button.setFillStyle(color));
    button.on('pointerdown', () => {
      this.askReset();
    });
  }

  /** "Are you sure?" — Yes erases everything and starts fresh, No closes the question. */
  private askReset(): void {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    const depth = MENU.depth + 10;
    const parts: Phaser.GameObjects.GameObject[] = [];
    // A dark layer that also stops clicks reaching the level buttons
    parts.push(
      this.add
        .rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.6)
        .setDepth(depth)
        .setInteractive(),
    );
    parts.push(
      this.add
        .rectangle(cx, cy, 460, 230, 0x1b1533, 0.97)
        .setStrokeStyle(4, 0xc62828)
        .setDepth(depth),
    );
    parts.push(
      this.add
        .text(
          cx,
          cy - 50,
          '⚠️ Start the whole game over?\nAll stages, records and guns are lost!\n\nAloitetaanko koko peli alusta?\nKaikki tasot, ennätykset ja aseet häviävät!',
          { fontSize: '17px', color: MENU.textColor, align: 'center' },
        )
        .setOrigin(0.5)
        .setDepth(depth),
    );
    const close = (): void => {
      for (const p of parts) p.destroy();
    };
    const choice = (x: number, label: string, color: number, onClick: () => void): void => {
      const b = this.add
        .rectangle(x, cy + 70, 170, 44, color)
        .setStrokeStyle(2, 0xffffff)
        .setDepth(depth)
        .setInteractive({ useHandCursor: true });
      const t = this.add
        .text(x, cy + 70, label, { fontSize: '17px', color: MENU.textColor })
        .setOrigin(0.5)
        .setDepth(depth);
      b.on('pointerdown', onClick);
      parts.push(b, t);
    };
    choice(cx - 100, '✅ Yes / Kyllä', 0xc62828, () => {
      writeSave(browserStorage(), resetSave(loadSave(browserStorage())));
      this.scene.restart();
    });
    choice(cx + 100, '❌ No / Ei', 0x2e7d32, close);
  }

  private addLevelButton(level: Difficulty, x: number, y: number): void {
    const { label, emoji } = DIFFICULTIES[level];
    const { width, height, color, hoverColor } = MENU.button;
    const button = this.add
      .rectangle(x, y, width, height, color, 0.92)
      .setStrokeStyle(3, 0xffd54f)
      .setDepth(MENU.depth);
    this.add
      .text(x - width / 2 + 18, y, emoji, { fontSize: '34px' })
      .setOrigin(0, 0.5)
      .setDepth(MENU.depth);
    this.add
      .text(x + 5, y, label, {
        fontSize: '20px',
        color: MENU.textColor,
        fontStyle: 'bold',
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(MENU.depth);
    // This level's best score, in the button
    this.add
      .text(x + width / 2 - 12, y, `🏆 ${String(this.best[level] ?? 0)}`, {
        fontSize: '16px',
        color: MENU.textColor,
      })
      .setOrigin(1, 0.5)
      .setDepth(MENU.depth);
    // Next to the button: ▶️ a game waiting to be continued, 🚪 the stage reached,
    // 👑 treasures found behind door 10
    const extras = [
      this.unfinished.has(level) ? '▶️' : '',
      (this.stages[level] ?? 1) > 1 ? `🚪${String(this.stages[level])}` : '',
      (this.crowns[level] ?? 0) > 0 ? `👑${String(this.crowns[level])}` : '',
    ]
      .filter((t) => t !== '')
      .join(' ');
    this.add
      .text(x + width / 2 + 12, y, extras, {
        fontSize: '18px',
        color: MENU.textColor,
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setOrigin(0, 0.5)
      .setDepth(MENU.depth);
    button.setInteractive({ useHandCursor: true });
    button.on('pointerover', () => button.setFillStyle(hoverColor, 0.92));
    button.on('pointerout', () => button.setFillStyle(color, 0.92));
    button.on('pointerdown', () => {
      this.start(level);
    });
  }

  private start(level: Difficulty): void {
    this.scene.start('MainScene', { difficulty: level });
  }
}
