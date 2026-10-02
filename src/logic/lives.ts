/** One bullet hit takes one life. Lives never go below zero. */
export function loseLife(lives: number): number {
  return Math.max(lives - 1, 0);
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
