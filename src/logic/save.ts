/** What the game remembers on this computer, even after dying or closing the page. */
export interface SaveData {
  rifle: boolean;
  /** The faster-reloading rifle upgrade from the shop. */
  rifleUpgrade: boolean;
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
const EMPTY: SaveData = { rifle: false, rifleUpgrade: false, muted: false, best: {} };

/** Reads the save. Anything broken or missing means a fresh save. */
export function loadSave(storage: SaveStorage | null): SaveData {
  if (!storage) return { ...EMPTY, best: {} };
  try {
    const raw = storage.getItem(SAVE_KEY);
    if (!raw) return { ...EMPTY, best: {} };
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return { ...EMPTY, best: {} };
    const rifle = 'rifle' in parsed && parsed.rifle === true;
    const rifleUpgrade = 'rifleUpgrade' in parsed && parsed.rifleUpgrade === true;
    const muted = 'muted' in parsed && parsed.muted === true;
    const best: Record<string, number> = {};
    if ('best' in parsed && typeof parsed.best === 'object' && parsed.best !== null) {
      for (const [level, score] of Object.entries(parsed.best)) {
        if (typeof score === 'number' && Number.isFinite(score) && score >= 0) best[level] = score;
      }
    }
    return { rifle, rifleUpgrade, muted, best };
  } catch {
    return { ...EMPTY, best: {} };
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
