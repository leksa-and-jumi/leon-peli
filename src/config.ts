import type { Difficulty, DifficultyRules } from './logic/difficulty';
import type { OutfitLook } from './logic/outfit';
import type { ShopItem } from './logic/shop';

/** Shared game constants. Tweak values here instead of inside scenes. */
export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 600;

export const COLORS = {
  background: 0x1d1f2b,
  text: '#ffffff',
} as const;

/** How softly figures move between poses. Bigger = snappier. */
export const MOTION = {
  smoothSpeed: 14,
  /** Much faster for the hard, quick part of an axe or club swing. */
  strikeSpeed: 45,
} as const;

/** Swinging an axe or club: lift it back behind the head, then strike down hard. */
export const SWING = {
  /** Lifting the weapon back before the strike. */
  windupMs: 200,
  /** The fast part of the strike. */
  strikeMs: 120,
  /** A pale trail showing where the weapon flew. */
  swoosh: { color: 0xffffff, alpha: 0.5, width: 10, fadeMs: 220, extraRadius: 40 },
} as const;

/** Sounds, all made with code. */
export const SOUND = {
  volume: 0.6,
  /** The white ones' guns are a bit quieter than yours. */
  enemyGunVolume: 0.55,
  /** How long the hiss of a gun blast lasts. */
  gunBlastSeconds: 0.28,
  screamVolume: 0.6,
  screamLength: 1.1,
  /** Echo in the ruins: how long it rings and how loud it is. */
  echoSeconds: 1.4,
  echoLevel: 0.35,
  /** How rough the scream is (0 = smooth). */
  screamRasp: 3,
  /** The short "uh!" when hit. */
  gruntVolume: 0.55,
  gruntLength: 0.22,
  /** A man's "uh" mouth shape: [Hz, loudness]. */
  gruntFormants: [
    [600, 1],
    [1000, 0.6],
    [2400, 0.2],
  ],
  /** How sharp the mouth shapes are: higher sounds more like a voice. */
  screamFormantQ: 9,
  /** How much breathy hiss is in the scream. */
  screamBreath: 0.25,
  /** Screams slide from `start` down to `end` Hz: men's voices, deepest for the axe guy. */
  screamPitch: {
    player: { start: 210, end: 105 },
    white: { start: 240, end: 120 },
    boss: { start: 140, end: 65 },
    giant: { start: 95, end: 45 },
  },
  /** Mouth shapes of a man's "aaa" sliding to "ooo": [from Hz, to Hz, loudness]. */
  screamFormants: [
    [730, 570, 1],
    [1090, 840, 0.7],
    [2440, 2410, 0.3],
  ],
} as const;

/** Shadows under the stick figures. */
export const SHADOW = {
  alpha: 0.4,
  /** The shadow fades away by this height when jumping. */
  fadeHeight: 120,
} as const;

/** Little puffs of dust when walking. */
export const DUST = { color: 0x9e8f78, puffs: 3, alpha: 0.35, ms: 450 } as const;

/** Round ends on the stick figures' lines. */
export const ROUND_ENDS = {
  /** Hands and feet are round balls this much bigger than the line (part of the line width). */
  handGrow: 0.3,
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
  gun: { body: 0x2a2a2a, shine: 0x9e9e9e },
  /** Blink red for a moment when a bullet hits. */
  hitColor: 0xe53935,
  hitFlashMs: 250,
  lives: 4,
  /** Walking with A and D, in pixels per second. */
  walkSpeed: 220,
  /** How close to the left edge the player can walk. */
  minX: 40,
  /** How far right the player can walk, so you can't walk into the white ones. */
  maxX: 600,
  stepMs: 160,
  /** Jumping with Space: how fast you go up, and how hard you're pulled down. */
  jumpSpeed: 520,
  gravity: 1400,
} as const;

/** Grenades: G throws one, and the white ones throw one after every 10 shots. */
export const GRENADE = {
  /** You can throw one this often. */
  cooldownMs: 30000,
  /** Your grenade takes this many lives from an enemy. */
  damage: 3,
  /** A white one's grenade takes this many of your hearts. */
  enemyDamage: 2,
  /** The white ones throw one after this many shots. */
  enemyEveryShots: 10,
  throwDistance: 300,
  flightMs: 900,
  gravity: 1200,
  /** How close you must be to get hurt. */
  radius: 85,
  /** Jumping this high makes the blast miss you. */
  safeHeight: 45,
  shake: 0.012,
  shakeMs: 350,
  colors: { body: 0x3f4f2a, lever: 0x9e9e9e },
} as const;

