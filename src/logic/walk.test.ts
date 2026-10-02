import { describe, expect, it } from 'vitest';
import { facingToward, followTarget, walkTowards } from './walk';

describe('walkTowards', () => {
  it('walks left toward a target on the left', () => {
    expect(walkTowards(900, 730, 100, 100)).toBe(890);
  });

  it('walks right toward a target on the right', () => {
    expect(walkTowards(0, 100, 100, 100)).toBe(10);
  });

  it('stops exactly on the target and does not walk past it', () => {
    expect(walkTowards(735, 730, 100, 100)).toBe(730);
  });

  it('stays put once it is there', () => {
    expect(walkTowards(730, 730, 100, 100)).toBe(730);
  });

  it('rejects a negative speed', () => {
    expect(() => walkTowards(0, 10, -1, 16)).toThrow(RangeError);
  });
});

describe('followTarget', () => {
  it('stands to the right of the player when coming from the right', () => {
    expect(followTarget(700, 100, 85, 40, 740)).toBe(185);
  });

  it('stands to the left when the player has walked past', () => {
    expect(followTarget(300, 400, 85, 40, 740)).toBe(315);
  });

  it('stays on the screen', () => {
    expect(followTarget(700, 700, 85, 40, 740)).toBe(740);
    expect(followTarget(10, 60, 85, 40, 740)).toBe(40);
  });
});

describe('facingToward', () => {
  it('faces the way it walks', () => {
    expect(facingToward(100, 200, -1)).toBe(1);
    expect(facingToward(200, 100, 1)).toBe(-1);
  });

  it('keeps its old facing when standing still', () => {
    expect(facingToward(100, 100, -1)).toBe(-1);
  });
});
