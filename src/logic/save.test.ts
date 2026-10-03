import { describe, expect, it } from 'vitest';
import { loadSave, recordScore, writeSave, type SaveData, type SaveStorage } from './save';

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
    expect(loadSave(memoryStorage())).toEqual({
      rifle: false,
      rifleUpgrade: false,
      muted: false,
      best: {},
    });
  });

  it('remembers the rifle after saving', () => {
    const storage = memoryStorage();
    writeSave(storage, { rifle: true, rifleUpgrade: false, muted: false, best: {} });
    expect(loadSave(storage)).toEqual({ rifle: true, rifleUpgrade: false, muted: false, best: {} });
  });

  it('ignores a broken save', () => {
    const storage = memoryStorage();
    storage.data.set('leon-peli-save', '{not json');
    expect(loadSave(storage)).toEqual({
      rifle: false,
      rifleUpgrade: false,
      muted: false,
      best: {},
    });
  });

  it('works without any storage', () => {
    expect(loadSave(null)).toEqual({ rifle: false, rifleUpgrade: false, muted: false, best: {} });
    expect(() => {
      writeSave(null, { rifle: true, rifleUpgrade: false, muted: false, best: {} });
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
    expect(loadSave(blocked)).toEqual({
      rifle: false,
      rifleUpgrade: false,
      muted: false,
      best: {},
    });
    expect(() => {
      writeSave(blocked, { rifle: true, rifleUpgrade: false, muted: false, best: {} });
    }).not.toThrow();
  });
});

describe('muted', () => {
  it('remembers that sounds are off', () => {
    const storage = memoryStorage();
    writeSave(storage, { rifle: false, rifleUpgrade: false, muted: true, best: {} });
    expect(loadSave(storage)).toEqual({ rifle: false, rifleUpgrade: false, muted: true, best: {} });
  });

  it('reads an old save without the sound setting', () => {
    const storage = memoryStorage();
    storage.data.set('leon-peli-save', JSON.stringify({ rifle: true }));
    expect(loadSave(storage)).toEqual({ rifle: true, rifleUpgrade: false, muted: false, best: {} });
  });
});

describe('rifle upgrade', () => {
  it('remembers the upgrade', () => {
    const storage = memoryStorage();
    writeSave(storage, { rifle: true, rifleUpgrade: true, muted: false, best: {} });
    expect(loadSave(storage).rifleUpgrade).toBe(true);
  });
});

describe('best scores', () => {
  const fresh: SaveData = { rifle: false, rifleUpgrade: false, muted: false, best: {} };

  it('a first score is a new record', () => {
    const { save, newRecord } = recordScore(fresh, 'easy', 7);
    expect(newRecord).toBe(true);
    expect(save.best.easy).toBe(7);
  });

  it('a lower score is not a record and keeps the old best', () => {
    const withBest = { ...fresh, best: { easy: 10 } };
    const { save, newRecord } = recordScore(withBest, 'easy', 6);
    expect(newRecord).toBe(false);
    expect(save.best.easy).toBe(10);
  });

  it('each level has its own best', () => {
    const { save } = recordScore({ ...fresh, best: { easy: 10 } }, 'hard', 3);
    expect(save.best).toEqual({ easy: 10, hard: 3 });
  });

  it('remembers best scores and ignores broken ones', () => {
    const storage = memoryStorage();
    storage.data.set('leon-peli-save', JSON.stringify({ best: { easy: 5, normal: 'lots' } }));
    expect(loadSave(storage).best).toEqual({ easy: 5 });
  });
});
