import { describe, expect, it } from 'vitest';
import { canShoot, reloadProgress } from './reload';

describe('canShoot', () => {
  it('lets the first shot go right away', () => {
    expect(canShoot(0, null, 5000)).toBe(true);
  });

  it('blocks shooting until five seconds have passed', () => {
    expect(canShoot(4999, 0, 5000)).toBe(false);
    expect(canShoot(5000, 0, 5000)).toBe(true);
  });
});

describe('reloadProgress', () => {
  it('is half way after half the time', () => {
    expect(reloadProgress(2500, 0, 5000)).toBe(0.5);
  });

  it('never goes past full', () => {
    expect(reloadProgress(99999, 0, 5000)).toBe(1);
  });

  it('is full before the first shot', () => {
    expect(reloadProgress(0, null, 5000)).toBe(1);
  });
});
