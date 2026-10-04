import type { EnemyKind } from './spawn';

/** Where the door and the hidden keys are on one stage. */
export interface StageLayout {
  doorX: number;
  keys: { x: number; y: number }[];
}

export interface StageRules {
  /** After this stage it starts again from stage 1. */
  last: number;
  /** How far from the start the door is. */
  doorDistance: { min: number; max: number };
  /** How far from the start keys are hidden. */
  keyDistance: { min: number; max: number };
  /** Keys out in the open float this high (screen y): you have to jump for them. */
  jumpKeyY: { min: number; max: number };
  /** How many keys (0..1) hang high up near a vine, so you must swing or flip to reach them. */
  vineKeyShare: number;
  /** A vine key is this far to the side of its vine... */
  vineReach: { min: number; max: number };
  /** ...just inside the arc the vine's end swings along (it's this long). */
  vineLength: number;
  /** Vine keys are never lower than this, so a plain jump can't reach them. */
  vineKeyMaxY: number;
  /** Keys and the door are at least this far apart. */
  minGap: number;
}

/** Stage 1 needs one key, stage 2 two keys, and so on. */
export function keysNeeded(stage: number): number {
  return stage;
}

/** The stage after `stage`: after the last one it starts again from 1. */
export function nextStage(stage: number, last: number): number {
  return stage >= last ? 1 : stage + 1;
}

/** The last stages have only one kind of enemy: red on 8, green giants on 9, brown brutes on 10. */
const ONLY_KIND: Readonly<Record<number, EnemyKind>> = { 8: 'boss', 9: 'giant', 10: 'brute' };

/** Which kind of enemy is the only one on this stage, or null when they're mixed. */
export function stageOnlyKind(stage: number): EnemyKind | null {
  return ONLY_KIND[stage] ?? null;
}

/** Points for getting through the door: 10 on stage 1, 20 on stage 2... 100 on stage 10. */
export function doorReward(stage: number): number {
  return stage * 10;
}

/** Can the door be opened with the keys found? */
export function canOpen(found: number, stage: number): boolean {
  return found >= keysNeeded(stage);
}

/**
 * Puts the door somewhere left or right of `startX`, and hides the keys: some up in the
 * air where you must jump, some high beside a vine where you must swing or flip.
 * `vines` are where the vines hang (in the walkable world); keys never sit too close together.
 */
export function stageLayout(
  random: () => number,
  stage: number,
  startX: number,
  rules: StageRules,
  vines: readonly { x: number; y: number }[] = [],
): StageLayout {
  const pick = (min: number, max: number): number => min + random() * (max - min);
  const side = (): 1 | -1 => (random() < 0.5 ? -1 : 1);
  const doorX = startX + side() * pick(rules.doorDistance.min, rules.doorDistance.max);
  const taken = [doorX];
  const free = (x: number): boolean => taken.every((t) => Math.abs(t - x) >= rules.minGap);
  const inRange = (x: number): boolean => {
    const d = Math.abs(x - startX);
    return d >= rules.keyDistance.min && d <= rules.keyDistance.max;
  };
  const keys: { x: number; y: number }[] = [];
  for (let i = 0; i < keysNeeded(stage); i++) {
    let key: { x: number; y: number } | null = null;
    // High up by a vine: on its swing arc, so only swinging or flipping gets there
    if (vines.length > 0 && random() < rules.vineKeyShare) {
      for (let tries = 0; tries < 30 && !key; tries++) {
        const vine = vines[Math.floor(random() * vines.length)];
        if (!vine) continue;
        // Far enough out that the spot on the arc is above jumping height
        const drop = rules.vineKeyMaxY + 15 - vine.y;
        const nearest = drop >= rules.vineLength ? 0 : Math.sqrt(rules.vineLength ** 2 - drop ** 2);
        const dxMin = Math.max(rules.vineReach.min, nearest);
        if (dxMin > rules.vineReach.max) continue;
        const dx = pick(dxMin, rules.vineReach.max);
        const x = vine.x + side() * dx;
        const arcY = vine.y + Math.sqrt(rules.vineLength ** 2 - dx * dx);
        if (inRange(x) && free(x)) key = { x, y: arcY - 15 };
      }
    }
    // Otherwise out in the open, high enough that you have to jump
    for (let tries = 0; tries < 30 && !key; tries++) {
      const x = startX + side() * pick(rules.keyDistance.min, rules.keyDistance.max);
      if (free(x) || tries === 29) key = { x, y: pick(rules.jumpKeyY.min, rules.jumpKeyY.max) };
    }
    if (!key) continue;
    taken.push(key.x);
    keys.push(key);
  }
  return { doorX, keys };
}
