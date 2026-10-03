/** What the game remembers on this computer, even after dying or closing the page. */
/** The rifle on one level: you earn it separately on every level. */
export interface LevelWeapons {
  rifle: boolean;
  /** The faster-reloading rifle upgrade from the shop. */
  rifleUpgrade: boolean;
  /** Times you have died on this level since buying the rifle. */
  deaths: number;
}

export interface SaveData {
  /** Rifle and upgrade for each level (easy, normal, ...). */
  weapons: Record<string, LevelWeapons>;
  /** Sounds turned off with M. */
  muted: boolean;
  /** Best score for each level (easy, normal, ...). */
  best: Record<string, number>;
}

/** The bit of browser storage the save needs (localStorage fits). */
export interface SaveStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const SAVE_KEY = 'leon-peli-save';
const NO_WEAPONS: LevelWeapons = { rifle: false, rifleUpgrade: false, deaths: 0 };
const EMPTY: SaveData = { weapons: {}, muted: false, best: {} };

/** Reads the save. Anything broken or missing means a fresh save. */
export function loadSave(storage: SaveStorage | null): SaveData {
  if (!storage) return { ...EMPTY, weapons: {}, best: {} };
  try {
    const raw = storage.getItem(SAVE_KEY);
    if (!raw) return { ...EMPTY, weapons: {}, best: {} };
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return { ...EMPTY, weapons: {}, best: {} };
    const muted = 'muted' in parsed && parsed.muted === true;
    const best: Record<string, number> = {};
    if ('best' in parsed && typeof parsed.best === 'object' && parsed.best !== null) {
      for (const [level, score] of Object.entries(parsed.best)) {
        if (typeof score === 'number' && Number.isFinite(score) && score >= 0) best[level] = score;
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
    return { weapons, muted, best };
  } catch {
    return { ...EMPTY, weapons: {}, best: {} };
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
