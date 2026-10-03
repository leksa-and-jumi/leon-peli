/** One moment in the sky's colour cycle: a see-through colour laid over the sky. */
export interface SkyStop {
  color: number;
  alpha: number;
}

/** Mixes two colours: `t` = 0 gives `a`, 1 gives `b`. */
export function mixRgb(a: number, b: number, t: number): number {
  const ch = (c: number, shift: number): number => (c >> shift) & 0xff;
  const mix = (shift: number): number =>
    Math.round(ch(a, shift) + (ch(b, shift) - ch(a, shift)) * t);
  return (mix(16) << 16) | (mix(8) << 8) | mix(0);
}

/**
 * The sky's tint at `timeMs`: it glides softly from stop to stop and round again,
 * one full round every `cycleMs`.
 */
export function skyTintAt(timeMs: number, cycleMs: number, stops: readonly SkyStop[]): SkyStop {
  const first = stops[0];
  if (!first) return { color: 0, alpha: 0 };
  const turn = (((timeMs % cycleMs) + cycleMs) % cycleMs) / cycleMs;
  const pos = turn * stops.length;
  const index = Math.floor(pos);
  const from = stops[index % stops.length] ?? first;
  const to = stops[(index + 1) % stops.length] ?? first;
  // Smooth start and end of each glide
  const raw = pos - index;
  const t = raw * raw * (3 - 2 * raw);
  return {
    color: mixRgb(from.color, to.color, t),
    alpha: from.alpha + (to.alpha - from.alpha) * t,
  };
}
