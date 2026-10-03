/** What the game remembers on this computer, even after dying or closing the page. */
/** The rifle on one level: you earn it separately on every level. */
export interface LevelWeapons {
  rifle: boolean;
  /** The faster-reloading rifle upgrade from the shop. */
  rifleUpgrade: boolean;
  /** Times you have died on this level since buying the rifle. */
  deaths: number;
}

/** A game that's still going on a level, so it can continue after closing the page. */
export interface RunState {
  score: number;
  earned: number;
  lives: number;
  enemyCount: number;
  playerX: number;
  ownedOutfits: string[];
  wornOutfit: string;
  /** Other things bought for this game, like poison or exploding bullets. */
  ownedItems: string[];
  /** Which stage (door) you're on, and the number that hides its keys in the same places. */
  stage: number;
  stageSeed: number;
  /** The keys already found on this stage (by number). */
  keysFound: number[];
}

export interface SaveData {
  /** Unfinished games, one per level. */
  runs: Record<string, RunState>;
  /** Rifle and upgrade for each level (easy, normal, ...). */
  weapons: Record<string, LevelWeapons>;
  /** Sounds turned off with M. */
  muted: boolean;
  /** Best score for each level (easy, normal, ...). */
  best: Record<string, number>;
  /** The stage (door) reached on each level. Kept even after dying. */
  stages: Record<string, number>;
}

/** The bit of browser storage the save needs (localStorage fits). */
export interface SaveStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const SAVE_KEY = 'leon-peli-save';
const NO_WEAPONS: LevelWeapons = { rifle: false, rifleUpgrade: false, deaths: 0 };
/** A brand new save with nothing in it. */
function fresh(): SaveData {
  return { runs: {}, weapons: {}, muted: false, best: {}, stages: {} };
}

/** Reads the save. Anything broken or missing means a fresh save. */
export function loadSave(storage: SaveStorage | null): SaveData {
  if (!storage) return fresh();
  try {
    const raw = storage.getItem(SAVE_KEY);
    if (!raw) return fresh();
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return fresh();
    const muted = 'muted' in parsed && parsed.muted === true;
    const best: Record<string, number> = {};
    if ('best' in parsed && typeof parsed.best === 'object' && parsed.best !== null) {
      for (const [level, score] of Object.entries(parsed.best)) {
        if (typeof score === 'number' && Number.isFinite(score) && score >= 0) best[level] = score;
      }
    }
    const stages: Record<string, number> = {};
    if ('stages' in parsed && typeof parsed.stages === 'object' && parsed.stages !== null) {
      for (const [level, stage] of Object.entries(parsed.stages)) {
        if (typeof stage === 'number' && Number.isFinite(stage) && stage >= 1) {
          stages[level] = Math.floor(stage);
        }
      }
    }
    const weapons: Record<string, LevelWeapons> = {};
    if ('weapons' in parsed && typeof parsed.weapons === 'object' && parsed.weapons !== null) {
      for (const [level, w] of Object.entries(parsed.weapons)) {
        if (typeof w !== 'object' || w === null) continue;
        const deaths = 'deaths' in w && typeof w.deaths === 'number' ? w.deaths : 0;
        weapons[level] = {
          rifle: 'rifle' in w && w.rifle === true,
          rifleUpgrade: 'rifleUpgrade' in w && w.rifleUpgrade === true,
          deaths: Math.max(0, Math.floor(deaths)),
        };
      }
    }
    const runs: Record<string, RunState> = {};
    if ('runs' in parsed && typeof parsed.runs === 'object' && parsed.runs !== null) {
      for (const [level, run] of Object.entries(parsed.runs)) {
        const checked = checkRun(run);
        if (checked) runs[level] = checked;
      }
    }
    return { runs, weapons, muted, best, stages };
  } catch {
    return fresh();
  }
}

