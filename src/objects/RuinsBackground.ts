import Phaser from 'phaser';
import type { Atmosphere } from './Atmosphere';
import { GAME_HEIGHT, GAME_WIDTH, LIANAS, RUINS, SKY_CYCLE } from '../config';
import { nextBubbleDelay } from '../logic/bubbles';
import { skyTintAt } from '../logic/sky';
import { drawLeaf } from './leaf';
import {
  buildBrokenWall,
  createRandom,
  mixColor,
  scatterRubble,
  type Block,
  type WallOptions,
} from '../logic/ruins';

const { blockWidth, blockHeight, groundY, stone } = RUINS;
/** Names of the baked pictures of the ruins. */
const FAR_LAYER = 'ruins-far';
const NEAR_LAYER = 'ruins-near';
const V = Phaser.Math.Vector2;

/**
 * Leo's ruins background: a night sky with a moon, misty far-away ruins,
 * a crumbled wall, a broken arch, columns and rubble.
 * The moon shines from the top right, so stones are lighter on that side
 * and shadows fall to the left. Everything is drawn with shapes, no image files.
 */
export class RuinsBackground {
  private g: Phaser.GameObjects.Graphics;
  private readonly random: () => number;
  private readonly skyTint: Phaser.GameObjects.Rectangle;
  private readonly scene: Phaser.Scene;
  private readonly far: Phaser.GameObjects.TileSprite;
  private readonly near: Phaser.GameObjects.TileSprite;
  private timeMs = 0;
  private nextShootingStar: number;

  constructor(scene: Phaser.Scene, atmosphere: Atmosphere) {
    // The sky, moon and stars are far away: they stay put on the screen while you walk
    this.g = scene.add.graphics().setScrollFactor(0);
    this.random = createRandom(RUINS.seed);
    this.drawSky();
    // A see-through layer over the sky that slowly changes colour
    this.skyTint = scene.add
      .rectangle(GAME_WIDTH / 2, groundY / 2, GAME_WIDTH, groundY, 0x000000, 0)
      .setScrollFactor(0);
    this.scene = scene;
    this.nextShootingStar = this.shootingStarDelay();
    scene.events.on('update', this.tick, this);
    scene.events.once('shutdown', () => {
      scene.events.off('update', this.tick, this);
    });
    this.g = scene.add.graphics().setScrollFactor(0);
    this.drawMoon();
    // Twinkling stars and clouds go between the moon and the ruins
    atmosphere.addTwinklingStars();
    atmosphere.addClouds();
    // The ruins repeat forever to both sides: each layer is drawn once as a picture
    // that slides by as you walk (the far one slower, so it looks far away)
    this.far = this.bakeLayer(FAR_LAYER, () => {
      this.drawFarRuins();
      this.drawFog();
    });
    this.near = this.bakeLayer(NEAR_LAYER, () => {
      this.drawGround();
      this.drawGroundShadow(20, 264);
      this.drawGroundShadow(395, 150);
      this.drawGroundShadow(339, 46);
      this.drawGroundShadow(727, 50);
      this.drawTrunk();
      this.drawWall({ x: 20, width: 264, minRows: 3, maxRows: 9 });
      this.drawArch(470, 150);
      this.drawColumn(345, 230, true);
      this.drawColumn(735, 300, false);
      this.drawRubble();
      this.drawFallenColumn(560, groundY + 62, 150);
      this.drawGrass();
      this.drawBranch();
    });
    atmosphere.addGroundMist();
  }

