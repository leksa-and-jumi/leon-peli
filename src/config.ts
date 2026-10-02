import type { ShopItem } from './logic/shop';

/** Shared game constants. Tweak values here instead of inside scenes. */
export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 600;

export const COLORS = {
  background: 0x1d1f2b,
  text: '#ffffff',
} as const;

/** Leo's player: a black stick figure with a gun, standing still in the bottom-left corner. */
export const PLAYER = {
  x: 70,
  feetY: 555,
  height: 120,
  lineWidth: 5,
  color: 0x000000,
  /** A thin pale edge (moonlight) so the black figure shows on the dark ground. */
  outlineColor: 0xd8cfe0,
  outlineAlpha: 0.45,
  gun: { body: 0x1e1e1e, shine: 0x8a8a8a },
  /** Blink red for a moment when a bullet hits. */
  hitColor: 0xe53935,
  hitFlashMs: 250,
  lives: 4,
} as const;

/** Points for breaking one white stick figure. */
export const POINTS_PER_KILL = 1;

/** The white stick figures that walk in from the right and shoot. */
export const ENEMY = {
  color: 0xffffff,
  outlineColor: 0x000000,
  outlineAlpha: 0.5,
  startX: GAME_WIDTH + 40,
  /** Stops as far from the right edge as the player is from the left edge. */
  stopX: GAME_WIDTH - PLAYER.x,
  walkSpeed: 90, // pixels per second
  stepMs: 180,
  /** Time after stopping before the first shot. */
  firstShotMs: 1200,
  shootIntervalMs: 2000,
  bulletSpeed: 450, // slower than the player's, so there's time to crouch
  /** Hits it takes to break one. */
  lives: 2,
  /** Time before a new one walks in after one is hit. */
  respawnMs: 1500,
} as const;

/**
 * White stick figures jump over shots fired from a crouch.
 * High enough to clear a crouch shot, low enough that a standing shot still hits.
 */
export const JUMP = {
  height: 70,
  riseMs: 260,
  /** Time spent at the top, so the whole bullet passes under. */
  hangMs: 140,
} as const;

/** The big axe guy who comes every 15th time and walks up to you. */
export const BOSS = {
  every: 15,
  height: 170,
  color: 0x7f1d1d,
  outlineColor: 0xf3e6c4,
  outlineAlpha: 0.5,
  walkSpeed: ENEMY.walkSpeed,
  stepMs: ENEMY.stepMs,
  lives: 10,
  /** Stops this far in front of the player, close enough to chop. */
  reach: 85,
  /** Time between axe chops once it's close. */
  chopIntervalMs: 1200,
  /** How long the axe stays down after a chop. */
  chopDownMs: 250,
  healthBar: { width: 70, height: 8, gap: 14, back: 0x3a332b, fill: 0xe53935 },
} as const;

/** How a hit white stick figure breaks in two. */
export const BREAK = {
  topFlyX: 10,
  /** How high above the ground the top piece's turning point stops. */
  restHeight: 6,
  topSpin: -85, // degrees, falls toward the player so it stays on screen
  topFallMs: 550,
  bottomTip: 80, // degrees
  bottomDelayMs: 120,
  bottomFallMs: 650,
  fadeDelayMs: 1500,
  fadeMs: 500,
} as const;

/** Red drops that spray out of a hit. */
export const BLOOD = {
  color: 0xc62828,
  drops: 16,
  minRadius: 1.5,
  maxRadius: 3.5,
  spread: 90,
  /** Drops land a little in front of or behind the feet line. */
  landingDepth: 12,
  minFlightMs: 300,
  extraFlightMs: 350,
} as const;

/** Every text in the game is shown in English and Finnish. */
export const CROUCH_HINT = 'C = crouch 🧎 / kyykisty\n🖱️ = shoot / ammu\nS = shop 🛒 / kauppa';