/** Writes the save. If the browser won't let us, the game still works, it just forgets. */
export function writeSave(storage: SaveStorage | null, data: SaveData): void {
  if (!storage) return;
  try {
    storage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch {
    // Saving is blocked (for example in a private window): nothing to do.
  }
}

/**
 * After a game: is this score a new record for the level? Returns the save
 * with the new best score (if it was better) and whether it was a record.
 */
export function recordScore(
  save: SaveData,
  level: string,
  score: number,
): { save: SaveData; newRecord: boolean } {
  const old = save.best[level] ?? 0;
  if (score <= old) return { save, newRecord: false };
  return { save: { ...save, best: { ...save.best, [level]: score } }, newRecord: true };
}

/** The rifle and upgrade you have on a level. */
export function weaponsFor(save: SaveData, level: string): LevelWeapons {
  return save.weapons[level] ?? { ...NO_WEAPONS };
}

/** Change what you have on one level. */
export function withWeapons(
  save: SaveData,
  level: string,
  change: Partial<LevelWeapons>,
): SaveData {
  return {
    ...save,
    weapons: { ...save.weapons, [level]: { ...weaponsFor(save, level), ...change } },
  };
}

/**
 * You died on a level. With the rifle, it counts toward losing it: after
 * `maxDeaths` deaths the rifle and its upgrade are gone. Returns the new save,
 * whether the rifle was lost, and how many deaths are left before it would be.
 */
export function afterDeath(
  save: SaveData,
  level: string,
  maxDeaths: number,
): { save: SaveData; lostRifle: boolean; deathsLeft: number | null } {
  const w = weaponsFor(save, level);
  if (!w.rifle) return { save, lostRifle: false, deathsLeft: null };
  const deaths = w.deaths + 1;
  if (deaths >= maxDeaths) {
    return { save: withWeapons(save, level, { ...NO_WEAPONS }), lostRifle: true, deathsLeft: 0 };
  }
  return {
    save: withWeapons(save, level, { deaths }),
    lostRifle: false,
    deathsLeft: maxDeaths - deaths,
  };
}

/** A saved run, if it looks right; anything strange means no run. */
function checkRun(run: unknown): RunState | null {
  if (typeof run !== 'object' || run === null) return null;
  const r = run as Record<string, unknown>;
  const num = (v: unknown): number | null =>
    typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null;
  const score = num(r.score);
  const earned = num(r.earned);
  const lives = num(r.lives);
  const enemyCount = num(r.enemyCount);
  const playerX = num(r.playerX);
  if (
    score === null ||
    earned === null ||
    lives === null ||
    enemyCount === null ||
    playerX === null
  ) {
    return null;
  }
  if (lives < 1) return null;
  const owned = Array.isArray(r.ownedOutfits)
    ? r.ownedOutfits.filter((o): o is string => typeof o === 'string')
    : [];
  const worn = typeof r.wornOutfit === 'string' ? r.wornOutfit : 'black';
  const items = Array.isArray(r.ownedItems)
    ? r.ownedItems.filter((o): o is string => typeof o === 'string')
    : [];
  const stage = typeof r.stage === 'number' && r.stage >= 1 ? Math.floor(r.stage) : 1;
  const stageSeed = typeof r.stageSeed === 'number' ? r.stageSeed : 1;
  const keysFound = Array.isArray(r.keysFound)
    ? r.keysFound.filter((k): k is number => typeof k === 'number')
    : [];
  return {
    score,
    earned,
    lives,
    enemyCount,
    playerX,
    ownedOutfits: owned,
    wornOutfit: worn,
    ownedItems: items,
    stage,
    stageSeed,
    keysFound,
  };
}

/** Remember the game going on at a level. */
export function withRun(save: SaveData, level: string, run: RunState): SaveData {
  return { ...save, runs: { ...save.runs, [level]: run } };
}

/** Forget the game at a level (after dying, the next one starts fresh). */
export function withoutRun(save: SaveData, level: string): SaveData {
  const runs = Object.fromEntries(Object.entries(save.runs).filter(([name]) => name !== level));
  return { ...save, runs };
}

/** The stage reached on `level` (1 if you haven't been through any door there yet). */
export function stageFor(save: SaveData, level: string): number {
  return save.stages[level] ?? 1;
}

/** Remember that `level` has got to `stage`. */
export function withStage(save: SaveData, level: string, stage: number): SaveData {
  return { ...save, stages: { ...save.stages, [level]: stage } };
}
