/** What plays on one step (an eighth note) of the tension music. */
export interface MusicStep {
  /** A low bass note (MIDI number), or null for a rest. */
  bass: number | null;
  /** A short spooky chord (MIDI numbers), on some steps. */
  stab: readonly number[];
  kick: boolean;
  hat: boolean;
}

/** The bass line over two bars: A, A, A, C... with a creepy D# that makes it tense. */
const BASS: readonly (number | null)[] = [
  33, 33, 33, 36, 33, 33, 33, 39, 33, 33, 33, 36, 33, 40, 39, 36,
];
/** A minor chord and a darker one, played on the first beat of each bar. */
const STABS: readonly (readonly number[])[] = [
  [57, 60, 64],
  [56, 59, 63],
];

/** The music on step number `step` (it loops every 16 steps). */
export function tensionStep(step: number): MusicStep {
  const i = ((step % BASS.length) + BASS.length) % BASS.length;
  return {
    bass: BASS[i] ?? null,
    stab: i % 8 === 0 ? (STABS[i / 8] ?? []) : [],
    kick: i % 4 === 0,
    hat: i % 2 === 1,
  };
}

/** The frequency of a MIDI note: 69 is the A at 440 Hz. */
export function midiToHz(note: number): number {
  return 440 * 2 ** ((note - 69) / 12);
}

/** How long one step (an eighth note) lasts at `bpm` beats per minute. */
export function stepSeconds(bpm: number): number {
  return 60 / bpm / 2;
}
