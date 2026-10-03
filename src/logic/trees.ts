import type { Spot } from './liana';

/** One tree: where its trunk stands, which way its branch grows, and where the vines hang. */
export interface TreeShape {
  /** The middle of the trunk. */
  trunkX: number;
  /** The branch grows to the right (1) or to the left (-1). */
  direction: 1 | -1;
  /** Height of the middle of the branch where it leaves the trunk. */
  branchY: number;
  /** How far the branch reaches. */
  length: number;
  /** How much lower the tip hangs than the start. */
  droop: number;
  /** How thick the branch is at the trunk. */
  thickness: number;
  /** Where the vines hang from the branch. */
  anchors: Spot[];
}

/** Limits for making trees, so they always fit on the screen and the vines can be reached. */
export interface TreeRules {
  tileWidth: number;
  /** Half the trunk's width: the branch starts this far from the trunk's middle. */
  trunkHalf: number;
  branchY: { min: number; max: number };
  droop: { min: number; max: number };
  length: { min: number; max: number };
  thickness: { min: number; max: number };
  /** How far in from the screen edge the trunk stands. */
  trunkInset: { min: number; max: number };
  /** Where along the branch (0 = trunk, 1 = tip) each vine hangs. */
  vineSpots: readonly { min: number; max: number }[];
  /** Keep the tip this far from the screen edge. */
  edge: number;
}

/** Where the branch starts, next to the trunk. */
export function branchStartX(tree: TreeShape, trunkHalf: number): number {
  return tree.trunkX + tree.direction * trunkHalf;
}

/** The height of the middle of the branch, `along` pixels out from the trunk. */
export function branchMiddleY(tree: TreeShape, along: number): number {
  const t = Math.min(Math.max(along / tree.length, 0), 1);
  return tree.branchY + tree.droop * t * t + Math.sin(along / 90) * 3;
}

/** Half the branch's thickness, `along` pixels out: thick at the trunk, thin at the tip. */
export function branchHalfThickness(tree: TreeShape, along: number): number {
  const t = Math.min(Math.max(along / tree.length, 0), 1);
  return (tree.thickness / 2) * (1 - 0.7 * t);
}

/** Makes one tree from random numbers (0..1), always within the rules. */
export function makeTree(random: () => number, rules: TreeRules): TreeShape {
  const pick = (r: { min: number; max: number }): number => r.min + random() * (r.max - r.min);
  const direction: 1 | -1 = random() < 0.5 ? 1 : -1;
  const inset = pick(rules.trunkInset);
  const trunkX = direction === 1 ? inset : rules.tileWidth - inset;
  const start = trunkX + direction * rules.trunkHalf;
  // The branch never reaches past the far edge of the screen
  const room = direction === 1 ? rules.tileWidth - rules.edge - start : start - rules.edge;
  const length = Math.min(pick(rules.length), room);
  const tree: TreeShape = {
    trunkX,
    direction,
    branchY: pick(rules.branchY),
    length,
    droop: pick(rules.droop),
    thickness: pick(rules.thickness),
    anchors: [],
  };
  tree.anchors = rules.vineSpots.map((spot) => {
    const along = pick(spot) * length;
    return { x: start + direction * along, y: branchMiddleY(tree, along) };
  });
  return tree;
}

/** A few different trees, the same ones every time for the same `seed`. */
export function treeVariants(random: () => number, count: number, rules: TreeRules): TreeShape[] {
  return Array.from({ length: count }, () => makeTree(random, rules));
}
