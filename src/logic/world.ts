/** A spot that repeats every `tileWidth` pixels, like the vines in the repeating ruins. */
export interface RepeatedSpot {
  x: number;
  y: number;
  /** The same number for the same copy every time, so it can be remembered. */
  id: number;
}

/**
 * All copies of `spots` (given for one tile, from x = 0) whose x is between `fromX` and `toX`,
 * when the tile repeats forever to both sides.
 */
export function repeatedSpots(
  spots: readonly { x: number; y: number }[],
  tileWidth: number,
  fromX: number,
  toX: number,
): RepeatedSpot[] {
  const result: RepeatedSpot[] = [];
  const first = Math.floor(fromX / tileWidth) - 1;
  const last = Math.floor(toX / tileWidth) + 1;
  for (let tile = first; tile <= last; tile++) {
    spots.forEach((spot, index) => {
      const x = spot.x + tile * tileWidth;
      if (x >= fromX && x <= toX) result.push({ x, y: spot.y, id: tile * spots.length + index });
    });
  }
  return result;
}

/** Which side a new enemy comes from: -1 = left, 1 = right. `random` is 0..1. */
export function spawnSide(random: number): 1 | -1 {
  return random < 0.5 ? -1 : 1;
}

/** Can another enemy come in now? Never more than `max` at once. */
export function canSpawn(alive: number, max: number, now: number, nextAt: number): boolean {
  return alive < max && now >= nextAt;
}

/** Where a shooter stands: `standOff` away from the player, on its own side. */
export function standSpot(playerX: number, side: 1 | -1, standOff: number): number {
  return playerX + side * standOff;
}

/** Moves the camera part of the way toward keeping the player in the middle. */
export function followCamera(
  scrollX: number,
  playerX: number,
  screenWidth: number,
  step: number,
): number {
  const target = playerX - screenWidth / 2;
  return scrollX + (target - scrollX) * Math.min(Math.max(step, 0), 1);
}
