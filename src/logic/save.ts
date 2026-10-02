/** What the game remembers on this computer, even after dying or closing the page. */
export interface SaveData {
  rifle: boolean;
  /** The faster-reloading rifle upgrade from the shop. */
  rifleUpgrade: boolean;
  /** Sounds turned off with M. */
  muted: boolean;
}

/** The bit of browser storage the save needs (localStorage fits). */
export interface SaveStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const SAVE_KEY = 'leon-peli-save';
const EMPTY: SaveData = { rifle: false, rifleUpgrade: false, muted: false };

/** Reads the save. Anything broken or missing means a fresh save. */
export function loadSave(storage: SaveStorage | null): SaveData {
  if (!storage) return { ...EMPTY };
  try {
    const raw = storage.getItem(SAVE_KEY);
    if (!raw) return { ...EMPTY };
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return { ...EMPTY };
    const rifle = 'rifle' in parsed && parsed.rifle === true;
    const rifleUpgrade = 'rifleUpgrade' in parsed && parsed.rifleUpgrade === true;
    const muted = 'muted' in parsed && parsed.muted === true;
    return { rifle, rifleUpgrade, muted };
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
