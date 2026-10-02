/** Shared game constants. Tweak values here instead of inside scenes. */
export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 600;

export const COLORS = {
  background: 0x1d1f2b,
  player: 0x4fc3f7,
  star: 0xffd54f,
  text: '#ffffff',
} as const;

/** Every text in the game is shown in English and Finnish. */
export const HINT_TEXT =
  'Move with the arrow keys and collect stars! ⭐\nLiiku nuolilla ja kerää tähtiä! ⭐';

export const PLAYER_SIZE = 40;
export const PLAYER_SPEED = 300; // pixels per second

export const STAR_SIZE = 20;
export const POINTS_PER_STAR = 1;

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
