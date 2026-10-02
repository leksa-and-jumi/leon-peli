/**
 * The gun has to reload between shots.
 * `lastShotMs` is null before the first shot, so the first shot always works.
 */
export function canShoot(nowMs: number, lastShotMs: number | null, cooldownMs: number): boolean {
  return reloadProgress(nowMs, lastShotMs, cooldownMs) >= 1;
}

/** How far the reload has come: 0 = just shot, 1 = ready to shoot. */
export function reloadProgress(
  nowMs: number,
  lastShotMs: number | null,
  cooldownMs: number,
): number {
  if (lastShotMs === null || cooldownMs <= 0) return 1;
  return Math.min(Math.max((nowMs - lastShotMs) / cooldownMs, 0), 1);
}
