import Phaser from 'phaser';
import { SOUND, type Weapon } from '../config';

/** Whose voice: each kind of figure screams at a different pitch. */
export type Voice = 'player' | 'white' | 'boss';

/**
 * All the game's sounds, made with code (no sound files): gun bangs, footsteps,
 * screams, ouch sounds, the axe and the shop. If the browser has no Web Audio,
 * everything is just quiet.
 */
export class Sfx {
  private readonly ctx: AudioContext | null;
  private readonly master: GainNode | null;
  private readonly noise: AudioBuffer | null;

  constructor(scene: Phaser.Scene, muted: boolean) {
    const manager = scene.sound;
    this.ctx = manager instanceof Phaser.Sound.WebAudioSoundManager ? manager.context : null;
    if (!this.ctx) {
      this.master = null;
      this.noise = null;
      return;
    }
    this.master = this.ctx.createGain();
    this.master.connect(this.ctx.destination);
    this.setMuted(muted);
    // One second of random hiss, reused for bangs, steps and whooshes
    const length = this.ctx.sampleRate;
    this.noise = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = this.noise.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  }

  setMuted(muted: boolean): void {
    if (this.master) this.master.gain.value = muted ? 0 : SOUND.volume;
  }

  /** BANG: a burst of hiss and a deep thump. The rifle is sharper, the white ones' guns quieter. */
  gunshot(weapon: Weapon, quiet = false): void {
    const loud = (quiet ? SOUND.enemyGunVolume : 1) * (weapon === 'rifle' ? 1.1 : 1);
    this.hiss(0.18, weapon === 'rifle' ? 2600 : 1800, 0.9 * loud, 'lowpass');
    this.tone('sine', 140, 40, 0.14, 0.8 * loud);
  }

  /** A soft step on stone. Heavy ones (the axe guy) are deeper and louder. */
  footstep(heavy = false, quiet = false): void {
    const loud = (heavy ? 0.5 : 0.28) * (quiet ? 0.5 : 1);
    this.hiss(0.07, heavy ? 260 : 420, loud, 'bandpass', 2);
  }

  /**
   * "AAAAH-ooh!": a rough, shaky voice. It jumps up, then falls, the mouth closes
   * from "a" to "o", and a breathy hiss goes along with it.
   */
  scream(voice: Voice): void {
    const ctx = this.ctx;
    const out = this.master;
    if (!ctx || !out || !this.noise) return;
    const { start, end } = SOUND.screamPitch[voice];
    const t = ctx.currentTime;
    const length = SOUND.screamLength * (0.9 + Math.random() * 0.2);

    // The voice: a buzzy tone that cracks up at the start and then falls
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(start * 0.8, t);
    osc.frequency.exponentialRampToValueAtTime(start * 1.15, t + 0.08);
    osc.frequency.exponentialRampToValueAtTime(start, t + length * 0.4);
    osc.frequency.exponentialRampToValueAtTime(end, t + length);

    // Shaking: a wobble that gets stronger, plus a fast jitter
    const wobble = ctx.createOscillator();
    wobble.frequency.value = 6 + Math.random() * 2;
    const wobbleDepth = ctx.createGain();
    wobbleDepth.gain.setValueAtTime(start * 0.01, t);
    wobbleDepth.gain.linearRampToValueAtTime(start * 0.06, t + length);
    wobble.connect(wobbleDepth).connect(osc.frequency);
    const jitter = ctx.createOscillator();
    jitter.type = 'square';
    jitter.frequency.value = 23;
    const jitterDepth = ctx.createGain();
    jitterDepth.gain.value = start * 0.015;
    jitter.connect(jitterDepth).connect(osc.frequency);

    // Rough throat: squash the tone so it crackles
    const rasp = ctx.createWaveShaper();
    rasp.curve = raspCurve(SOUND.screamRasp);

    // Breath: hiss that goes through the same mouth
    const breath = ctx.createBufferSource();
    breath.buffer = this.noise;
    const breathGain = ctx.createGain();
    breathGain.gain.value = SOUND.screamBreath;

    const mouth = ctx.createGain();
    mouth.gain.setValueAtTime(0.0001, t);
    mouth.gain.exponentialRampToValueAtTime(SOUND.screamVolume, t + 0.03);
    mouth.gain.setValueAtTime(SOUND.screamVolume, t + length * 0.55);
    mouth.gain.exponentialRampToValueAtTime(0.0001, t + length);

    // Three mouth shapes (formants) that slide from "a" toward "o"
    osc.connect(rasp);
    for (const [fromHz, toHz, level] of SOUND.screamFormants) {
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.Q.value = 6;
      filter.frequency.setValueAtTime(fromHz, t);
      filter.frequency.linearRampToValueAtTime(toHz, t + length);
      const levelGain = ctx.createGain();
      levelGain.gain.value = level;
      rasp.connect(filter);
      breath.connect(breathGain).connect(filter);
      filter.connect(levelGain).connect(mouth);
    }
    mouth.connect(out);

    for (const node of [osc, wobble, jitter]) {
      node.start(t);
      node.stop(t + length);
    }
    breath.start(t, Math.random() * 0.2);
    breath.stop(t + length);
  }

  /** A short "uh!" when someone gets hit but doesn't break. */
  hurt(voice: Voice): void {
    const { start } = SOUND.screamPitch[voice];
    this.tone('sawtooth', start * 0.7, start * 0.45, 0.16, 0.25, 700);
  }

  /** The axe: a whoosh through the air and a heavy thud. */
  chop(): void {
    this.hiss(0.22, 900, 0.35, 'bandpass', 1);
    this.tone('sine', 90, 35, 0.18, 0.7);
  }

  /** A little "pling" when buying something. */
  buy(): void {
    this.tone('sine', 880, 880, 0.1, 0.25);
    this.tone('sine', 1320, 1320, 0.16, 0.25, undefined, 0.08);
  }

  /** A tone sliding from `from` Hz to `to` Hz, fading out. */
  private tone(
    type: OscillatorType,
    from: number,
    to: number,
    length: number,
    volume: number,
    filterHz?: number,
    delay = 0,
  ): void {
    const ctx = this.ctx;
    const out = this.master;
    if (!ctx || !out) return;
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(to, 1), t + length);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + length);
    let node: AudioNode = osc;
    if (filterHz !== undefined) {
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = filterHz;
      node = node.connect(filter);
    }
    node.connect(gain).connect(out);
    osc.start(t);
    osc.stop(t + length);
  }

  /** A burst of hiss through a filter, fading out. */
  private hiss(
    length: number,
    filterHz: number,
    volume: number,
    filterType: BiquadFilterType,
    q = 1,
  ): void {
    const ctx = this.ctx;
    const out = this.master;
    if (!ctx || !out || !this.noise) return;
    const t = ctx.currentTime;
    const source = ctx.createBufferSource();
    source.buffer = this.noise;
    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.value = filterHz;
    filter.Q.value = q;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + length);
    source.connect(filter).connect(gain).connect(out);
    source.start(t, Math.random() * 0.5);
    source.stop(t + length);
  }
}

/** A curve that squashes a sound wave, adding a rough, raspy crackle. */
function raspCurve(amount: number): Float32Array<ArrayBuffer> {
  const samples = 256;
  const curve = new Float32Array(samples);
  for (let i = 0; i < samples; i++) {
    const x = (i / (samples - 1)) * 2 - 1;
    curve[i] = ((1 + amount) * x) / (1 + amount * Math.abs(x));
  }
  return curve;
}
