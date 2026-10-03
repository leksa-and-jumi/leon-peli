import { describe, expect, it } from 'vitest';
import { bulletPowers, poisonStep } from './ammo';

const both = { poison: true, explosive: true };

describe('bulletPowers', () => {
  it('poison works in the pistol and the rifle', () => {
    expect(bulletPowers('pistol', both).poison).toBe(true);
    expect(bulletPowers('rifle', both).poison).toBe(true);
    expect(bulletPowers('smallGun', both).poison).toBe(false);
  });

  it('exploding bullets work in the rifle and the small gun', () => {
    expect(bulletPowers('rifle', both).explosive).toBe(true);
    expect(bulletPowers('smallGun', both).explosive).toBe(true);
    expect(bulletPowers('pistol', both).explosive).toBe(false);
  });

  it('does nothing without buying them', () => {
    expect(bulletPowers('rifle', { poison: false, explosive: false })).toEqual({
      poison: false,
      explosive: false,
    });
  });
});

describe('poisonStep', () => {
  it('waits until the next life is due', () => {
    expect(poisonStep(10000, 5000, 10000)).toEqual({ hurt: false, nextAt: 10000 });
  });

  it('takes a life and waits another ten seconds', () => {
    expect(poisonStep(10000, 10016, 10000)).toEqual({ hurt: true, nextAt: 20016 });
  });
});
