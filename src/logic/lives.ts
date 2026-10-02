/** One bullet hit takes one life (a giant's smash takes more). Lives never go below zero. */
export function loseLife(lives: number, amount = 1): number {
  return Math.max(lives - amount, 0);
}

/**
 * Hearts to show: full ones for lives left, white ones for lives lost
 * from the starting lives. Extra lives from the shop add more red hearts.
 */
export function formatLives(lives: number, startLives: number): string {
  if (lives < 0) {
    throw new RangeError('Lives must not be negative');
  }
  return '❤️'.repeat(lives) + '🤍'.repeat(Math.max(startLives - lives, 0));
}
