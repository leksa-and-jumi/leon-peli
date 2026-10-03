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
  /** How far from the start keys are hidden (further on later stages). */
  keyDistance: { min: number; max: number; morePerStage: number };
  /** How high keys float (screen y): some you can just walk into, some need a jump. */
  keyY: { min: number; max: number };
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

/** On the last stage only the green giants come. */
export function onlyGiants(stage: number, last: number): boolean {
  return stage === last;
}

/** Can the door be opened with the keys found? */
export function canOpen(found: number, stage: number): boolean {
  return found >= keysNeeded(stage);
}

/** Puts the door and the keys somewhere left or right of `startX`, never too close together. */
export function stageLayout(
  random: () => number,
  stage: number,
  startX: number,
  rules: StageRules,
): StageLayout {
  const pick = (min: number, max: number): number => min + random() * (max - min);
  const side = (): 1 | -1 => (random() < 0.5 ? -1 : 1);
  const doorX = startX + side() * pick(rules.doorDistance.min, rules.doorDistance.max);
  const taken = [doorX];
  const keys: { x: number; y: number }[] = [];
  const far = rules.keyDistance.max + rules.keyDistance.morePerStage * (stage - 1);
  for (let i = 0; i < keysNeeded(stage); i++) {
    let x = startX + side() * pick(rules.keyDistance.min, far);
    // Try a few spots so keys don't sit on the door or on each other
    for (let tries = 0; tries < 30 && taken.some((t) => Math.abs(t - x) < rules.minGap); tries++) {
      x = startX + side() * pick(rules.keyDistance.min, far);
    }
    taken.push(x);
    keys.push({ x, y: pick(rules.keyY.min, rules.keyY.max) });
  }
  return { doorX, keys };
}
