/** Keep a value inside [min, max]. */
export function clamp(value: number, min: number, max: number): number {
  if (min > max) {
    throw new RangeError(`min (${min}) must not be greater than max (${max})`);
  }
  return Math.min(Math.max(value, min), max);
}

/** Random position that keeps an object of `size` fully inside the area. */
export function randomPosition(
  width: number,
  height: number,
  size: number,
  random: () => number = Math.random,
): { x: number; y: number } {
  const half = size / 2;
  return {
    x: half + random() * (width - size),
    y: half + random() * (height - size),
  };
}
