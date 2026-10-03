import { TREES } from '../config';
import { createRandom } from '../logic/ruins';
import { treeVariants, type TreeShape } from '../logic/trees';
import { tileVariant } from '../logic/world';

/** The few different jungle trees, the same ones every game. */
export const TREE_SHAPES: readonly TreeShape[] = treeVariants(
  createRandom(TREES.seed),
  TREES.variants,
  TREES,
);

/** Which tree stands in screen-wide stretch number `tile` of the endless ruins. */
export function treeIndexAt(tile: number): number {
  return tileVariant(tile, TREE_SHAPES.length);
}

/** The tree in stretch number `tile`. */
export function treeAt(tile: number): TreeShape {
  const tree = TREE_SHAPES[treeIndexAt(tile)];
  if (!tree) throw new Error('No trees made');
  return tree;
}