  /**
   * Draws a layer once into a picture (or reuses it, it's always the same),
   * and shows it as a strip that repeats sideways forever.
   */
  private bakeLayer(key: string, draw: () => void): Phaser.GameObjects.TileSprite {
    if (!this.scene.textures.exists(key)) {
      this.g = this.scene.add.graphics();
      draw();
      this.g.generateTexture(key, GAME_WIDTH, GAME_HEIGHT);
      this.g.destroy();
    }
    return this.scene.add
      .tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, key)
      .setOrigin(0, 0)
      .setScrollFactor(0);
  }

  /** Every frame: tint the sky a little differently, and now and then a shooting star. */
  private tick(_time: number, deltaMs: number): void {
    this.timeMs += deltaMs;
    // Walking slides the ruins by
    const scrollX = this.scene.cameras.main.scrollX;
    this.far.tilePositionX = scrollX * RUINS.farParallax;
    this.near.tilePositionX = scrollX;
    const tint = skyTintAt(this.timeMs, SKY_CYCLE.cycleMs, SKY_CYCLE.stops);
    this.skyTint.setFillStyle(tint.color, tint.alpha);
    if (this.timeMs >= this.nextShootingStar) {
      this.shootingStar();
      this.nextShootingStar = this.timeMs + this.shootingStarDelay();
    }
  }

  private shootingStarDelay(): number {
    const { minDelayMs, maxDelayMs } = SKY_CYCLE.shootingStar;
    return nextBubbleDelay(Math.random(), minDelayMs, maxDelayMs);
  }

  /** A bright streak shooting down across the sky, fading as it goes. */
  private shootingStar(): void {
    const { durationMs, length } = SKY_CYCLE.shootingStar;
    const startX = 100 + Math.random() * (GAME_WIDTH - 200);
    const startY = 20 + Math.random() * 60;
    const dir = Math.random() < 0.5 ? -1 : 1;
    const streak = this.scene.add.graphics().setDepth(1).setScrollFactor(0);
    const travel = { t: 0 };
    this.scene.tweens.add({
      targets: travel,
      t: 1,
      duration: durationMs,
      onUpdate: () => {
        const headX = startX + dir * travel.t * length * 2;
        const headY = startY + travel.t * length;
        streak.clear();
        streak.lineStyle(2, 0xffffff, 0.8 * (1 - travel.t));
        streak.lineBetween(headX - dir * 40, headY - 20, headX, headY);
        streak.fillStyle(0xffffff, 1 - travel.t);
        streak.fillCircle(headX, headY, 2);
      },
      onComplete: () => {
        streak.destroy();
      },
    });
  }

  private drawSky(): void {
    const { top, bottom } = RUINS.sky;
    this.g.fillGradientStyle(top, top, bottom, bottom, 1);
    this.g.fillRect(0, 0, GAME_WIDTH, groundY);
    // Faint stars, fewer near the horizon
    for (let i = 0; i < RUINS.starCount; i++) {
      const x = this.random() * GAME_WIDTH;
      const y = this.random() * this.random() * groundY * 0.7;
      this.g.fillStyle(0xffffff, 0.2 + this.random() * 0.5);
      this.g.fillCircle(x, y, this.random() < 0.15 ? 1.5 : 0.8);
    }
  }

  private drawMoon(): void {
    const { x, y, radius, color, glowColor, glowAlpha } = RUINS.moon;
    // Soft glow: many see-through circles on top of each other
    for (let ring = 8; ring >= 1; ring--) {
      this.g.fillStyle(glowColor, glowAlpha);
      this.g.fillCircle(x, y, radius + ring * 10);
    }
    this.g.fillStyle(color, 1);
    this.g.fillCircle(x, y, radius);
    // Darker "seas" and craters on the moon
    this.g.fillStyle(mixColor(color, 0x8a7f6a, 0.35), 0.6);
    this.g.fillEllipse(x - 12, y - 8, 30, 22);
    this.g.fillEllipse(x + 14, y + 14, 20, 14);
    this.g.fillEllipse(x + 8, y - 24, 12, 8);
    this.g.fillStyle(mixColor(color, 0x8a7f6a, 0.5), 0.5);
    this.g.fillCircle(x - 22, y + 18, 4);
    this.g.fillCircle(x + 24, y - 6, 3);
  }

  /** Two layers of dark ruins far away. The farther one is paler because of the mist. */
  private drawFarRuins(): void {
    const { near, far } = RUINS.farRuins;

    // Farthest layer: low broken walls on the horizon
    this.g.fillStyle(far, 1);
    this.g.fillPoints(
      [
        new V(0, groundY),
        new V(0, 400),
        new V(40, 395),
        new V(60, 380),
        new V(70, 392),
        new V(200, 392),
        new V(215, 370),
        new V(240, 372),
        new V(250, 395),
        new V(520, 398),
        new V(530, 360),
        new V(548, 360),
        new V(552, 398),
        new V(800, 402),
        new V(800, groundY),
      ],
      true,
    );

    // Nearer layer: a broken tower and old columns
    this.g.fillStyle(near, 1);
    this.g.fillPoints(
      [
        new V(80, groundY),
        new V(82, 190),
        new V(100, 175),
        new V(112, 200),
        new V(130, 160),
        new V(150, 185),
        new V(165, 230),
        new V(163, groundY),
      ],
      true,
    );
    // Tower windows (the sky shows through)
    this.g.fillStyle(RUINS.sky.bottom, 0.55);
    this.g.fillRect(112, 240, 16, 30);
    this.g.fillCircle(120, 240, 8);
    this.g.fillRect(112, 310, 16, 30);
    this.g.fillCircle(120, 310, 8);

    this.g.fillStyle(near, 1);
    const farColumns: [number, number][] = [
      [400, 260],
      [440, 330],
      [560, 230],
      [600, 300],
      [680, 250],
    ];
    for (const [x, top] of farColumns) {
      this.g.fillRect(x, top + 6, 22, groundY - top - 6);
      // Uneven broken tops
      this.g.fillTriangle(x, top + 6, x + 22, top + 6, x + 6 + this.random() * 10, top - 4);
    }
    // A beam still lying across two far columns, with a capital under it
    this.g.fillRect(550, 222, 82, 12);
    this.g.fillRect(554, 234, 32, 6);
  }

  /** Mist rising from the ground makes far things fade. */
  private drawFog(): void {
    const { color, alpha, height } = RUINS.fog;
    this.g.fillGradientStyle(color, color, color, color, 0, 0, alpha, alpha);
    this.g.fillRect(0, groundY - height, GAME_WIDTH, height);
  }

  private drawGround(): void {
    const { top, bottom, crackColor, dirt } = RUINS.ground;
    this.g.fillGradientStyle(top, top, bottom, bottom, 1);
    this.g.fillRect(0, groundY, GAME_WIDTH, GAME_HEIGHT - groundY);

    // Old floor slabs: uneven, wobbly joints
    const rowHeight = 34;
    this.g.lineStyle(2, crackColor, 0.6);
    for (let row = 0; groundY + row * rowHeight < GAME_HEIGHT; row++) {
      const y = groundY + row * rowHeight;
      const wobble = (): number => (this.random() - 0.5) * 4;
      this.g.lineBetween(0, y + rowHeight + wobble(), GAME_WIDTH, y + rowHeight + wobble());
      const offset = row % 2 === 0 ? 0 : 45;
      for (let x = offset; x < GAME_WIDTH; x += 70 + this.random() * 40) {
        this.g.lineBetween(x, y, x + wobble(), Math.min(y + rowHeight, GAME_HEIGHT));
      }
    }
    // Cracks running through some slabs
    this.g.lineStyle(1, crackColor, 0.8);
    for (let i = 0; i < 12; i++) {
      this.drawCrack(this.random() * GAME_WIDTH, groundY + 8 + this.random() * 110, 5, 7);
    }
    // Dirt and dust
    for (let i = 0; i < 160; i++) {
      this.g.fillStyle(this.random() < 0.5 ? dirt : crackColor, 0.4);
      this.g.fillCircle(
        this.random() * GAME_WIDTH,
        groundY + this.random() * (GAME_HEIGHT - groundY),
        0.6 + this.random() * 1.4,
      );
    }
  }

  /** A zigzag crack starting at (x, y). */
  private drawCrack(x: number, y: number, steps: number, stepLength: number): void {
    let cx = x;
    let cy = y;
    this.g.beginPath();
    this.g.moveTo(cx, cy);
    for (let i = 0; i < steps; i++) {
      cx += (this.random() - 0.3) * stepLength;
      cy += (this.random() - 0.5) * stepLength;
      this.g.lineTo(cx, cy);
    }
    this.g.strokePath();
  }

  /** Dark shadow on the ground, leaning left away from the moon. */
  private drawGroundShadow(x: number, width: number): void {
    const { color, alpha } = RUINS.shadow;
    this.g.fillStyle(color, alpha);
    this.g.fillPoints(
      [
        new V(x, groundY),
        new V(x + width, groundY),
        new V(x + width - 30, groundY + 18),
        new V(x - 40, groundY + 18),
      ],
      true,
    );
  }

  /**
   * One wall stone: a mortar gap, a lit top and right edge,
   * a shaded bottom and left edge, little speckles and sometimes a crack.
   */
  private drawBlock(block: Block): void {
    const { x, y, width, height } = block;
    this.g.fillStyle(stone.edge, 1);
    this.g.fillRect(x, y, width, height);

    const inset = 1.5;
    const bx = x + inset;
    const by = y + inset;
    const bw = width - inset * 2;
    const bh = height - inset * 2;
    const base = mixColor(stone.dark, stone.light, block.shade);
    this.g.fillStyle(base, 1);
    this.g.fillRect(bx, by, bw, bh);

    this.g.fillStyle(mixColor(base, stone.highlight, 0.45), 1);
    this.g.fillRect(bx, by, bw, 3);
    this.g.fillRect(bx + bw - 2, by, 2, bh);
    this.g.fillStyle(mixColor(base, stone.shadow, 0.6), 1);
    this.g.fillRect(bx, by + bh - 3, bw, 3);
    this.g.fillRect(bx, by + 3, 2, bh - 6);

    for (let i = 0; i < 5; i++) {
      const light = this.random() < 0.5;
      this.g.fillStyle(light ? stone.highlight : stone.shadow, 0.35);
      this.g.fillCircle(bx + 3 + this.random() * (bw - 6), by + 4 + this.random() * (bh - 8), 1);
    }
    if (this.random() < 0.25 && bw > 12) {
      this.g.lineStyle(1, stone.edge, 0.9);
      this.drawCrack(bx + 4 + this.random() * (bw - 8), by + 3, 3, 5);
    }
  }

  /** Clumps of moss on stones that have nothing on top of them. */
  private drawMossOnTop(blocks: Block[]): void {
    for (const block of blocks) {
      const hasStoneAbove = blocks.some(
        (other) =>
          other.y === block.y - blockHeight &&
          other.x < block.x + block.width &&
          other.x + other.width > block.x,
      );
      if (hasStoneAbove || this.random() < 0.35) continue;
      const blobs = 4 + Math.floor(this.random() * 5);
      for (let i = 0; i < blobs; i++) {
        this.g.fillStyle(this.random() < 0.6 ? RUINS.moss.dark : RUINS.moss.light, 0.95);
        this.g.fillCircle(
          block.x + 4 + this.random() * (block.width - 8),
          block.y + 1 + this.random() * 3,
          1.5 + this.random() * 2.5,
        );
      }
    }
  }

  /** A wavy vine hanging down with small leaves. */
  private drawVine(x: number, top: number, length: number): void {
    this.g.lineStyle(2, RUINS.moss.dark, 1);
    this.g.beginPath();
    this.g.moveTo(x, top);
    for (let dy = 6; dy <= length; dy += 6) {
      this.g.lineTo(x + Math.sin(dy / 10) * 4, top + dy);
    }
    this.g.strokePath();
    for (let dy = 8; dy <= length; dy += 9) {
      const side = dy % 18 === 8 ? 1 : -1;
      this.g.fillStyle(this.random() < 0.5 ? RUINS.moss.light : RUINS.moss.dark, 1);
      this.g.fillEllipse(x + Math.sin(dy / 10) * 4 + side * 4, top + dy, 6, 3.5);
    }
  }

  private drawWall(part: Pick<WallOptions, 'x' | 'width' | 'minRows' | 'maxRows'>): void {
    const blocks = buildBrokenWall({ ...part, groundY, blockWidth, blockHeight }, this.random);
    blocks.forEach((block) => {
      this.drawBlock(block);
    });
    this.drawMossOnTop(blocks);
    for (const [vineX, length] of [
      [part.x + 40, 70],
      [part.x + 150, 50],
    ] as const) {
      const tops = blocks.filter((b) => b.x <= vineX && b.x + b.width > vineX).map((b) => b.y);
      if (tops.length > 0) this.drawVine(vineX, Math.min(...tops), length);
    }
  }

  /** A stone arch whose right side has fallen down. */
  private drawArch(centerX: number, width: number): void {
    const pillarRows = 8;
    const left = centerX - width / 2;
    const right = centerX + width / 2 - blockWidth;
    const pillar = (x: number, rows: number): void => {
      buildBrokenWall(
        { x, groundY, width: blockWidth, blockWidth, blockHeight, minRows: rows, maxRows: rows },
        this.random,
      ).forEach((block) => {
        this.drawBlock(block);
      });
    };
    pillar(left, pillarRows);
    pillar(right, 4);

    // Wedge-shaped stones of the curve. Only the left part is still standing.
    const archY = groundY - pillarRows * blockHeight;
    const inner = (width - blockWidth) / 2 - blockWidth / 2;
    const outer = inner + blockWidth;
    const wedges = 5;
    const wedgeAngle = (Math.PI * 0.62) / wedges;
    for (let i = 0; i < wedges; i++) {
      const a0 = Math.PI + i * wedgeAngle;
      const a1 = a0 + wedgeAngle;
      const point = (r: number, a: number): Phaser.Math.Vector2 =>
        new V(centerX + Math.cos(a) * r, archY + Math.sin(a) * r);
      const shade = 0.3 + this.random() * 0.6;
      this.g.fillStyle(mixColor(stone.dark, stone.light, shade), 1);
      this.g.fillPoints(
        [point(inner, a0), point(outer, a0), point(outer, a1), point(inner, a1)],
        true,
      );
      // The moon lights the top of the curve
      this.g.lineStyle(3, mixColor(stone.light, stone.highlight, 0.5), 1);
      this.g.lineBetween(
        point(outer - 2, a0).x,
        point(outer - 2, a0).y,
        point(outer - 2, a1).x,
        point(outer - 2, a1).y,
      );
      this.g.lineStyle(2, stone.edge, 1);
      this.g.strokePoints(
        [point(inner, a0), point(outer, a0), point(outer, a1), point(inner, a1)],
        true,
      );
    }
  }

  /** Paints a round surface in thin strips: dark on the left, lit on the right. */
  private shadeRound(x: number, top: number, width: number, height: number): void {
    for (let i = 0; i < width; i += 2) {
      const t = i / width;
      // Brightest a bit right of the middle, because the moon is on the right
      const light = Math.max(0, Math.sin(Math.PI * Math.min(1, t * 0.85 + 0.1)));
      this.g.fillStyle(mixColor(stone.shadow, stone.highlight, 0.15 + light * 0.6), 1);
      this.g.fillRect(x + i, top, Math.min(2, width - i), height);
    }
  }

  /** A round stone column. A broken one has a jagged top, a whole one has a wide top stone. */
  private drawColumn(x: number, height: number, broken: boolean): void {
    const width = 34;
    const top = groundY - height;
    const bodyTop = broken ? top + 22 : top;
    this.shadeRound(x, bodyTop, width, groundY - bodyTop);

    // Grooves going down the column
    for (const gx of [x + 7, x + 13, x + 19, x + 25]) {
      this.g.lineStyle(2, stone.shadow, 0.6);
      this.g.lineBetween(gx, top + 24, gx, groundY - 12);
      this.g.lineStyle(1, stone.highlight, 0.35);
      this.g.lineBetween(gx + 2, top + 24, gx + 2, groundY - 12);
    }
    // Chips and cracks
    this.g.lineStyle(1, stone.edge, 0.8);
    this.drawCrack(x + 20, top + 60, 6, 8);
    this.drawCrack(x + 8, top + height * 0.6, 4, 7);

    if (broken) {
      // Jagged top where the column snapped, lit by the moon along its edge
      const jagged = [
        new V(x, top + 14),
        new V(x + 10, top + 4),
        new V(x + 16, top + 12),
        new V(x + 24, top - 6),
        new V(x + width, top + 20),
      ];
      this.g.fillStyle(mixColor(stone.dark, stone.light, 0.6), 1);
      this.g.fillPoints([new V(x, bodyTop), ...jagged, new V(x + width, bodyTop)], true);
      this.g.lineStyle(2, stone.highlight, 0.9);
      this.g.strokePoints(jagged, false);
    } else {
      // Capital (top stone)
      this.g.fillStyle(stone.dark, 1);
      this.g.fillRect(x - 8, top - 12, width + 16, 12);
      this.g.fillStyle(stone.highlight, 0.7);
      this.g.fillRect(x - 8, top - 12, width + 16, 2);
      this.g.fillStyle(stone.shadow, 1);
      this.g.fillRect(x - 3, top, width + 6, 4);
    }
    // Base stone
    this.g.fillStyle(stone.dark, 1);
    this.g.fillRect(x - 6, groundY - 12, width + 12, 12);
    this.g.fillStyle(stone.highlight, 0.5);
    this.g.fillRect(x - 6, groundY - 12, width + 12, 2);
  }

  /** A column that fell over and broke in two. */
  private drawFallenColumn(x: number, y: number, length: number): void {
    const thickness = 30;
    const pieces: [number, number][] = [
      [x, length * 0.6],
      [x + length * 0.6 + 12, length * 0.4],
    ];
    // Shadow under the pieces
    this.g.fillStyle(RUINS.shadow.color, RUINS.shadow.alpha);
    this.g.fillEllipse(x + length / 2 - 8, y + 2, length + 20, 10);

    for (const [px, pieceLength] of pieces) {
      // Lying down, so the light comes from the top
      for (let i = 0; i < thickness; i += 2) {
        const light = Math.sin(Math.PI * Math.min(1, ((thickness - i) / thickness) * 0.85 + 0.1));
        this.g.fillStyle(mixColor(stone.shadow, stone.highlight, 0.15 + light * 0.6), 1);
        this.g.fillRect(px, y - thickness + i, pieceLength, 2);
      }
      this.g.lineStyle(1, stone.shadow, 0.6);
      for (const gy of [y - 23, y - 16, y - 9]) {
        this.g.lineBetween(px + 4, gy, px + pieceLength - 4, gy);
      }
      // Broken end shows the inside of the stone
      this.g.fillStyle(mixColor(stone.light, stone.highlight, 0.3), 1);
      this.g.fillEllipse(px + pieceLength, y - thickness / 2, 10, thickness);
      this.g.lineStyle(1, stone.edge, 0.8);
      this.g.strokeEllipse(px + pieceLength, y - thickness / 2, 10, thickness);
    }
  }

  private drawRubble(): void {
    const stones = scatterRubble(
      RUINS.rubbleCount,
      { x: 0, y: groundY + 6, width: GAME_WIDTH, height: 40 },
      RUINS.rubbleRadius,
      this.random,
    );
    for (const s of stones) {
      const w = s.radius * 2.2;
      const h = s.radius * 1.5;
      this.g.fillStyle(RUINS.shadow.color, RUINS.shadow.alpha);
      this.g.fillEllipse(s.x - 2, s.y + h * 0.4, w, h * 0.6);
      const base = mixColor(stone.shadow, stone.light, s.shade);
      this.g.fillStyle(base, 1);
      this.g.fillEllipse(s.x, s.y, w, h);
      this.g.fillStyle(mixColor(base, stone.highlight, 0.5), 1);
      this.g.fillEllipse(s.x + w * 0.15, s.y - h * 0.2, w * 0.5, h * 0.35);
    }
  }

  /** A big old tree branch across the top of the screen, where the vines hang from. */
  /** A big old jungle tree on the left, half hidden behind the wall. */
  private drawTrunk(): void {
    const { branch, branchLight, bark, moss } = LIANAS.colors;
    // The trunk widens toward the ground, with roots spreading out
    this.g.fillStyle(branch, 1);
    this.g.fillPoints(
      [
        new V(-20, -10),
        new V(48, -10),
        new V(52, 120),
        new V(58, 260),
        new V(66, 400),
        new V(80, groundY - 10),
        new V(105, groundY + 8),
        new V(60, groundY + 4),
        new V(30, groundY + 12),
        new V(0, groundY + 6),
        new V(-20, groundY + 6),
      ],
      true,
    );
    // Deep cracks in the bark, and moonlit ridges between them
    for (let i = 0; i < 9; i++) {
      const x = -10 + i * 8 + this.random() * 4;
      let y = -10;
      while (y < groundY) {
        const step = 14 + this.random() * 18;
        const wiggle = (this.random() - 0.5) * 4;
        this.g.lineStyle(2, bark, 0.9);
        this.g.lineBetween(
          x + (y / groundY) * 14,
          y,
          x + ((y + step) / groundY) * 14 + wiggle,
          y + step,
        );
        y += step + this.random() * 10;
      }
    }
    this.g.lineStyle(1.5, branchLight, 0.6);
    for (let i = 0; i < 5; i++) {
      const x = 4 + i * 11 + this.random() * 4;
      this.g.lineBetween(x, 0, x + 12, groundY - 20);
    }
    // A knot hole and moss growing on the shady side
    this.g.fillStyle(bark, 1);
    this.g.fillEllipse(24, 210, 14, 22);
    this.g.fillStyle(0x0d0905, 1);
    this.g.fillEllipse(25, 212, 8, 14);
    for (let i = 0; i < 40; i++) {
      this.g.fillStyle(moss, 0.5 + this.random() * 0.4);
      this.g.fillCircle(-10 + this.random() * 30, 150 + this.random() * 300, 2 + this.random() * 4);
    }
  }

  /** The thick branch the vines hang from, with bark, moss, leaves and the vines tied around it. */
  private drawBranch(): void {
    const { branch, branchLight, bark, moss, leaf, leafLight, leafVein, wood, woodDark } =
      LIANAS.colors;
    // Thick where it grows out of the trunk, thinner and drooping a little at the tip
    const top = (x: number): number => 6 + x * 0.03 + Math.sin(x / 90) * 3;
    const bottom = (x: number): number => 62 - x * 0.04 + Math.sin(x / 90) * 3;
    const tipX = 640;
    const outline: Phaser.Math.Vector2[] = [];
    for (let x = 30; x <= tipX; x += 20) outline.push(new V(x, top(x)));
    outline.push(new V(tipX + 18, (top(tipX) + bottom(tipX)) / 2 + 4));
    for (let x = tipX; x >= 30; x -= 20) outline.push(new V(x, bottom(x)));
    this.g.fillStyle(branch, 1);
    this.g.fillPoints(outline, true);
    // Bark lines running along it, light on top where the moon shines
    for (let row = 0; row < 4; row++) {
      for (let x = 40; x < tipX; x += 30 + this.random() * 30) {
        const length = 20 + this.random() * 30;
        const f = 0.25 + row * 0.18;
        const y1 = top(x) + (bottom(x) - top(x)) * f;
        const y2 = top(x + length) + (bottom(x + length) - top(x + length)) * f;
        this.g.lineStyle(1.5, bark, 0.9);
        this.g.lineBetween(x, y1, x + length, y2 + (this.random() - 0.5) * 2);
      }
    }
    this.g.lineStyle(2, branchLight, 0.8);
    for (let x = 30; x < tipX; x += 20) this.g.lineBetween(x, top(x) + 2, x + 20, top(x + 20) + 2);
    // Moss on top
    for (let x = 40; x < tipX - 20; x += 6) {
      if (this.random() < 0.35) continue;
      this.g.fillStyle(moss, 0.6 + this.random() * 0.4);
      this.g.fillCircle(x, top(x) + 1, 2 + this.random() * 3);
    }
    // Twigs at the tip
    this.g.lineStyle(3, branch, 1);
    this.g.lineBetween(tipX, top(tipX) + 6, tipX + 40, top(tipX) - 16);
    this.g.lineBetween(tipX + 10, bottom(tipX) - 6, tipX + 46, bottom(tipX) + 14);
    // Where each vine starts: wrapped a few times around the branch
    for (const anchor of LIANAS.anchors) {
      for (let k = -1; k <= 1; k++) {
        const x = anchor.x + k * 6;
        this.g.lineStyle(5, woodDark, 1);
        this.g.lineBetween(x - 4, top(x) - 1, x + 4, bottom(x) + 1);
        this.g.lineStyle(3, wood, 1);
        this.g.lineBetween(x - 4, top(x) - 1, x + 4, bottom(x) + 1);
      }
    }
    // Leaf clusters along the top of the branch and over the trunk
    const colors = { dark: leaf, light: leafLight, vein: leafVein };
    const darkColors = { dark: 0x2c4a1c, light: leaf, vein: leafVein };
    for (let x = -10; x < tipX + 40; x += 22) {
      // Thick bunches by the trunk, just a few along the branch so the bark shows
      const count = x < 80 ? 4 : this.random() < 0.5 ? 1 : 2;
      for (let n = 0; n < count; n++) {
        const angle = -Math.PI / 2 + (this.random() - 0.5) * 1.8;
        const size = 12 + this.random() * 10;
        const y = (x < 30 ? 10 : top(x)) + 2;
        drawLeaf(this.g, x + this.random() * 8, y, angle, size, n % 2 ? colors : darkColors);
      }
      // A few leaves hang down under the branch too
      if (this.random() < 0.4) {
        const angle = Math.PI / 2 + (this.random() - 0.5) * 1.2;
        drawLeaf(this.g, x, bottom(Math.max(x, 30)) - 2, angle, 10 + this.random() * 8, darkColors);
      }
    }
  }

  /** Little grass tufts growing between the floor slabs. */
  private drawGrass(): void {
    for (let i = 0; i < 26; i++) {
      const x = this.random() * GAME_WIDTH;
      const y = groundY + 4 + this.random() * 110;
      this.g.lineStyle(1.5, this.random() < 0.5 ? RUINS.moss.dark : RUINS.moss.light, 0.9);
      for (let blade = -2; blade <= 2; blade++) {
        this.g.lineBetween(x + blade, y, x + blade * 2.5, y - 5 - this.random() * 5);
      }
    }
  }
}