/** Jungle vines hanging from a big branch: jump into one to swing, Space lets go with a flip. */
export const LIANAS = {
  /** Where each vine hangs from (on the branch at the top). */
  anchors: [
    { x: 250, y: 32 },
    { x: 480, y: 32 },
  ],
  length: 300,
  /** How close your hands must get to the end to grab it. */
  grabReachX: 34,
  grabReachY: 45,
  swing: { gravity: 1400, push: 3.2, damping: 0.25, maxAngle: 1.05 },
  /** After letting go, you can't grab again for a moment. */
  regrabMs: 500,
  /** Hanging: your feet are this many player-heights below your hands. */
  hangDrop: 1.05,
  colors: { vine: 0x3d5e2c, leaf: 0x6b8f45, branch: 0x2b2016, branchLight: 0x4a3a28 },
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
  lives: 3,
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
  /** A little extra time in the air before and after each bullet, to be safe. */
  marginMs: 60,
} as const;

/** The big axe guy who comes every 15th time and walks up to you. */
export const BOSS = {
  every: 15,
  weapon: 'axe',
  voice: 'boss',
  /** Hearts one chop takes. */
  damage: 1,
  height: 170,
  color: 0x7f1d1d,
  outlineColor: 0xf3e6c4,
  outlineAlpha: 0.5,
  /** A bit slower than the white ones, so there's time to break him. */
  walkSpeed: 60,
  stepMs: 240,
  lives: 10,
  /** Points for breaking him. */
  points: 3,
  /** Stops this far in front of the player, close enough to chop. */
  reach: 85,
  /** Stays between these, so he's always on the screen. */
  minX: 40,
  maxX: 740,
  /** Time between axe chops once it's close. */
  chopIntervalMs: 1200,
  /** How long the axe stays down after a chop. */
  chopDownMs: 250,
  healthBar: { width: 70, height: 8, gap: 14, back: 0x3a332b, fill: 0xe53935 },
} as const;

/** The giant with a club: comes every 30th time, slow, huge and very tough. */
export const GIANT = {
  every: 30,
  weapon: 'club',
  voice: 'giant',
  /** Hearts one smash takes. */
  damage: 2,
  height: 250,
  color: 0x33402c,
  outlineColor: 0xf3e6c4,
  outlineAlpha: 0.55,
  /** Even slower than the red axe guy. */
  walkSpeed: 40,
  stepMs: 340,
  lives: 30,
  points: 10,
  reach: 120,
  minX: 50,
  maxX: 730,
  chopIntervalMs: 1700,
  chopDownMs: 320,
  healthBar: { width: 100, height: 10, gap: 14, back: 0x3a332b, fill: 0x7cb342 },
} as const;

/** Everything that's different between the axe guy and the giant. */
export type BigFoeKind = typeof BOSS | typeof GIANT;

/** How a hit white stick figure breaks in two. */
export const BREAK = {
  /** The top piece is thrown this far, in the direction the bullet flew. */
  topFlyX: 30,
  /** How high the top piece flies before it falls. */
  topArcHeight: 35,
  /** How high above the ground the top piece's turning point stops. */
  restHeight: 4,
  topSpin: -90, // degrees, so it lies flat on the ground
  topFallMs: 500,
  bottomTip: 90, // degrees, legs fall flat
  bottomDelayMs: 100,
  bottomFallMs: 550,
  /** How long it takes for arms and legs to go limp. */
  limpMs: 600,
  /** After landing, rocks back this much (degrees) and settles. */
  settleRock: 6,
  settleMs: 180,
  /** How long the pieces lie on the ground before fading away. */
  fadeDelayMs: 4500,
  fadeMs: 800,
} as const;

