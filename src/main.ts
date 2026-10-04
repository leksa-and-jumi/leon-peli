import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from './config';
import { MainScene } from './scenes/MainScene';
import { MenuScene } from './scenes/MenuScene';
import { ShopScene } from './scenes/ShopScene';

(window as unknown as { g: Phaser.Game }).g = new Phaser.Game({
  // TEMP TEST
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: COLORS.background,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  // The first scene is the start menu
  scene: [MenuScene, MainScene, ShopScene],
});
