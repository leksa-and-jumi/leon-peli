import type { SaveStorage } from './logic/save';

/** The browser's storage for the save, or null if the browser doesn't allow it. */
export function browserStorage(): SaveStorage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