/** Red drops that spray out of a hit. */
export const BLOOD = {
  color: 0xc62828,
  dark: 0x7f1414,
  drops: 70,
  /** More drops squirt out a few times after the hit. */
  squirts: 6,
  squirtDrops: 12,
  squirtEveryMs: 120,
  /** The broken ends drip blood while the pieces fall. */
  dripEveryMs: 60,
  dripForMs: 1400,
  dripDrops: 2,
  minRadius: 1.2,
  maxRadius: 3.5,
  /** How fast drops shoot out sideways and up (pixels per second). */
  speed: 320,
  upSpeed: 380,
  /** Pulls the drops down (pixels per second²). */
  gravity: 1100,
  /** Fast drops look stretched, at most this many times longer. */
  maxStretch: 3,
  /** A fine red mist at the hit. */
  mist: 30,
  mistSpread: 45,
  mistMs: 450,
  /** Drops land a little in front of or behind the feet line. */
  landingDepth: 14,
  pool: { width: 90, height: 12, alpha: 0.85, growMs: 1400 },
} as const;

/** Every text in the game is shown in English and Finnish. */
export const CROUCH_HINT =
  'A/D ←→ = move 🏃 / liiku\nS ↓ = crouch 🧎 / kyykisty\nSpace = jump 🦘 / hyppää\n🖱️ = shoot / ammu\nG = grenade 💣 / kranaatti\nK = shop 🛒 / kauppa\nM = sound 🔊 / ääni';

/** Bullets shot from the gun with a mouse click. */
export const BULLET = {
  speed: 900, // pixels per second
  width: 12,
  height: 4,
  color: 0xffd54f,
  /** How far above the hand the bullet leaves the gun. How far in front is in `WEAPONS`. */
  muzzleOffset: { y: -3 },
  /** The player's gun reloads this long between shots. */
  cooldownMs: 3000,
} as const;

/** How shooting looks: flash, smoke, glowing trails and brass shells. */
export const GUN_FX = {
  flash: {
    inner: 0xffffff,
    outer: 0xffc94d,
    glow: 0xffe9a8,
    glowRadius: 22,
    length: 26,
    durationMs: 80,
  },
  smoke: { puffs: 4, color: 0xb0aaa0, alpha: 0.35, ms: 700 },
  trail: { length: 70, width: 3, color: 0xffcc66, tip: 0xfff3c4 },
  shell: {
    width: 6,
    height: 2.5,
    color: 0xc9a227,
    gravity: 1200,
    bounciness: 0.35,
    minBounce: 40,
    /** Shells land a little in front of or behind the feet line. */
    landingDepth: 10,
    /** How long a shell lies on the ground before fading. */
    lieMs: 6000,
    fadeMs: 1000,
    /** At most this many shells at once. */
    max: 40,
  },
} as const;

/** In the pig suit you fight with an axe instead of a gun. */
export const PIG_AXE = {
  /** Lives one chop takes from an enemy. */
  damage: 3,
  /** How close the enemy must be, in front of you. */
  reach: 95,
  cooldownMs: 600,
  /** How long the axe stays down after a chop. */
  chopMs: 220,
  /** With the axe you can walk right up to the white ones. */
  maxX: 670,
} as const;

/** How often an unfinished game is saved while playing. */
export const RUN_SAVE_EVERY_MS = 2000;

/** After this many deaths on a level, the rifle bought there is gone. */
export const RIFLE_DEATHS = 5;

/** The guns. `muzzleX` is how far in front of the hand the bullet comes out. */
export const WEAPONS = {
  pistol: { muzzleX: 30, cooldownMs: BULLET.cooldownMs },
  /** From the shop: reloads in just one second. */
  rifle: {
    muzzleX: 55,
    cooldownMs: 1000,
    /** With the upgrade from the shop. */
    upgradedCooldownMs: 300,
    colors: { body: 0x2f2f2f, dark: 0x1a1a1a, metal: 0x4a4a4a, shine: 0x9e9e9e },
  },
  /** The giant's big wooden club. */
  club: {
    muzzleX: 0,
    cooldownMs: 0,
    colors: { wood: 0x7a5233, dark: 0x4e342e, knot: 0x3e2723, iron: 0x8a8f94, grip: 0x3b2a1f },
  },
  /** The troll's small gun, held with both hands. Shoots any time, no waiting. */
  smallGun: {
    muzzleX: 24,
    cooldownMs: 0,
    colors: { body: 0x3949ab, dark: 0x1a237e, shine: 0x9fa8da },
  },
  /** The boss's axe. It doesn't shoot. */
  axe: {
    muzzleX: 0,
    cooldownMs: 0,
    colors: { handle: 0x795548, blade: 0x616161, edge: 0xe0e0e0 },
  },
} as const;

