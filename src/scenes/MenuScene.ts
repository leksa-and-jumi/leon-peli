import Phaser from 'phaser';
import { browserStorage } from '../browserStorage';
import { DIFFICULTIES, GAME_HEIGHT, GAME_WIDTH, MENU } from '../config';
import type { Difficulty } from '../logic/difficulty';
import { loadSave } from '../logic/save';
import { Atmosphere } from '../objects/Atmosphere';
import { DemoBattle } from '../objects/DemoBattle';
import { RuinsBackground } from '../objects/RuinsBackground';

/**
 * The start menu: pick Easy, Normal, Hard, Super hard or Test (or press 1–5).
 * Behind it a battle plays by itself, like a video of the game.
 */
export class MenuScene extends Phaser.Scene {
  private best: Record<string, number> = {};
  private unfinished = new Set<string>();

  constructor() {
    super('MenuScene');
  }

  create(): void {
    const save = loadSave(browserStorage());
    this.best = save.best;
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

    const keyboard = this.input.keyboard;
    levels.forEach((level, i) => {
      keyboard?.on(`keydown-${['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE'][i] ?? ''}`, () => {
        this.start(level);
      });
    });
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
    // This level's best score
    this.add
      .text(
        x + width / 2 - 12,
        y,
        // ▶️ means a game here is waiting to be continued
        `${this.unfinished.has(level) ? '▶️ ' : ''}🏆 ${String(this.best[level] ?? 0)}`,
        {
          fontSize: '16px',
          color: MENU.textColor,
        },
      )
      .setOrigin(1, 0.5)
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
