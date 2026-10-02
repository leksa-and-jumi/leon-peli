import { describe, expect, it } from 'vitest';
import { enemyKind, isBossTurn } from './spawn';

describe('isBossTurn', () => {
  it('makes every 15th enemy the boss', () => {
    expect(isBossTurn(15, 15)).toBe(true);
    expect(isBossTurn(30, 15)).toBe(true);
  });

  it('keeps the others as white stick figures', () => {
    expect(isBossTurn(1, 15)).toBe(false);
    expect(isBossTurn(14, 15)).toBe(false);
    expect(isBossTurn(16, 15)).toBe(false);
  });

  it('rejects zero', () => {
    expect(() => isBossTurn(1, 0)).toThrow(RangeError);
  });
});

describe('enemyKind', () => {
  it('starts with white ones', () => {
    expect(enemyKind(1, 15, 30)).toBe('white');
    expect(enemyKind(29, 15, 30)).toBe('white');
  });

  it('every 15th is the axe guy', () => {
    expect(enemyKind(15, 15, 30)).toBe('boss');
    expect(enemyKind(45, 15, 30)).toBe('boss');
  });

  it('every 30th is the giant instead', () => {
    expect(enemyKind(30, 15, 30)).toBe('giant');
    expect(enemyKind(60, 15, 30)).toBe('giant');
  });
});