export type Weapon = keyof typeof WEAPONS;

/** Bar under the hints that fills up while the gun reloads. */
export const RELOAD_BAR = {
  x: 52,
  y: 182,
  /** The grenade bar sits this far under the reload bar. */
  gap: 24,
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
  /** Drawn above the game and its texts. */
  depth: 200,
  text: 'You died!\nSinä kuolit!',
  textColor: '#ffffff',
  recordColor: '#ffd54f',
  dimAlpha: 0.35,
  panel: { width: 400, height: 320, color: 0x1b1533, alpha: 0.92, border: 0xc62828 },
  button: { width: 120, height: 48, color: 0xc62828, hoverColor: 0xe53935 },
} as const;

/** Things in the shop. Prices are in ⭐ points. */
/** Clothes for the stick figure. Black is what you start with. */
export const OUTFITS = {
  black: { kind: 'solid', color: 0x000000 },
  white: { kind: 'solid', color: 0xffffff },
  blue: { kind: 'solid', color: 0x1e88e5 },
  pink: { kind: 'solid', color: 0xf06292 },
  red: { kind: 'solid', color: 0xe53935 },
  green: { kind: 'solid', color: 0x43a047 },
  yellow: { kind: 'solid', color: 0xfdd835 },
  orange: { kind: 'solid', color: 0xfb8c00 },
  purple: { kind: 'solid', color: 0x8e24aa },
  /** Woodland camouflage: blotches of dark, green, olive, brown and sand. */
  camo: { kind: 'camo', colors: [0x1f2418, 0x3b4a2a, 0x5c6b3a, 0x5a4632, 0x8f8460] },
  pig: { kind: 'pig', color: 0xf48fb1, snout: 0xec6f9c, ear: 0xe57399 },
  /** A mossy forest troll with a big nose, pointy ears and a hair tuft. */
  troll: { kind: 'troll', color: 0x8d9a7a, nose: 0x6f7d5e, hair: 0x3e4a2f },
  rainbow: {
    kind: 'rainbow',
    colors: [0xe53935, 0xfb8c00, 0xfdd835, 0x43a047, 0x1e88e5, 0x3949ab, 0x8e24aa],
  },
} as const satisfies Record<string, OutfitLook>;

export type OutfitId = keyof typeof OUTFITS;

/** The helmet that comes with the camo suit. */
export const CAMO_HELMET = { color: 0x4b5320, rim: 0x3a4119, shine: 0xffffff } as const;

/** How long each colored piece of a camo or rainbow outfit is. */
export const OUTFIT_PIECE_LENGTH = 7;
/** Rainbow pieces are tiny, so the stripes have sharp edges. */
export const RAINBOW_PIECE_LENGTH = 2;

/** Points you start every game with. */
export const START_POINTS = 3;

/** Things in the shop, one per row. Prices are in ⭐ points. */
export const SHOP_ITEMS = [
  { id: 'life', emoji: '❤️', name: 'Extra life\nLisäelämä', price: 3 },
  { id: 'rifle', emoji: '🔫', name: 'Assault rifle\nRynnäkkökivääri', price: 15, onlyOnce: true },
  {
    id: 'rifleUpgrade',
    emoji: '⚡',
    name: 'Rifle upgrade\nKiväärin päivitys',
    price: 30,
    onlyOnce: true,
    needs: 'rifle',
  },
  {
    id: 'camo',
    emoji: '🪖',
    name: 'Camo suit\nMaastopuku',
    price: 20,
    onlyOnce: true,
    outfit: 'camo',
  },
  {
    id: 'pig',
    emoji: '🐷',
    name: 'Pig suit + axe 🪓\nPossupuku + kirves',
    price: 100,
    onlyOnce: true,
    outfit: 'pig',
  },
  {
    id: 'rainbow',
    emoji: '🌈',
    name: 'Rainbow suit\nSateenkaaripuku',
    price: 30,
    onlyOnce: true,
    outfit: 'rainbow',
  },
  {
    id: 'troll',
    emoji: '🧌',
    name: 'Troll suit + small gun 🔫\nPeikkopuku + pikkupyssy',
    price: 500,
    onlyOnce: true,
    outfit: 'troll',
  },
] as const satisfies readonly ShopItem[];

