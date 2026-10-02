import { describe, expect, it } from 'vitest';
import { walkTowards } from './walk';

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
