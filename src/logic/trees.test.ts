import { describe, expect, it } from 'vitest';
import { createRandom } from './ruins';
import { branchHalfThickness, branchMiddleY, branchStartX, makeTree, treeVariants } from './trees';

const rules = {
  tileWidth: 800,
  trunkHalf: 30,
  branchY: { min: 26, max: 46 },
  droop: { min: 0, max: 24 },
  length: { min: 430, max: 620 },
  thickness: { min: 48, max: 60 },
  trunkInset: { min: 10, max: 110 },
  vineSpots: [
    { min: 0.35, max: 0.5 },
    { min: 0.7, max: 0.85 },
  ],
  edge: 20,
};

describe('makeTree', () => {
  it('always fits on the screen, with the vines on the branch', () => {
    const random = createRandom(7);
    for (let i = 0; i < 50; i++) {
      const tree = makeTree(random, rules);
      const tip = branchStartX(tree, rules.trunkHalf) + tree.direction * tree.length;
      expect(tip).toBeGreaterThanOrEqual(rules.edge - 0.001);
      expect(tip).toBeLessThanOrEqual(800 - rules.edge + 0.001);
      expect(tree.anchors).toHaveLength(2);
      for (const a of tree.anchors) {
        const along = (a.x - branchStartX(tree, rules.trunkHalf)) * tree.direction;
        expect(along).toBeGreaterThan(0);
        expect(along).toBeLessThan(tree.length);
        expect(a.y).toBeCloseTo(branchMiddleY(tree, along));
        // High enough to jump to, low enough that you hang above the ground
        expect(a.y).toBeGreaterThanOrEqual(20);
        expect(a.y).toBeLessThanOrEqual(80);
      }
    }
  });
});

describe('treeVariants', () => {
  it('makes the same trees for the same seed, and they differ from each other', () => {
    const a = treeVariants(createRandom(3), 5, rules);
    const b = treeVariants(createRandom(3), 5, rules);
    expect(a).toEqual(b);
    expect(new Set(a.map((t) => Math.round(t.trunkX))).size).toBeGreaterThan(1);
  });
});

describe('branch', () => {
  const tree = makeTree(createRandom(1), rules);

  it('is thick at the trunk and thin at the tip', () => {
    expect(branchHalfThickness(tree, 0)).toBeGreaterThan(branchHalfThickness(tree, tree.length));
  });

  it('droops lower toward the tip', () => {
    expect(branchMiddleY(tree, tree.length) - Math.sin(tree.length / 90) * 3).toBeCloseTo(
      tree.branchY + tree.droop,
    );
  });
});