/** One-color clothes, shown as color squares in the shop. Black is yours from the start. */
export const COLOR_ITEMS: readonly ShopItem[] = (
  ['black', 'white', 'blue', 'pink', 'red', 'green', 'yellow', 'orange', 'purple'] as const
).map((id) => ({ id, emoji: '👕', name: id, price: 5, onlyOnce: true, outfit: id }));

export const SHOP = {
  panel: { width: 560, height: 570, color: 0x1b1533, alpha: 0.96, border: 0xffd54f },
  rowHeight: 52,
  swatch: { size: 40, gap: 12, worn: 0xffd54f },
  buyButton: { width: 120, height: 44, color: 0x2e7d32, hoverColor: 0x43a047, disabled: 0x555555 },
  wearButton: { width: 120, height: 44, color: 0x1565c0, hoverColor: 0x1e88e5 },
  textColor: '#ffffff',
  dimTextColor: '#9e9e9e',
  dimAlpha: 0.5,
} as const;

/** Moving night: twinkling stars, clouds, ground mist and dark screen edges. */
export const ATMOSPHERE = {
  stars: { count: 14, maxY: 300 },
  clouds: { count: 4, color: 0x2a1f3d, alpha: 0.55, minY: 60, maxY: 200 },
  mist: { count: 3, color: 0xcfc2d8, alpha: 0.08 },
  vignette: { size: 140, alpha: 0.55, depth: 50 },
  /** Texts and bars stay above the dark edges. */
  hudDepth: 100,
} as const;

/** The difficulty levels in the start menu. */
type Level = DifficultyRules & { label: string; emoji: string };

export const DIFFICULTIES: Record<Difficulty, Level> = {
  /** For trying things out: white, red, green in turns, one hit each, and you can't die. */
  test: {
    label: 'Test\nTesti',
    emoji: '🧪',
    specials: [],
    regular: { kind: 'white', lives: 1 },
    cycle: [
      { kind: 'white', lives: 1 },
      { kind: 'boss', lives: 1 },
      { kind: 'giant', lives: 1 },
    ],
    invincible: true,
  },
  /** Only white ones, two hits each. */
  easy: {
    label: 'Easy\nHelppo',
    emoji: '😊',
    specials: [],
    regular: { kind: 'white', lives: 2 },
  },
  /** The game as it was: axe guy every 15th, giant every 30th. */
  normal: {
    label: 'Normal\nNormaali',
    emoji: '🙂',
    specials: [
      { every: 30, kind: 'giant' },
      { every: 15, kind: 'boss' },
    ],
    regular: { kind: 'white', lives: 3 },
  },
  /** Red guys often: 5 hits every 5th, 10 hits every 10th, giant every 30th. */
  hard: {
    label: 'Hard\nVaikea',
    emoji: '😈',
    specials: [
      { every: 30, kind: 'giant' },
      { every: 10, kind: 'boss', lives: 10 },
      { every: 5, kind: 'boss', lives: 5 },
    ],
    regular: { kind: 'white', lives: 3 },
  },
  /** Red 5-hit guys all the time, a white one every 10th, the giant every 15th. */
  superHard: {
    label: 'Super hard\nSupervaikea',
    emoji: '🔥',
    specials: [
      { every: 15, kind: 'giant' },
      { every: 10, kind: 'white', lives: 3 },
    ],
    regular: { kind: 'boss', lives: 5 },
  },
};

/** The battle that plays by itself behind the start menu. */
export const DEMO = {
  heroX: 110,
  shootEveryMs: 650,
  respawnMs: 900,
  /** Every this many enemies is a red axe guy. */
  bossEvery: 4,
  bossLives: 6,
  explosionEveryMs: 1400,
  glow: { color: 0xff6a1a, alpha: 0.28, height: 130 },
} as const;

/** How the start menu looks. */
export const MENU = {
  title: 'LEON PELI',
  subtitle: 'Choose a level / Valitse taso',
  dimAlpha: 0.2,
  /** Buttons and texts are drawn above the battle. */
  depth: 100,
  button: {
    width: 320,
    height: 56,
    gap: 12,
    color: 0x2e7d32,
    hoverColor: 0x43a047,
    locked: 0x555555,
  },
  textColor: '#ffffff',
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
