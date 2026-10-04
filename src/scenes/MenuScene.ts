import Phaser from 'phaser';
import { browserStorage } from '../browserStorage';
import {
  DIFFICULTIES,
  GAME_HEIGHT,
  GAME_WIDTH,
  MENU,
  PLAYER,
  START_POINTS,
  STORY,
} from '../config';

import type { Difficulty } from '../logic/difficulty';
import {
  loadSave,
  newRun,
  resetSave,
  stageFor,
  weaponsFor,
  withRun,
  withWeapons,
  writeSave,
} from '../logic/save';
import {
  hasNeededItem,
  loadoutOf,
  ownsItem,
  purchaseItem,
  runWithLoadout,
  wearItem,
  type Loadout,
} from '../logic/loadout';
import type { ShopData } from './ShopScene';
import { Atmosphere } from '../objects/Atmosphere';
import { DemoBattle } from '../objects/DemoBattle';
import { RuinsBackground } from '../objects/RuinsBackground';

/** Levels you can shop for from the menu. */
const SHOP_LEVELS: readonly Difficulty[] = ['easy', 'normal', 'hard', 'superHard', 'test'];

/**
 * The start menu: pick Easy, Normal, Hard, Super hard, Test or Story (or press 1–6).
 * Behind it a battle plays by itself, like a video of the game.
 */
export class MenuScene extends Phaser.Scene {
  private best: Record<string, number> = {};
  private stages: Record<string, number> = {};
  private crowns: Record<string, number> = {};
  private storyChapter = 0;
  private medals = 0;
  private unfinished = new Set<string>();

  constructor() {
    super('MenuScene');
  }

  create(): void {
    const save = loadSave(browserStorage());
    this.best = save.best;
    this.stages = save.stages;
    this.crowns = save.crowns;
    this.storyChapter = save.story;
    this.medals = save.medals;
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

    const levels: Difficulty[] = ['easy', 'normal', 'hard', 'superHard', 'test', 'story'];
    const { height, gap } = MENU.button;
    levels.forEach((level, i) => {
      this.addLevelButton(level, cx, 200 + i * (height + gap));
    });

    this.addResetButton();
    this.addShopButton();

    const keyboard = this.input.keyboard;
    levels.forEach((level, i) => {
      keyboard?.on(`keydown-${['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX'][i] ?? ''}`, () => {
        this.start(level);
      });
    });
  }

  /** The same shop as in the game, opened from the menu: first pick whose stars to spend. */
  private addShopButton(): void {
    const { x, y, width, height, color, hoverColor } = MENU.shop;
    const button = this.add
      .rectangle(x, y, width, height, color, 0.92)
      .setStrokeStyle(2, 0xffd54f)
      .setDepth(MENU.depth)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(x, y, '🛒 Shop / Kauppa', { fontSize: '18px', color: MENU.textColor })
      .setOrigin(0.5)
      .setDepth(MENU.depth);
    button.on('pointerover', () => button.setFillStyle(hoverColor));
    button.on('pointerout', () => button.setFillStyle(color));
    button.on('pointerdown', () => {
      this.askShopLevel();
    });
  }

  /** Every level has its own stars and things: pick which level to shop for. */
  private askShopLevel(): void {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    const depth = MENU.depth + 10;
    const save = loadSave(browserStorage());
    const parts: Phaser.GameObjects.GameObject[] = [];
    parts.push(
      this.add
        .rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.6)
        .setDepth(depth)
        .setInteractive(),
    );
    parts.push(
      this.add
        .rectangle(cx, cy, 440, 400, 0x1b1533, 0.97)
        .setStrokeStyle(4, 0xffd54f)
        .setDepth(depth),
    );
    parts.push(
      this.add
        .text(cx, cy - 160, '🛒 Which level? / Mikä taso?', {
          fontSize: '22px',
          color: MENU.textColor,
        })
        .setOrigin(0.5)
        .setDepth(depth),
    );
    const close = (): void => {
      for (const p of parts) p.destroy();
    };
    SHOP_LEVELS.forEach((level, i) => {
      const y = cy - 105 + i * 52;
      const stars = save.runs[level]?.score ?? START_POINTS;
      const { emoji, label } = DIFFICULTIES[level];
      const b = this.add
        .rectangle(cx, y, 370, 44, MENU.button.color)
        .setStrokeStyle(2, 0xffd54f)
        .setDepth(depth)
        .setInteractive({ useHandCursor: true });
      const t = this.add
        .text(cx, y, `${emoji}  ${label.replace('\n', ' / ')}   ⭐ ${String(stars)}`, {
          fontSize: '16px',
          color: MENU.textColor,
        })
        .setOrigin(0.5)
        .setDepth(depth);
      b.on('pointerdown', () => {
        close();
        this.openShop(level);
      });
      parts.push(b, t);
    });
    const back = this.add
      .text(cx, cy + 172, '❌ Back / Takaisin', { fontSize: '18px', color: MENU.textColor })
      .setOrigin(0.5)
      .setDepth(depth)
      .setInteractive({ useHandCursor: true });
    back.on('pointerdown', close);
    parts.push(back);
  }

  /** Shop with a level's saved stars and things (a new game there if none is going on). */
  private openShop(level: Difficulty): void {
    const storage = browserStorage();
    const start = loadSave(storage);
    const run =
      start.runs[level] ??
      newRun(
        START_POINTS,
        PLAYER.lives,
        PLAYER.x,
        stageFor(start, level),
        Math.floor(Math.random() * 1e9),
      );
    let state = loadoutOf(run, weaponsFor(start, level), (start.crowns[level] ?? 0) > 0);
    // Every change is saved at once, so the game finds it when you play that level
    const keep = (next: Loadout): void => {
      state = next;
      let save = loadSave(storage);
      save = withRun(save, level, runWithLoadout(save.runs[level] ?? run, next));
      save = withWeapons(save, level, { rifle: next.rifle, rifleUpgrade: next.rifleUpgrade });
      writeSave(storage, save);
    };
    const data: ShopData = {
      getScore: () => state.score,
      owns: (item) => ownsItem(state, item),
      hasNeeded: (item) => hasNeededItem(state, item),
      purchase: (item) => {
        const next = purchaseItem(state, item);
        if (!next) return false;
        keep(next);
        return true;
      },
      wears: (item) => item.outfit === state.worn,
      wear: (item) => {
        keep(wearItem(state, item));
      },
      onClose: () => {
        // Start the menu again so ▶️ and the stars show what changed
        this.scene.resume();
        this.scene.restart();
      },
    };
    this.scene.launch('ShopScene', data);
    this.scene.pause();
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
    // This level's best score in the button (the story shows its chapter instead)
    const score =
      level === 'story'
        ? `📖 ${String(this.storyChapter + 1)}/${String(STORY.chapters.length)}`
        : `🏆 ${String(this.best[level] ?? 0)}`;
    this.add
      .text(x + width / 2 - 12, y, score, {
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
      // Medals for finishing the whole story
      level === 'story' && this.medals > 0 ? `🏅${String(this.medals)}` : '',
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
