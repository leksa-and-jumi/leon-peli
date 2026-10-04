import type { EnemyKind } from './spawn';

/** What a story chapter asks you to do. */
export type StoryGoal =
  | { type: 'break'; kind: EnemyKind; count: number }
  /** Find the keys and go through the door. */
  | { type: 'door' };

/** How far along the goal you are, as "done / needed" (the door is 0 or 1). */
export function goalProgress(
  goal: StoryGoal,
  broken: number,
  throughDoor: boolean,
): {
  done: number;
  needed: number;
} {
  if (goal.type === 'door') return { done: throughDoor ? 1 : 0, needed: 1 };
  return { done: Math.min(broken, goal.count), needed: goal.count };
}

/** Does breaking an enemy of `kind` count for this goal? */
export function countsFor(goal: StoryGoal, kind: EnemyKind): boolean {
  return goal.type === 'break' && goal.kind === kind;
}

/** Is the chapter done? */
export function goalDone(goal: StoryGoal, broken: number, throughDoor: boolean): boolean {
  const { done, needed } = goalProgress(goal, broken, throughDoor);
  return done >= needed;
}

/** The chapter after `chapter`, or null when the story is over. */
export function nextChapter(chapter: number, chapters: number): number | null {
  return chapter + 1 < chapters ? chapter + 1 : null;
}
