import { describe, expect, it } from 'vitest';
import { arcPoint } from './arc';

const from = { x: 0, y: 100 };
const to = { x: 100, y: 100 };

describe('arcPoint', () => {
  it('starts at the start and lands at the end', () => {
    expect(arcPoint(from, to, 40, 0)).toEqual(from);
    expect(arcPoint(from, to, 40, 1)).toEqual(to);
  });

  it('is highest in the middle', () => {
    expect(arcPoint(from, to, 40, 0.5)).toEqual({ x: 50, y: 60 });
  });

  it('stays at the ends when t goes past them', () => {
    expect(arcPoint(from, to, 40, 2)).toEqual(to);
  });
});
