import { describe, expect, it } from 'vitest';
import { createRandom } from './ruins';
import { CLASSIC_RUINS, makeRuinLayout, ruinSpans } from './ruinLayout';

describe('makeRuinLayout', () => {
  it('fits in the stretch with nothing on top of each other', () => {
    const random = createRandom(11);
    for (let i = 0; i < 100; i++) {
      const spans = ruinSpans(makeRuinLayout(random, 800));
      expect(spans.length).toBeGreaterThanOrEqual(3);
      for (const [k, s] of spans.entries()) {
        expect(s.left).toBeGreaterThanOrEqual(0);
        expect(s.right).toBeLessThanOrEqual(800);
        const next = spans[k + 1];
        if (next) expect(next.left).toBeGreaterThanOrEqual(s.right);
      }
    }
  });

  it('makes different ruins from different random numbers', () => {
    const a = makeRuinLayout(createRandom(1), 800);
    const b = makeRuinLayout(createRandom(2), 800);
    expect(a).not.toEqual(b);
  });
});

describe('CLASSIC_RUINS', () => {
  it('keeps the first ruins Leo made', () => {
    expect(ruinSpans(CLASSIC_RUINS)).toHaveLength(4);
  });
});
