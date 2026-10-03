import Phaser from 'phaser';
import { DIFFICULTIES, GAME_HEIGHT, GAME_WIDTH, MENU } from '../config';
import type { Difficulty } from '../logic/difficulty';
import { Atmosphere } from '../objects/Atmosphere';
import { RuinsBackground } from '../objects/RuinsBackground';

/** The start menu: pick Easy, Normal or Hard (or press 1, 2 or 3). */
export class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  create(): void {
    const atmosphere = new Atmosphere(this);
    new RuinsBackground(this, atmosphere);
    atmosphere.addVignette(0);
    this.add.rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      GAME_WIDTH,
      GAME_HEIGHT,
      0x000000,
      MENU.dimAlpha,
    );

    const cx = GAME_WIDTH / 2;
    this.add
      .text(cx, 95, MENU.title, {
        fontSize: '64px',
        color: MENU.textColor,
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 8,
      })
      .setOrigin(0.5);
    this.add
      .text(cx, 160, MENU.subtitle, { fontSize: '22px', color: MENU.textColor })
      .setOrigin(0.5);

    const levels: Difficulty[] = ['easy', 'normal', 'hard'];
    const { height, gap } = MENU.button;
    levels.forEach((level, i) => {
      this.addLevelButton(level, cx, 240 + i * (height + gap));
    });

    const keyboard = this.input.keyboard;
    levels.forEach((level, i) => {
      keyboard?.on(`keydown-${['ONE', 'TWO', 'THREE'][i] ?? ''}`, () => {
        this.start(level);
      });
    });
  }

  private addLevelButton(level: Difficulty, x: number, y: number): void {
    const { label, emoji } = DIFFICULTIES[level];
    const { width, height, color, hoverColor } = MENU.button;
    const button = this.add.rectangle(x, y, width, height, color).setStrokeStyle(3, 0xffd54f);
    this.add.text(x - width / 2 + 20, y, emoji, { fontSize: '36px' }).setOrigin(0, 0.5);
    this.add
      .text(x + 20, y, label, {
        fontSize: '22px',
        color: MENU.textColor,
        fontStyle: 'bold',
        align: 'center',
      })
      .setOrigin(0.5);
    button.setInteractive({ useHandCursor: true });
    button.on('pointerover', () => button.setFillStyle(hoverColor));
    button.on('pointerout', () => button.setFillStyle(color));
    button.on('pointerdown', () => {
      this.start(level);
    });
  }

  private start(level: Difficulty): void {
    this.scene.start('MainScene', { difficulty: level });
  }
}
