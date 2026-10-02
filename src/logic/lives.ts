/** One bullet hit takes one life. Lives never go below zero. */
export function loseLife(lives: number): number {
  return Math.max(lives - 1, 0);
}

/** Hearts to show: full ones for lives left, white ones for lives lost. */
export function formatLives(lives: number, maxLives: number): string {
  if (lives < 0 || lives > maxLives) {
    throw new RangeError(`Lives must be between 0 and ${maxLives}`);
  }
  return '❤️'.repeat(lives) + '🤍'.repeat(maxLives - lives);
}
