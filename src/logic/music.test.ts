import { describe, expect, it } from 'vitest';
import { midiToHz, stepSeconds, tensionStep } from './music';

describe('tension music', () => {
  it('has a kick on every beat and a hi-hat between', () => {
    expect([0, 1, 2, 3, 4].map((s) => tensionStep(s).kick)).toEqual([
      true,
      false,
      false,
      false,
      true,
    ]);
    expect([0, 1, 2, 3].map((s) => tensionStep(s).hat)).toEqual([false, true, false, true]);
  });

  it('plays a chord at the start of each bar and loops every 16 steps', () => {
    expect(tensionStep(0).stab).toHaveLength(3);
    expect(tensionStep(8).stab).toHaveLength(3);
    expect(tensionStep(3).stab).toHaveLength(0);
    expect(tensionStep(16)).toEqual(tensionStep(0));
  });

  it('turns notes into frequencies and tempo into step lengths', () => {
    expect(midiToHz(69)).toBe(440);
    expect(midiToHz(57)).toBeCloseTo(220);
    expect(stepSeconds(120)).toBe(0.25);
  });
});
