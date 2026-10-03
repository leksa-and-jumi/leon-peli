import Phaser from 'phaser';
import {
  COLOR_ITEMS,
  GAME_HEIGHT,
  GAME_WIDTH,
  OUTFITS,
  SHOP,
  SHOP_ITEMS,
  type OutfitId,
} from '../config';
import { canAfford, type ShopItem } from '../logic/shop';
import { formatScore } from '../logic/score';

/** What the shop needs from the game: the points, and a way to buy. */
export interface ShopData {
  getScore: () => number;
  /** Does the player already have this (for things you buy only once)? */
  owns: (item: ShopItem) => boolean;
  /** Does the player have what this item needs first? */
  hasNeeded: (item: ShopItem) => boolean;
  /** Returns true if the item was bought. */
  purchase: (item: ShopItem) => boolean;
  /** Is the player wearing these clothes right now? */
  wears: (item: ShopItem) => boolean;
  /** Put on clothes the player already owns. */
  wear: (item: ShopItem) => void;
  /** `keyTime` is the time of the K press that closed the shop, if K was used. */
  onClose: (keyTime?: number) => void;
}

/**
 * The shop opens on top of the game with K. The game waits while you shop.
 * Press K again or ✖ to go back.
 */
export class ShopScene extends Phaser.Scene {
  private data_!: ShopData;
  private content!: Phaser.GameObjects.Container;

  constructor() {
    super('ShopScene');
  }

  create(data: ShopData): void {
    this.data_ = data;
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    const { panel } = SHOP;

    this.add.rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x000000, SHOP.dimAlpha);
    const box = this.add.graphics();
    const left = cx - panel.width / 2;
    const top = cy - panel.height / 2;
    box.fillStyle(panel.color, panel.alpha);
    box.fillRoundedRect(left, top, panel.width, panel.height, 18);
    box.lineStyle(4, panel.border, 1);
    box.strokeRoundedRect(left, top, panel.width, panel.height, 18);

    this.add
      .text(left + 24, top + 20, '🛒 Shop / Kauppa', {
        fontSize: '28px',
        color: SHOP.textColor,
        fontStyle: 'bold',
      })
      .setOrigin(0, 0);

    const close = this.add
      .text(left + panel.width - 20, top + 16, '✖', { fontSize: '30px', color: SHOP.textColor })
      .setOrigin(1, 0)
      .setInteractive({ useHandCursor: true });
    close.on('pointerdown', () => {
      this.close();
    });
    this.add
      .text(cx, top + panel.height - 18, 'K = back / takaisin', {
        fontSize: '16px',
        color: SHOP.dimTextColor,
      })
      .setOrigin(0.5, 1);

    this.content = this.add.container(0, 0);
    this.drawContent();

