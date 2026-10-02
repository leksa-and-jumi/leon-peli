/** What the game remembers on this computer, even after dying or closing the page. */
export interface SaveData {
  rifle: boolean;
}

/** The bit of browser storage the save needs (localStorage fits). */
export interface SaveStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const SAVE_KEY = 'leon-peli-save';
const EMPTY: SaveData = { rifle: false };

/** Reads the save. Anything broken or missing means a fresh save. */
export function loadSave(storage: SaveStorage | null): SaveData {
  if (!storage) return { ...EMPTY };
  try {
    const raw = storage.getItem(SAVE_KEY);
    if (!raw) return { ...EMPTY };
    const parsed: unknown = JSON.parse(raw);
    const rifle =
      typeof parsed === 'object' && parsed !== null && 'rifle' in parsed && parsed.rifle === true;
    return { rifle };
  } catch {
    return { ...EMPTY };
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