/** Bullets shot from the gun with a mouse click. */
export const BULLET = {
  speed: 900, // pixels per second
  width: 12,
  height: 4,
  color: 0xffd54f,
  /** How far above the hand the bullet leaves the gun. How far in front is in `WEAPONS`. */
  muzzleOffset: { y: -3 },
  flash: { color: 0xfff3b0, radius: 9, durationMs: 60 },
  /** The player's gun reloads this long between shots. */
  cooldownMs: 3000,
} as const;

/** The guns. `muzzleX` is how far in front of the hand the bullet comes out. */
export const WEAPONS = {
  pistol: { muzzleX: 30, cooldownMs: BULLET.cooldownMs },
  /** From the shop: no reloading, shoot as fast as you can click. */
  rifle: {
    muzzleX: 52,
    cooldownMs: 0,
    colors: { body: 0x1e1e1e, wood: 0x6d4c41, shine: 0x8a8a8a },
  },
  /** The boss's axe. It doesn't shoot. */
  axe: {
    muzzleX: 0,
    cooldownMs: 0,
    colors: { handle: 0x6d4c41, blade: 0x757575, edge: 0xe0e0e0 },
  },
} as const;

export type Weapon = keyof typeof WEAPONS;

/** Bar under the hints that fills up while the gun reloads. */
export const RELOAD_BAR = {
  x: 52,
  y: 100,
  width: 120,
  height: 10,
  empty: 0x3a332b,
  filling: 0xffb74d,
  ready: 0x66bb6a,
} as const;

/** The "you died" sign that comes after the player breaks. */
export const GAME_OVER = {
  /** Time to watch yourself fall apart before the sign shows. */
  delayMs: 1300,
  text: 'You died!\nSinä kuolit!',
  textColor: '#ffffff',
  dimAlpha: 0.35,
  panel: { width: 340, height: 260, color: 0x1b1533, alpha: 0.92, border: 0xc62828 },
  button: { width: 120, height: 48, color: 0xc62828, hoverColor: 0xe53935 },
} as const;

/** Things in the shop. Prices are in ⭐ points. */
export const SHOP_ITEMS = [
  { id: 'life', emoji: '❤️', name: 'Extra life\nLisäelämä', price: 3 },
  { id: 'rifle', emoji: '🔫', name: 'Assault rifle\nRynnäkkökivääri', price: 15, onlyOnce: true },
  { id: 'clothes', emoji: '👕', name: 'Clothes\nVaatteet', price: 5, comingSoon: true },
] as const satisfies readonly ShopItem[];

export const SHOP = {
  panel: { width: 520, height: 420, color: 0x1b1533, alpha: 0.96, border: 0xffd54f },
  rowHeight: 92,
  buyButton: { width: 120, height: 44, color: 0x2e7d32, hoverColor: 0x43a047, disabled: 0x555555 },
  textColor: '#ffffff',
  dimTextColor: '#9e9e9e',
  dimAlpha: 0.5,
} as const;

/** Ruins background. Same seed = same ruins every time. */
export const RUINS = {
  seed: 2026,
  groundY: 470,
  sky: { top: 0x0f0d24, bottom: 0x6b3a55 },
  starCount: 70,
  moon: { x: 640, y: 110, radius: 46, color: 0xf3e6c4, glowColor: 0xf3e6c4, glowAlpha: 0.05 },
  farRuins: { near: 0x2a1f3d, far: 0x4a2d4f },
  fog: { color: 0x8a5a72, alpha: 0.35, height: 140 },
  ground: { top: 0x3b3328, bottom: 0x1c1813, crackColor: 0x15110d, dirt: 0x4a4033 },
  stone: { light: 0x9a8e7c, dark: 0x5e5549, edge: 0x2a251f, highlight: 0xc9bea6, shadow: 0x3a332b },
  shadow: { color: 0x0a0806, alpha: 0.45 },
  moss: { dark: 0x3d5e2c, light: 0x6b8f45 },
  blockWidth: 44,
  blockHeight: 22,
  rubbleCount: 45,
  rubbleRadius: { min: 3, max: 10 },
} as const;