    this.input.keyboard?.on('keydown-K', (event: KeyboardEvent) => {
      this.close(event.timeStamp);
    });
  }

  private close(keyTime?: number): void {
    this.scene.stop();
    this.data_.onClose(keyTime);
  }

  /** Points and items. Drawn again after every purchase. */
  private drawContent(): void {
    this.content.removeAll(true);
    const { panel, rowHeight, buyButton } = SHOP;
    const left = GAME_WIDTH / 2 - panel.width / 2;
    const top = GAME_HEIGHT / 2 - panel.height / 2;
    const score = this.data_.getScore();

    this.content.add(
      this.add
        .text(left + panel.width - 64, top + 22, formatScore(score), {
          fontSize: '26px',
          color: SHOP.textColor,
          fontStyle: 'bold',
        })
        .setOrigin(1, 0),
    );

    SHOP_ITEMS.forEach((item: ShopItem, i) => {
      const y = top + SHOP.firstRowY + i * rowHeight;
      this.content.add(
        this.add.text(left + 30, y, item.emoji, { fontSize: SHOP.emojiSize }).setOrigin(0, 0.5),
      );
      this.content.add(
        this.add
          .text(left + 80, y, item.name, { fontSize: SHOP.nameSize, color: SHOP.textColor })
          .setOrigin(0, 0.5),
      );
      const buttonX = left + panel.width - 30 - buyButton.width / 2;

      if (item.onlyOnce === true && this.data_.owns(item)) {
        if (item.outfit !== undefined && !this.data_.wears(item)) {
          // Clothes you own but aren't wearing: put them on for free
          this.addButton(buttonX, y, '👕 wear / pue', SHOP.wearButton, () => {
            this.data_.wear(item);
          });
          return;
        }
        const text = item.outfit !== undefined ? '✅ on / päällä' : '✅ yours / sinun';
        this.content.add(
          this.add
            .text(buttonX, y, text, { fontSize: '16px', color: SHOP.textColor })
            .setOrigin(0.5),
        );
        return;
      }

      if (!this.data_.hasNeeded(item)) {
        this.content.add(
          this.add
            .text(buttonX, y, '🔫 first / ensin', { fontSize: '16px', color: SHOP.dimTextColor })
            .setOrigin(0.5),
        );
        return;
      }

      const affordable = canAfford(score, item);
      this.addButton(buttonX, y, `⭐ ${String(item.price)}`, affordable ? buyButton : null, () => {
        this.data_.purchase(item);
      });
    });

    this.drawColors(left, top + SHOP.firstRowY + SHOP_ITEMS.length * rowHeight - 12, score);
  }

  /** One-color clothes as a row of color squares. */
  private drawColors(left: number, y: number, score: number): void {
    const { size, gap, worn } = SHOP.swatch;
    const price = COLOR_ITEMS[0]?.price ?? 0;
    this.content.add(
      this.add
        .text(left + 30, y, `👕 Colors / Värit   ⭐ ${String(price)}`, {
          fontSize: '20px',
          color: SHOP.textColor,
        })
        .setOrigin(0, 0.5),
    );
    const rowWidth = COLOR_ITEMS.length * size + (COLOR_ITEMS.length - 1) * gap;
    const startX = GAME_WIDTH / 2 - rowWidth / 2 + size / 2;
    const swatchY = y + 40;

    COLOR_ITEMS.forEach((item, i) => {
      const outfit = item.outfit !== undefined ? OUTFITS[item.outfit as OutfitId] : undefined;
      if (outfit?.kind !== 'solid') return;
      const x = startX + i * (size + gap);
      const owned = this.data_.owns(item);
      const wearing = this.data_.wears(item);
      const usable = owned || canAfford(score, item);

      const square = this.add
        .rectangle(x, swatchY, size, size, outfit.color)
        .setStrokeStyle(wearing ? 4 : 2, wearing ? worn : 0x9e9e9e)
        .setAlpha(usable ? 1 : 0.35);
      this.content.add(square);
      if (owned) {
        this.content.add(
          this.add
            .text(x, swatchY + size / 2 + 12, wearing ? '⭐' : '✅', {
              fontSize: '14px',
            })
            .setOrigin(0.5),
        );
      }
      if (!usable || wearing) return;

      square.setInteractive({ useHandCursor: true });
      square.on('pointerdown', () => {
        if (owned) this.data_.wear(item);
        else this.data_.purchase(item);
        this.drawContent();
      });
    });
  }

  /** A button. `style` null means grey and not clickable. */
  private addButton(
    x: number,
    y: number,
    text: string,
    style: { width: number; height: number; color: number; hoverColor: number } | null,
    onClick: () => void,
  ): void {
    const { width, height, disabled } = SHOP.buyButton;
    const button = this.add.rectangle(x, y, width, height, style?.color ?? disabled);
    const label = this.add
      .text(x, y, text, {
        fontSize: text.length > 6 ? '15px' : '22px',
        color: SHOP.textColor,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.content.add([button, label]);
    if (!style) return;
    button.setInteractive({ useHandCursor: true });
    button.on('pointerover', () => button.setFillStyle(style.hoverColor));
    button.on('pointerout', () => button.setFillStyle(style.color));
    button.on('pointerdown', () => {
      onClick();
      this.drawContent();
    });
  }
}
