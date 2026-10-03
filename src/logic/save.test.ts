import { describe, expect, it } from 'vitest';
import { loadSave, writeSave, type SaveStorage } from './save';

function memoryStorage(): SaveStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
  };
}

describe('save', () => {
  it('starts without the rifle', () => {
    expect(loadSave(memoryStorage())).toEqual({ rifle: false, rifleUpgrade: false, muted: false });
  });

  it('remembers the rifle after saving', () => {
    const storage = memoryStorage();
    writeSave(storage, { rifle: true, rifleUpgrade: false, muted: false });
    expect(loadSave(storage)).toEqual({ rifle: true, rifleUpgrade: false, muted: false });
  });

  it('ignores a broken save', () => {
    const storage = memoryStorage();
    storage.data.set('leon-peli-save', '{not json');
    expect(loadSave(storage)).toEqual({ rifle: false, rifleUpgrade: false, muted: false });
  });

  it('works without any storage', () => {
    expect(loadSave(null)).toEqual({ rifle: false, rifleUpgrade: false, muted: false });
    expect(() => {
      writeSave(null, { rifle: true, rifleUpgrade: false, muted: false });
    }).not.toThrow();
  });

  it('keeps going if the browser blocks saving', () => {
    const blocked: SaveStorage = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };
    expect(loadSave(blocked)).toEqual({ rifle: false, rifleUpgrade: false, muted: false });
    expect(() => {
      writeSave(blocked, { rifle: true, rifleUpgrade: false, muted: false });
    }).not.toThrow();
  });
});

describe('muted', () => {
  it('remembers that sounds are off', () => {
    const storage = memoryStorage();
    writeSave(storage, { rifle: false, rifleUpgrade: false, muted: true });
    expect(loadSave(storage)).toEqual({ rifle: false, rifleUpgrade: false, muted: true });
  });

  it('reads an old save without the sound setting', () => {
    const storage = memoryStorage();
    storage.data.set('leon-peli-save', JSON.stringify({ rifle: true }));
    expect(loadSave(storage)).toEqual({ rifle: true, rifleUpgrade: false, muted: false });
  });
});

describe('rifle upgrade', () => {
  it('remembers the upgrade', () => {
    const storage = memoryStorage();
    writeSave(storage, { rifle: true, rifleUpgrade: true, muted: false });
    expect(loadSave(storage).rifleUpgrade).toBe(true);
  });
});
