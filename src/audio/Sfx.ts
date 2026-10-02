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
  /** An echo like in big stone ruins. Loud sounds go here too. */
  private readonly echo: GainNode | null;
  /** The buzz of vocal cords: softer and more human than a plain sawtooth. */
  private readonly throat: PeriodicWave | null;

  constructor(scene: Phaser.Scene, muted: boolean) {
    const manager = scene.sound;
    this.ctx = manager instanceof Phaser.Sound.WebAudioSoundManager ? manager.context : null;
    if (!this.ctx) {
      this.master = null;
      this.noise = null;
      this.echo = null;
      this.throat = null;
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

    // Echo: hiss that fades away, used as the "sound of the room"
    const echoLength = Math.floor(this.ctx.sampleRate * SOUND.echoSeconds);
    const impulse = this.ctx.createBuffer(2, echoLength, this.ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = impulse.getChannelData(ch);
      for (let i = 0; i < echoLength; i++) {
        d[i] = (Math.random() * 2 - 1) * (1 - i / echoLength) ** 2.5;
      }
    }
    const room = this.ctx.createConvolver();
    room.buffer = impulse;
    this.echo = this.ctx.createGain();
    this.echo.gain.value = SOUND.echoLevel;
    this.echo.connect(room).connect(this.master);

    // Vocal cords: lots of overtones that get quieter higher up
    const harmonics = 40;
    const real = new Float32Array(harmonics);
    const imag = new Float32Array(harmonics);
    for (let n = 1; n < harmonics; n++) imag[n] = 1 / n ** 1.3;
    this.throat = this.ctx.createPeriodicWave(real, imag);
  }

  setMuted(muted: boolean): void {
    if (this.master) this.master.gain.value = muted ? 0 : SOUND.volume;
  }

  /**
   * BANG, in layers like a real shot: a sharp crack, a blast of hiss that darkens
   * as it fades, a deep boom, the echo of the ruins and the click of the gun.
   * The rifle is a bit bigger; the white ones' guns are further away, so quieter.
   */
  gunshot(weapon: Weapon, quiet = false): void {
    const ctx = this.ctx;
    const out = this.master;
    if (!ctx || !out || !this.noise) return;
    const loud = (quiet ? SOUND.enemyGunVolume : 1) * (weapon === 'rifle' ? 1.15 : 1);
    const t = ctx.currentTime;

    // All layers go through a squasher, so the bang is punchy without crackling
    const bus = ctx.createDynamicsCompressor();
    bus.threshold.value = -12;
    bus.ratio.value = 6;
    bus.attack.value = 0.001;
    bus.release.value = 0.1;
    bus.connect(out);
    if (this.echo) bus.connect(this.echo);

    // 1. Crack: a very short, very bright snap
    this.noiseBurst(bus, t, 0.012, 'highpass', 2000, 1.4 * loud);
    // 2. Blast: hiss that starts bright and gets darker while fading
    const blast = this.noiseBurst(bus, t, SOUND.gunBlastSeconds, 'lowpass', 6000, 1.0 * loud);
    blast?.frequency.exponentialRampToValueAtTime(350, t + SOUND.gunBlastSeconds);
    // 3. Boom: a deep thump you feel more than hear
    const boom = ctx.createOscillator();
    boom.frequency.setValueAtTime(weapon === 'rifle' ? 120 : 160, t);
    boom.frequency.exponentialRampToValueAtTime(38, t + 0.18);
    const boomGain = ctx.createGain();
    boomGain.gain.setValueAtTime(1.1 * loud, t);
    boomGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    boom.connect(boomGain).connect(bus);
    boom.start(t);
    boom.stop(t + 0.2);
    // 4. The gun's metal parts clicking back
    const clickAt = t + (weapon === 'rifle' ? 0.05 : 0.08);
    this.noiseBurst(out, clickAt, 0.015, 'bandpass', 3200, 0.25 * loud, 8);
    if (weapon === 'rifle')
      this.noiseBurst(out, clickAt + 0.035, 0.012, 'bandpass', 2600, 0.2 * loud, 8);
  }

  /** A short burst of hiss through a filter into `into`, fading out. Returns the filter. */
  private noiseBurst(
    into: AudioNode,
    at: number,
    length: number,
    type: BiquadFilterType,
    hz: number,
    volume: number,
    q = 0.7,
  ): BiquadFilterNode | null {
    const ctx = this.ctx;
    if (!ctx || !this.noise) return null;
    const source = ctx.createBufferSource();
    source.buffer = this.noise;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.setValueAtTime(hz, at);
    filter.Q.value = q;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, at);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + length);
    source.connect(filter).connect(gain).connect(into);
    source.start(at, Math.random() * 0.5);
    source.stop(at + length);
    return filter;
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
    if (this.throat) osc.setPeriodicWave(this.throat);
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

    // A second voice a tiny bit out of tune makes it fuller, like a real throat
    const osc2 = ctx.createOscillator();
    if (this.throat) osc2.setPeriodicWave(this.throat);
    osc2.detune.value = 12;
    osc2.frequency.setValueAtTime(start * 0.8, t);
    osc2.frequency.exponentialRampToValueAtTime(start * 1.15, t + 0.08);
    osc2.frequency.exponentialRampToValueAtTime(start, t + length * 0.4);
    osc2.frequency.exponentialRampToValueAtTime(end, t + length);
    wobbleDepth.connect(osc2.frequency);

    // Rough throat: squash the tone so it crackles
    const rasp = ctx.createWaveShaper();
    rasp.curve = raspCurve(SOUND.screamRasp);

    // Breath: hiss that goes through the same mouth
    const breath = ctx.createBufferSource();
    breath.buffer = this.noise;
    const breathGain = ctx.createGain();

    const mouth = ctx.createGain();
    mouth.gain.setValueAtTime(0.0001, t);
    mouth.gain.exponentialRampToValueAtTime(SOUND.screamVolume, t + 0.03);
    mouth.gain.setValueAtTime(SOUND.screamVolume, t + length * 0.55);
    mouth.gain.exponentialRampToValueAtTime(0.0001, t + length);

    // Three mouth shapes (formants) that slide from "a" toward "o"
    osc.connect(rasp);
    osc2.connect(rasp);
    // A sharp breath "h" right at the start
    breathGain.gain.setValueAtTime(SOUND.screamBreath * 3, t);
    breathGain.gain.exponentialRampToValueAtTime(SOUND.screamBreath, t + 0.12);
    for (const [fromHz, toHz, level] of SOUND.screamFormants) {
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.Q.value = SOUND.screamFormantQ;
      filter.frequency.setValueAtTime(fromHz, t);
      filter.frequency.linearRampToValueAtTime(toHz, t + length);
      const levelGain = ctx.createGain();
      levelGain.gain.value = level;
      rasp.connect(filter);
      breath.connect(breathGain).connect(filter);
      filter.connect(levelGain).connect(mouth);
    }
    mouth.connect(out);
    if (this.echo) mouth.connect(this.echo);

    for (const node of [osc, osc2, wobble, jitter]) {
      node.start(t);
      node.stop(t + length);
    }
    breath.start(t, Math.random() * 0.2);
    breath.stop(t + length);

    // A last tired "ugh" after the scream
    this.groan(end, t + length + 0.05);
  }

  /** A short low "ugh", starting at time `at`. */
  private groan(pitch: number, at: number): void {
    const ctx = this.ctx;
    const out = this.master;
    if (!ctx || !out) return;
    const length = 0.35;
    const osc = ctx.createOscillator();
    if (this.throat) osc.setPeriodicWave(this.throat);
    osc.frequency.setValueAtTime(pitch * 1.1, at);
    osc.frequency.exponentialRampToValueAtTime(pitch * 0.75, at + length);
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 500;
    filter.Q.value = 4;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(SOUND.screamVolume * 0.6, at + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + length);
    osc.connect(filter).connect(gain).connect(out);
    if (this.echo) gain.connect(this.echo);
    osc.start(at);
    osc.stop(at + length);
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
    if (this.echo && volume > 0.5) gain.connect(this.echo);
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
    if (this.echo && volume > 0.5) gain.connect(this.echo);
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
