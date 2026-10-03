/** A points bubble floating up through the air. */
export interface Bubble {
  /** Where its wobble is centred. */
  baseX: number;
  x: number;
  y: number;
  /** How long it has been flying, in seconds. */
  age: number;
  /** Makes each bubble wobble a little differently. */
  phase: number;
}

export interface BubbleRules {
  /** Pixels per second upward. */
  riseSpeed: number;
  /** How far it sways left and right. */
  wobble: number;
  /** Sways per second (in radians). */
  wobbleSpeed: number;
}

/** Moves a bubble up and sways it gently from side to side. */
export function riseStep(bubble: Bubble, deltaMs: number, rules: BubbleRules): Bubble {
  const age = bubble.age + deltaMs / 1000;
  return {
    ...bubble,
    age,
    y: bubble.y - (rules.riseSpeed * deltaMs) / 1000,
    x: bubble.baseX + Math.sin(age * rules.wobbleSpeed + bubble.phase) * rules.wobble,
  };
}

/** Has the bubble floated off the top of the screen? */
export function floatedAway(bubble: Bubble, radius: number): boolean {
  return bubble.y < -radius;
}

/** Does a round bubble touch a box (like the player)? */
export function touches(
  circle: { x: number; y: number; radius: number },
  box: { left: number; right: number; top: number; bottom: number },
): boolean {
  const nearestX = Math.min(Math.max(circle.x, box.left), box.right);
  const nearestY = Math.min(Math.max(circle.y, box.top), box.bottom);
  return Math.hypot(circle.x - nearestX, circle.y - nearestY) <= circle.radius;
}

/** A random wait before the next bubble: `random` is 0..1. */
export function nextBubbleDelay(random: number, minMs: number, maxMs: number): number {
  const r = Math.min(Math.max(random, 0), 1);
  return minMs + r * (maxMs - minMs);
}
