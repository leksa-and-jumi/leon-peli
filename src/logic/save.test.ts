import { describe, expect, it } from 'vitest';
import {
  afterDeath,
  loadSave,
  recordScore,
  weaponsFor,
  withoutRun,
  withRun,
  withWeapons,
  writeSave,
  type RunState,
  type SaveData,
  type SaveStorage,
} from './save';

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

const fresh: SaveData = { runs: {}, weapons: {}, muted: false, best: {} };

describe('save', () => {
  it('starts empty', () => {
    expect(loadSave(memoryStorage())).toEqual(fresh);
  });

  it('remembers what was saved', () => {
    const storage = memoryStorage();
    const save = withWeapons({ ...fresh, muted: true, best: { easy: 4 } }, 'easy', { rifle: true });
    writeSave(storage, save);
    expect(loadSave(storage)).toEqual(save);
  });

  it('ignores a broken save', () => {
    const storage = memoryStorage();
    storage.data.set('leon-peli-save', '{not json');
    expect(loadSave(storage)).toEqual(fresh);
  });

  it('works without any storage', () => {
    expect(loadSave(null)).toEqual(fresh);
    expect(() => {
      writeSave(null, fresh);
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
    expect(loadSave(blocked)).toEqual(fresh);
    expect(() => {
      writeSave(blocked, fresh);
    }).not.toThrow();
  });

  it('forgets the old rifle that worked on every level', () => {
    const storage = memoryStorage();
    storage.data.set('leon-peli-save', JSON.stringify({ rifle: true, muted: true }));
    expect(loadSave(storage)).toEqual({ ...fresh, muted: true });
  });
});

describe('rifle per level', () => {
  it('a rifle bought on easy is not on normal', () => {
    const save = withWeapons(fresh, 'easy', { rifle: true });
    expect(weaponsFor(save, 'easy').rifle).toBe(true);
    expect(weaponsFor(save, 'normal').rifle).toBe(false);
  });

  it('counts deaths and loses the rifle and upgrade on the 5th', () => {
    let save = withWeapons(fresh, 'hard', { rifle: true, rifleUpgrade: true });
    for (let i = 1; i <= 4; i++) {
      const result = afterDeath(save, 'hard', 5);
      expect(result.lostRifle).toBe(false);
      expect(result.deathsLeft).toBe(5 - i);
      save = result.save;
    }
    const last = afterDeath(save, 'hard', 5);
    expect(last.lostRifle).toBe(true);
    expect(weaponsFor(last.save, 'hard')).toEqual({ rifle: false, rifleUpgrade: false, deaths: 0 });
  });

  it('dying without the rifle counts nothing', () => {
    const result = afterDeath(fresh, 'easy', 5);
    expect(result.deathsLeft).toBeNull();
    expect(result.save).toEqual(fresh);
  });

  it('dying on one level does not touch the rifle on another', () => {
    const save = withWeapons(fresh, 'easy', { rifle: true });
    const result = afterDeath(save, 'normal', 5);
    expect(weaponsFor(result.save, 'easy')).toEqual({
      rifle: true,
      rifleUpgrade: false,
      deaths: 0,
    });
  });
});

describe('best scores', () => {
  it('a first score is a new record', () => {
    const { save, newRecord } = recordScore(fresh, 'easy', 7);
    expect(newRecord).toBe(true);
    expect(save.best.easy).toBe(7);
  });

  it('a lower score is not a record and keeps the old best', () => {
    const { save, newRecord } = recordScore({ ...fresh, best: { easy: 10 } }, 'easy', 6);
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

describe('unfinished games', () => {
  const run: RunState = {
    score: 12,
    earned: 20,
    lives: 3,
    enemyCount: 9,
    playerX: 300,
    ownedOutfits: ['black', 'camo'],
    wornOutfit: 'camo',
  };

  it('remembers a game in progress on a level', () => {
    const storage = memoryStorage();
    writeSave(storage, withRun(fresh, 'normal', run));
    expect(loadSave(storage).runs.normal).toEqual(run);
    expect(loadSave(storage).runs.easy).toBeUndefined();
  });

  it('forgets it after dying', () => {
    const save = withoutRun(withRun(fresh, 'normal', run), 'normal');
    expect(save.runs.normal).toBeUndefined();
  });

  it('ignores a broken game', () => {
    const storage = memoryStorage();
    storage.data.set(
      'leon-peli-save',
      JSON.stringify({ runs: { easy: { score: 'lots' }, hard: { ...run, lives: 0 } } }),
    );
    expect(loadSave(storage).runs).toEqual({});
  });
});
