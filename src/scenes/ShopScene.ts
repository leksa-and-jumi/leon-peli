import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, SHOP, SHOP_ITEMS } from '../config';
import { canAfford, type ShopItem } from '../logic/shop';
import { formatScore } from '../logic/score';

/** What the shop needs from the game: the points, and a way to buy. */
export interface ShopData {
  getScore: () => number;
  /** Returns true if the item was bought. */
  purchase: (item: ShopItem) => boolean;
  /** `keyTime` is the time of the S press that closed the shop, if S was used. */
  onClose: (keyTime?: number) => void;
}

/**
 * The shop opens on top of the game with S. The game waits while you shop.
 * Press S again or ✖ to go back.
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
      .text(cx, top + panel.height - 18, 'S = back / takaisin', {
        fontSize: '16px',
        color: SHOP.dimTextColor,
      })
      .setOrigin(0.5, 1);

    this.content = this.add.container(0, 0);
    this.drawContent();

    this.input.keyboard?.on('keydown-S', (event: KeyboardEvent) => {
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
      const y = top + 110 + i * rowHeight;
      const soon = item.comingSoon === true;
      const color = soon ? SHOP.dimTextColor : SHOP.textColor;
      this.content.add(
        this.add.text(left + 30, y, item.emoji, { fontSize: '40px' }).setOrigin(0, 0.5),
      );
      this.content.add(
        this.add.text(left + 90, y, item.name, { fontSize: '20px', color }).setOrigin(0, 0.5),
      );

      const buttonX = left + panel.width - 30 - buyButton.width / 2;
      if (soon) {
        this.content.add(
          this.add.text(buttonX, y, '🔒 soon / pian', { fontSize: '16px', color }).setOrigin(0.5),
        );
        return;
      }

      const affordable = canAfford(score, item);
      const button = this.add.rectangle(
        buttonX,
        y,
        buyButton.width,
        buyButton.height,
        affordable ? buyButton.color : buyButton.disabled,
      );
      const label = this.add
        .text(buttonX, y, `⭐ ${String(item.price)}`, {
          fontSize: '22px',
          color: SHOP.textColor,
          fontStyle: 'bold',
        })
        .setOrigin(0.5);
      this.content.add([button, label]);
      if (!affordable) return;

      button.setInteractive({ useHandCursor: true });
      button.on('pointerover', () => button.setFillStyle(buyButton.hoverColor));
      button.on('pointerout', () => button.setFillStyle(buyButton.color));
      button.on('pointerdown', () => {
        if (this.data_.purchase(item)) this.drawContent();
      });
    });
  }
}
