import Phaser from 'phaser';
import {
  BULLET,
  CAMO_HELMET,
  MOTION,
  SHADOW,
  OUTFIT_PIECE_LENGTH,
  PLAYER,
  RAINBOW_PIECE_LENGTH,
  ROUND_ENDS,
  SWING,
  WEAPONS,
  type Weapon,
} from '../config';
import type { Box } from '../logic/bullets';
import { stepsBetween } from '../logic/steps';
import { supportHand, swooshArc, weaponTilt } from '../logic/swing';
import { turnAround } from '../logic/aim';
import { figureSegments, joints, type Segment } from '../logic/cut';
import {
  camoColorAt,
  outfitColor,
  rainbowColorAt,
  splitSegment,
  type OutfitLook,
} from '../logic/outfit';
import {
  lerpPose,
  poseBounds,
  smoothingStep,
  stickFigurePose,
  type Facing,
  type Point,
  type Pose,
  type Stance,
} from '../logic/pose';

export interface StickFigureLook {
  color: number;
  /** A thin edge around the figure so it shows on any background. */
  outlineColor: number;
  outlineAlpha: number;
  facing: Facing;
  /** How tall the figure is. The player's height if not given. */
  height?: number;
  /** Clothes. Without them the figure is plain `color`. */
  outfit?: OutfitLook;
  /** Lines this many times thicker than normal, for chunky figures. */
  thickness?: number;
}

/** How thick a figure's lines are. */
export function lookLineWidth(look: StickFigureLook): number {
  return PLAYER.lineWidth * (look.thickness ?? 1);
}

/**
 * A stick figure holding a gun. Drawn around its feet, so `x`/`feetY` is where it stands.
 * The black player faces right, the white ones face left.
 */
export class StickFigure {
  private readonly g: Phaser.GameObjects.Graphics;
  /** A soft dark spot on the ground under the feet. */
  private readonly shadow: Phaser.GameObjects.Ellipse;
  private stance: Stance;
  private hitColor: number | null = null;
  private weapon: Weapon = 'pistol';
  /** How high above the ground the feet are (when jumping). */
  private lift = 0;
  /** Spinning in the air (radians), around the middle of the body, for flips. */
  private spin = 0;
  /** The pose drawn right now. It glides toward the stance's pose every frame. */
  private current: Pose;
  /** Walking: how far through the step cycle, and how long one step takes. */
  private walkPhase = 0;
  private walkStepMs: number | null = null;
  /** Called on every footstep, for the step sound. */
  private onStep: (() => void) | null = null;
  /** How far the gun arm is turned up (negative) or down (positive), in radians. */
  private aim = 0;
  /** Until this time the pose moves extra fast (the hard part of a swing). */
  private strikeUntil = 0;
  private destroyed = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private x: number,
    private readonly feetY: number,
    private look: StickFigureLook,
    stance: Stance = 'stand',
  ) {
    this.stance = stance;
    const size = look.height ?? PLAYER.height;
    this.shadow = scene.add.ellipse(x, feetY + 2, size * 0.45, size * 0.07, 0x000000, SHADOW.alpha);
    this.g = scene.add.graphics({ x, y: feetY });
    this.current = this.targetPose();
    this.draw();
    scene.events.on('update', this.tick, this);
    // Playing again restarts the scene: stop listening, the old figure is gone
    scene.events.once('shutdown', this.stopTicking, this);
  }

  private stopTicking(): void {
    this.scene.events.off('update', this.tick, this);
    this.scene.events.off('shutdown', this.stopTicking, this);
  }

  /** Every frame: walk the legs and glide softly toward the wanted pose. */
  private tick(_time: number, deltaMs: number): void {
    if (this.walkStepMs !== null) {
      const before = this.walkPhase;
      this.walkPhase += (Math.PI * deltaMs) / this.walkStepMs;
      if (stepsBetween(before, this.walkPhase) > 0) this.onStep?.();
    }
    const speed = this.scene.time.now < this.strikeUntil ? MOTION.strikeSpeed : MOTION.smoothSpeed;
    const step = smoothingStep(deltaMs, speed);
    this.current = lerpPose(this.current, this.targetPose(), step);
    this.draw();
  }

  /**
   * Walk (legs swing, one step every `stepMs`) or stand still (null).
   * The upper body keeps doing what the stance says.
   */
  setWalking(stepMs: number | null): void {
    if (stepMs === null && this.walkStepMs !== null) this.walkPhase = 0;
    this.walkStepMs = stepMs;
  }

  /** Something to do on every footstep, like playing a step sound. */
  setOnStep(onStep: (() => void) | null): void {
    this.onStep = onStep;
  }

  /** The pose the figure wants to be in right now. */
  private targetPose(): Pose {
    const pose = stickFigurePose(
      this.look.height ?? PLAYER.height,
      this.stance,
      this.look.facing,
      this.walkStepMs !== null ? this.walkPhase : undefined,
    );
    const aimed = this.aimable()
      ? {
          ...pose,
          gunHand: turnAround(pose.gunHand, pose.shoulder, this.aim, this.look.facing),
        }
      : pose;
    // The small gun is held with both hands (except when hanging from a vine)
    if (this.weapon === 'smallGun' && this.stance !== 'hang') {
      return { ...aimed, backHand: supportHand(aimed.gunHand, this.look.facing) };
    }
    return aimed;
  }

  /** Can the gun arm be turned to aim right now (holding a gun, not hanging or flipping)? */
  private aimable(): boolean {
    const gun = this.weapon !== 'axe' && this.weapon !== 'club';
    return gun && this.aim !== 0 && this.stance !== 'hang' && this.stance !== 'tuck';
  }

  /** Point the gun arm up (negative) or down (positive), in radians. 0 = straight ahead. */
  setAim(angle: number): void {
    this.aim = angle;
  }

  getAim(): number {
    return this.aimable() ? this.aim : 0;
  }

  /**
   * Swing the axe or club: lift it back behind the head, then strike down hard
   * with a swoosh. `onStrike` is called the moment it comes down.
   * Afterwards the figure stays in the 'chop' stance until told otherwise.
   */
  swing(onStrike: () => void): void {
    this.stance = 'windup';
    this.scene.time.delayedCall(SWING.windupMs, () => {
      if (this.destroyed) return;
      const from = this.current;
      this.stance = 'chop';
      this.strikeUntil = this.scene.time.now + SWING.strikeMs;
      this.drawSwoosh(from, this.targetPose());
      onStrike();
    });
  }

  /** A pale curved trail where the weapon flies, fading away fast. */
  private drawSwoosh(from: Pose, to: Pose): void {
    const ox = this.x;
    const oy = this.feetY - this.lift;
    const at = (p: Point): Point => ({ x: ox + p.x, y: oy + p.y });
    const { color, alpha, width, fadeMs, extraRadius } = SWING.swoosh;
    const arc = swooshArc(
      at(from.shoulder),
      at(from.gunHand),
      at(to.gunHand),
      this.look.facing,
      extraRadius * ((this.look.height ?? PLAYER.height) / PLAYER.height),
    );
    const g = this.scene.add.graphics().setDepth(this.g.depth);
    // A few arcs, the outer ones thinner, so it looks like a blur
    for (let i = 0; i < 3; i++) {
      g.lineStyle(width - i * 3, color, alpha * (1 - i * 0.3));
      g.beginPath();
      g.arc(arc.center.x, arc.center.y, arc.radius - i * 6, arc.start, arc.end, arc.anticlockwise);
      g.strokePath();
    }
    this.scene.tweens.add({
      targets: g,
      alpha: 0,
      duration: fadeMs,
      onComplete: () => {
        g.destroy();
      },
    });
  }

  getX(): number {
    return this.x;
  }

  setX(x: number): void {
    this.x = x;
    this.shadow.x = x;
    this.place();
  }

  /** Spin the figure around its middle (for a flip). 0 = upright. */
  setSpin(spin: number): void {
    this.spin = spin;
    this.place();
  }

  /** Put the drawing where the figure is, turned around the middle of its body. */
  private place(): void {
    const half = (this.look.height ?? PLAYER.height) / 2;
    const middleY = this.feetY - this.lift - half;
    this.g.rotation = this.spin;
    this.g.x = this.x - Math.sin(this.spin) * half;
    this.g.y = middleY + Math.cos(this.spin) * half;
  }

  /** Raise the figure off the ground, for jumping. */
  setLift(lift: number): void {
    this.lift = lift;
    this.place();
    // Higher up: the shadow gets smaller and fainter
    const away = Math.min(Math.max(0, 1 - Math.abs(lift) / SHADOW.fadeHeight), 1);
    this.shadow.setScale(0.5 + 0.5 * away).setAlpha(SHADOW.alpha * away);
  }

  /** Change the pose. The figure glides into it over the next frames. */
  setStance(stance: Stance): void {
    this.stance = stance;
  }

  /** Where bullets come out of the gun, on the screen. */
  muzzlePosition(): { x: number; y: number } {
    const hand = this.pose().gunHand;
    const facing = this.look.facing;
    // The muzzle sits in front of the hand, turned the way the gun aims
    const tip = turnAround(
      { x: hand.x + facing * WEAPONS[this.weapon].muzzleX, y: hand.y + BULLET.muzzleOffset.y },
      hand,
      this.getAim(),
      facing,
    );
    return { x: this.x + tip.x, y: this.feetY - this.lift + tip.y };
  }

  /** Where the gun hand is on the screen (shells pop out here). */
  handPosition(): { x: number; y: number } {
    const hand = this.pose().gunHand;
    return { x: this.x + hand.x, y: this.feetY - this.lift + hand.y - 6 };
  }

  /** The box bullets can hit, on the screen. */
  bounds(): Box {
    const box = poseBounds(this.pose());
    return {
      left: this.x + box.left,
      right: this.x + box.right,
      top: this.feetY - this.lift + box.top,
      bottom: this.feetY - this.lift + box.bottom,
    };
  }

  /** Blink in a color for a moment, for example red when hit. */
  flash(color: number, durationMs: number): void {
    this.hitColor = color;
    this.draw();
    this.scene.time.delayedCall(durationMs, () => {
      // It may have broken apart while blinking
      if (!this.g.active) return;
      this.hitColor = null;
      this.draw();
    });
  }

  /** Where the feet are now (higher while jumping). */
  getFeetY(): number {
    return this.feetY - this.lift;
  }

  /** Turn to look left (-1) or right (1). The gun turns too. */
  setFacing(facing: Facing): void {
    if (facing === this.look.facing) return;
    this.look = { ...this.look, facing };
    // Turn around at once (mirror), so the gun doesn't slide through the body
    this.current = { ...this.targetPose() };
    this.draw();
  }

  getFacing(): Facing {
    return this.look.facing;
  }

  /** Put on different clothes. */
  setOutfit(outfit: OutfitLook): void {
    this.look = { ...this.look, outfit };
    this.draw();
  }

  /** Swap the gun in the hand, for example to the rifle from the shop. */
  setWeapon(weapon: Weapon): void {
    this.weapon = weapon;
    this.draw();
  }

  getWeapon(): Weapon {
    return this.weapon;
  }

  getLook(): StickFigureLook {
    return this.look;
  }

  destroy(): void {
    this.destroyed = true;
    this.stopTicking();
    this.g.destroy();
    this.shadow.destroy();
  }

  /** The pose as it is drawn right now. */
  pose(): Pose {
    return this.current;
  }

  private draw(): void {
    const pose = this.pose();
    const { outlineColor, outlineAlpha } = this.look;
    const segments = figureSegments(pose);
    this.g.clear();
    // Edge first, then the figure on top of it
    const lineWidth = lookLineWidth(this.look);
    // Wings, a tail or a cape go behind the body
    drawBackParts(this.g, pose, lookOutfit(this.look), this.scene.time.now);
    drawSegments(this.g, segments, lineWidth + 3, outlineColor, outlineAlpha, lineWidth);
    drawHead(this.g, pose, lineWidth + 3, outlineColor, outlineAlpha, lineWidth);
    const outfit: OutfitLook =
      this.hitColor !== null ? { kind: 'solid', color: this.hitColor } : lookOutfit(this.look);
    drawOutfit(this.g, segments, pose, outfit, true, 0, lineWidth);
    drawGun(this.g, pose, this.look, this.weapon, this.getAim());
  }
}

/** The clothes a figure wears: its outfit, or plain `color` without one. */
export function lookOutfit(look: StickFigureLook): OutfitLook {
  return look.outfit ?? { kind: 'solid', color: look.color };
}

/**
 * Draws the body lines and head in the outfit's colors.
 * Camo and rainbow color each short piece of the lines differently.
 */
export function drawOutfit(
  g: Phaser.GameObjects.Graphics,
  segments: readonly Segment[],
  pose: Pose,
  outfit: OutfitLook,
  withHead = true,
  /** Where the feet line is in these coordinates (moved for broken pieces). */
  feetY = 0,
  lineWidth: number = PLAYER.lineWidth,
): void {
  // Rainbow stripes go from the top of the head (red) down to the feet (purple)
  const headTop = pose.neck.y - pose.headRadius * 2;
  const stripeAt = (y: number, colors: readonly number[]): number =>
    rainbowColorAt(colors, (y - headTop) / (feetY - headTop));

  let index = 0;
  for (const segment of segments) {
    const pieceLength =
      outfit.kind === 'solid' ||
      outfit.kind === 'pig' ||
      outfit.kind === 'troll' ||
      outfit.kind === 'gold' ||
      outfit.kind === 'beret' ||
      outfit.kind === 'dragon' ||
      outfit.kind === 'king'
        ? OUTFIT_PIECE_LENGTH
        : RAINBOW_PIECE_LENGTH;
    for (const { from, to } of splitSegment(segment, pieceLength)) {
      const midX = (from.x + to.x) / 2;
      const midY = (from.y + to.y) / 2;
      const color =
        outfit.kind === 'rainbow'
          ? stripeAt(midY, outfit.colors)
          : outfit.kind === 'camo'
            ? camoColorAt(outfit.colors, midX, midY - feetY)
            : outfitColor(outfit, index);
      g.lineStyle(lineWidth, color, 1);
      g.lineBetween(from.x, from.y, to.x, to.y);
      index += 1;
    }
  }
  // Round joints, and round hands and feet, in the outfit's colors
  for (const j of joints(segments)) {
    const color =
      outfit.kind === 'rainbow'
        ? stripeAt(j.y, outfit.colors)
        : outfit.kind === 'camo'
          ? camoColorAt(outfit.colors, j.x, j.y - feetY)
          : outfitColor(outfit, Math.round(Math.abs(j.x) + Math.abs(j.y)));
    g.fillStyle(color, 1);
    g.fillCircle(j.x, j.y, roundEnd(lineWidth, j.end, lineWidth));
  }
  if (!withHead) return;

  const c = headCenter(pose);
  const r = pose.headRadius;
  if (outfit.kind === 'solid') {
    g.fillStyle(outfit.color, 1);
    g.fillCircle(c.x, c.y, r);
  } else if (outfit.kind === 'pig') {
    // A pig face looking the way the figure faces: ears, a snout and an eye
    const facing = pose.gunHand.x >= pose.neck.x ? 1 : -1;
    g.fillStyle(outfit.ear, 1);
    g.fillTriangle(
      c.x - r * 0.7,
      c.y - r * 0.5,
      c.x - r * 0.2,
      c.y - r * 0.9,
      c.x - r * 0.95,
      c.y - r * 1.35,
    );
    g.fillTriangle(
      c.x + r * 0.7,
      c.y - r * 0.5,
      c.x + r * 0.2,
      c.y - r * 0.9,
      c.x + r * 0.95,
      c.y - r * 1.35,
    );
    g.fillStyle(outfit.color, 1);
    g.fillCircle(c.x, c.y, r * 1.05);
    g.fillStyle(outfit.snout, 1);
    g.fillEllipse(c.x + facing * r * 0.85, c.y + r * 0.15, r * 0.7, r * 0.8);
    g.fillStyle(0x6d2f45, 1);
    g.fillCircle(c.x + facing * r * 0.95, c.y + r * 0.02, r * 0.1);
    g.fillCircle(c.x + facing * r * 0.95, c.y + r * 0.3, r * 0.1);
    g.fillStyle(0x000000, 1);
    g.fillCircle(c.x + facing * r * 0.25, c.y - r * 0.3, r * 0.13);
  } else if (outfit.kind === 'troll') {
    // A forest troll face: pointy ears, a hair tuft, a big long nose and a beady eye
    const facing = pose.gunHand.x >= pose.neck.x ? 1 : -1;
    g.fillStyle(outfit.color, 1);
    g.fillTriangle(
      c.x - facing * r * 0.9,
      c.y - r * 0.1,
      c.x - facing * r * 0.4,
      c.y - r * 0.5,
      c.x - facing * r * 1.6,
      c.y - r * 0.7,
    );
    g.fillCircle(c.x, c.y, r * 1.05);
    g.fillStyle(outfit.hair, 1);
    g.fillTriangle(
      c.x - r * 0.4,
      c.y - r * 0.85,
      c.x + r * 0.3,
      c.y - r * 0.9,
      c.x - r * 0.2,
      c.y - r * 1.6,
    );
    g.fillTriangle(
      c.x - r * 0.1,
      c.y - r * 0.9,
      c.x + r * 0.5,
      c.y - r * 0.8,
      c.x + r * 0.35,
      c.y - r * 1.45,
    );
    g.fillStyle(outfit.nose, 1);
    g.fillEllipse(c.x + facing * r * 1.0, c.y + r * 0.2, r * 1.1, r * 0.65);
    g.fillStyle(0x000000, 1);
    g.fillCircle(c.x + facing * r * 0.3, c.y - r * 0.3, r * 0.14);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(c.x + facing * r * 0.34, c.y - r * 0.34, r * 0.05);
  } else if (outfit.kind === 'dragon') {
    // A long snout with an open jaw full of sharp teeth, big curved horns,
    // and a glowing red eye
    const facing = pose.gunHand.x >= pose.neck.x ? 1 : -1;
    const f = facing;
    g.fillStyle(outfit.horn, 1);
    for (const [base, tipX, tipY] of [
      [-0.45, -1.35, -1.95],
      [0.1, -0.7, -2.1],
    ] as const) {
      g.fillTriangle(
        c.x + f * (base - 0.2) * r,
        c.y - r * 0.6,
        c.x + f * (base + 0.25) * r,
        c.y - r * 0.8,
        c.x + f * tipX * r,
        c.y + tipY * r,
      );
    }
    g.fillStyle(outfit.color, 1);
    g.fillCircle(c.x, c.y, r * 1.05);
    // Upper jaw and lower jaw, a little open
    g.fillEllipse(c.x + f * r * 1.05, c.y - r * 0.05, r * 1.6, r * 0.7);
    g.fillEllipse(c.x + f * r * 0.95, c.y + r * 0.55, r * 1.3, r * 0.45);
    // Fire glowing inside the mouth
    g.fillStyle(outfit.belly, 1);
    g.fillEllipse(c.x + f * r * 1.05, c.y + r * 0.28, r * 1.1, r * 0.22);
    // Sharp white teeth
    g.fillStyle(0xffffff, 1);
    for (let k = 0; k < 4; k++) {
      const tx = c.x + f * r * (0.6 + k * 0.28);
      g.fillTriangle(tx - 3, c.y + r * 0.2, tx + 3, c.y + r * 0.2, tx, c.y + r * 0.42);
      g.fillTriangle(tx - 3, c.y + r * 0.4, tx + 3, c.y + r * 0.4, tx, c.y + r * 0.22);
    }
    // Smoking nostril
    g.fillStyle(0x000000, 1);
    g.fillCircle(c.x + f * r * 1.7, c.y - r * 0.15, r * 0.09);
    // A glowing red eye under an angry brow
    g.fillStyle(outfit.eye, 0.35);
    g.fillCircle(c.x + f * r * 0.3, c.y - r * 0.3, r * 0.45);
    g.fillStyle(outfit.eye, 1);
    g.fillCircle(c.x + f * r * 0.3, c.y - r * 0.3, r * 0.22);
    g.fillStyle(0x000000, 1);
    g.fillEllipse(c.x + f * r * 0.33, c.y - r * 0.3, r * 0.07, r * 0.32);
    g.lineStyle(3, 0x000000, 1);
    g.lineBetween(c.x - f * r * 0.1, c.y - r * 0.7, c.x + f * r * 0.65, c.y - r * 0.45);
  } else if (outfit.kind === 'king') {
    // A beard, and a golden crown with a red jewel
    g.fillStyle(outfit.color, 1);
    g.fillCircle(c.x, c.y, r);
    g.fillStyle(0x3e2723, 1);
    g.fillEllipse(c.x, c.y + r * 0.55, r * 1.3, r * 0.8);
    g.fillStyle(outfit.crown, 1);
    g.fillPoints(
      [
        new Phaser.Math.Vector2(c.x - r * 0.85, c.y - r * 0.55),
        new Phaser.Math.Vector2(c.x - r * 0.95, c.y - r * 1.45),
        new Phaser.Math.Vector2(c.x - r * 0.45, c.y - r * 1.0),
        new Phaser.Math.Vector2(c.x, c.y - r * 1.6),
        new Phaser.Math.Vector2(c.x + r * 0.45, c.y - r * 1.0),
        new Phaser.Math.Vector2(c.x + r * 0.95, c.y - r * 1.45),
        new Phaser.Math.Vector2(c.x + r * 0.85, c.y - r * 0.55),
      ],
      true,
    );
    g.fillStyle(outfit.jewel, 1);
    g.fillCircle(c.x, c.y - r * 0.85, r * 0.17);
  } else if (outfit.kind === 'beret') {
    // A tough face: dark sunglasses and a red beret with a gold badge, tilted to one side
    const facing = pose.gunHand.x >= pose.neck.x ? 1 : -1;
    g.fillStyle(outfit.color, 1);
    g.fillCircle(c.x, c.y, r);
    g.fillStyle(0x0d0d0d, 1);
    g.fillRoundedRect(c.x - r * 0.3 + facing * r * 0.25, c.y - r * 0.25, r * 0.95, r * 0.32, 3);
    g.fillStyle(outfit.beret, 1);
    g.fillEllipse(c.x - facing * r * 0.15, c.y - r * 0.72, r * 2.3, r * 0.9);
    g.fillCircle(c.x - facing * r * 0.75, c.y - r * 0.55, r * 0.35);
    g.fillStyle(outfit.badge, 1);
    g.fillCircle(c.x + facing * r * 0.45, c.y - r * 0.75, r * 0.18);
  } else if (outfit.kind === 'gold') {
    // A shiny gold head with a bright glint and a little crown
    g.fillStyle(outfit.dark, 1);
    g.fillCircle(c.x, c.y, r);
    g.fillStyle(outfit.color, 1);
    g.fillCircle(c.x - r * 0.12, c.y - r * 0.12, r * 0.82);
    g.fillStyle(outfit.shine, 0.9);
    g.fillEllipse(c.x + r * 0.3, c.y - r * 0.45, r * 0.55, r * 0.3);
    g.fillStyle(outfit.color, 1);
    g.fillPoints(
      [
        new Phaser.Math.Vector2(c.x - r * 0.7, c.y - r * 0.85),
        new Phaser.Math.Vector2(c.x - r * 0.7, c.y - r * 1.45),
        new Phaser.Math.Vector2(c.x - r * 0.35, c.y - r * 1.1),
        new Phaser.Math.Vector2(c.x, c.y - r * 1.55),
        new Phaser.Math.Vector2(c.x + r * 0.35, c.y - r * 1.1),
        new Phaser.Math.Vector2(c.x + r * 0.7, c.y - r * 1.45),
        new Phaser.Math.Vector2(c.x + r * 0.7, c.y - r * 0.85),
      ],
      true,
    );
    g.fillStyle(0xe53935, 1);
    g.fillCircle(c.x, c.y - r * 1.05, r * 0.14);
  } else if (outfit.kind === 'rainbow') {
    // The head gets the same stripes, one thin row at a time, plus a little shine
    for (let dy = -r; dy < r; dy += 1) {
      const half = Math.sqrt(Math.max(r * r - (dy + 0.5) * (dy + 0.5), 0));
      g.fillStyle(stripeAt(c.y + dy, outfit.colors), 1);
      g.fillRect(c.x - half, c.y + dy, half * 2, 1.2);
    }
    g.fillStyle(0xffffff, 0.45);
    g.fillCircle(c.x + r * 0.35, c.y - r * 0.4, r * 0.25);
  } else {
    // Camo: blotchy face paint and a soldier's helmet on top
    for (let dy = -r; dy < r; dy += 1) {
      const half = Math.sqrt(Math.max(r * r - (dy + 0.5) * (dy + 0.5), 0));
      for (let dx = -half; dx < half; dx += 2) {
        g.fillStyle(camoColorAt(outfit.colors, c.x + dx, c.y + dy - feetY), 1);
        g.fillRect(c.x + dx, c.y + dy, 2.2, 1.2);
      }
    }
    const { color: helmet, rim, shine } = CAMO_HELMET;
    g.fillStyle(helmet, 1);
    g.slice(c.x, c.y - r * 0.15, r * 1.15, Math.PI, Math.PI * 2);
    g.fillPath();
    g.fillStyle(rim, 1);
    g.fillRect(c.x - r * 1.3, c.y - r * 0.2, r * 2.6, r * 0.22);
    g.fillStyle(shine, 0.35);
    g.fillEllipse(c.x + r * 0.3, c.y - r * 0.85, r * 0.6, r * 0.25);
  }
}

/**
 * Things that hang behind the body: a dragon's flapping wings and tail,
 * or the king's cape. `timeMs` makes the wings flap.
 */
export function drawBackParts(
  g: Phaser.GameObjects.Graphics,
  pose: Pose,
  outfit: OutfitLook,
  timeMs: number,
): void {
  const facing = pose.gunHand.x >= pose.neck.x ? 1 : -1;
  const back = -facing;
  const sh = pose.shoulder;
  if (outfit.kind === 'dragon') {
    const flap = Math.sin(timeMs / 160) * 0.4;
    const span = Math.abs(pose.neck.y) * 0.95;
    // Huge bat wings with bony fingers and a ragged edge
    const wing = (lift: number): Phaser.Math.Vector2[] => [
      new Phaser.Math.Vector2(sh.x, sh.y),
      new Phaser.Math.Vector2(sh.x + back * span * 0.4, sh.y - span * (0.85 + lift)),
      new Phaser.Math.Vector2(sh.x + back * span * 1.15, sh.y - span * (0.7 + lift)),
      new Phaser.Math.Vector2(sh.x + back * span * 0.95, sh.y - span * (0.35 + lift / 2)),
      new Phaser.Math.Vector2(sh.x + back * span * 1.2, sh.y - span * (0.2 + lift / 3)),
      new Phaser.Math.Vector2(sh.x + back * span * 0.9, sh.y),
      new Phaser.Math.Vector2(sh.x + back * span * 1.05, sh.y + span * 0.15),
      new Phaser.Math.Vector2(sh.x + back * span * 0.55, sh.y + span * 0.12),
    ];
    const points = wing(flap);
    g.fillStyle(outfit.wing, 0.97);
    g.fillPoints(points, true);
    g.lineStyle(3, 0x000000, 1);
    for (const p of [points[1], points[2], points[4], points[6]]) {
      if (p) g.lineBetween(sh.x, sh.y, p.x, p.y);
    }
    g.strokePoints(points, true);
    // Spikes all down the back, from the neck to the hip
    const neck = pose.neck;
    const hip = pose.hip;
    g.fillStyle(outfit.horn, 1);
    for (let k = 0; k <= 5; k++) {
      const t = k / 5;
      const x = neck.x + (hip.x - neck.x) * t + back * 4;
      const y = neck.y + (hip.y - neck.y) * t;
      g.fillTriangle(x, y - 6, x, y + 6, x + back * 16, y - 2);
    }
    // A long tail curling out behind, with a big spiky tip
    const tail = [0, 0.25, 0.5, 0.75, 1].map(
      (t) =>
        new Phaser.Math.Vector2(
          hip.x + back * span * 1.2 * t,
          hip.y +
            span * 0.45 * t -
            Math.sin(t * Math.PI) * span * 0.3 +
            Math.sin(timeMs / 300 + t * 3) * 6 * t,
        ),
    );
    g.lineStyle(Math.max(span * 0.1, 5), outfit.color, 1);
    g.strokePoints(tail, false);
    const tip = tail[4];
    if (tip) {
      g.fillStyle(outfit.horn, 1);
      g.fillTriangle(tip.x, tip.y - 12, tip.x + back * 22, tip.y, tip.x, tip.y + 12);
    }
  } else if (outfit.kind === 'king') {
    // A purple cape from the shoulders down past the knees, with a gold edge
    const knee = pose.backKnee;
    const cape = [
      new Phaser.Math.Vector2(sh.x - 6, sh.y),
      new Phaser.Math.Vector2(sh.x + 6, sh.y),
      new Phaser.Math.Vector2(knee.x + back * 22, knee.y + 8),
      new Phaser.Math.Vector2(knee.x + back * 40, knee.y + 4),
    ];
    g.fillStyle(outfit.cape, 1);
    g.fillPoints(cape, true);
    g.lineStyle(3, outfit.crown, 1);
    g.strokePoints(cape, true);
  }
}

/** Draws stick figure lines. */
export function drawSegments(
  g: Phaser.GameObjects.Graphics,
  segments: readonly Segment[],
  lineWidth: number,
  color: number,
  alpha: number,
  /** The figure's own line width (the edge is drawn a bit wider than it). */
  base: number = PLAYER.lineWidth,
): void {
  g.lineStyle(lineWidth, color, alpha);
  for (const { from, to } of segments) {
    g.lineBetween(from.x, from.y, to.x, to.y);
  }
  // Round knees and elbows, and round balls for hands and feet
  g.fillStyle(color, alpha);
  for (const j of joints(segments)) {
    g.fillCircle(j.x, j.y, roundEnd(lineWidth, j.end, base));
  }
}

/** How big the round end of a line is: hands and feet are a bit bigger than knees. */
function roundEnd(lineWidth: number, end: boolean, base: number = PLAYER.lineWidth): number {
  return end ? lineWidth / 2 + base * ROUND_ENDS.handGrow : lineWidth / 2;
}

/** Where the middle of the head is. */
export function headCenter(pose: Pose): Point {
  return { x: pose.neck.x, y: pose.neck.y - pose.headRadius + PLAYER.lineWidth / 2 };
}

/** Draws the head. A wider `lineWidth` makes it a bit bigger, for the edge. */
export function drawHead(
  g: Phaser.GameObjects.Graphics,
  pose: Pose,
  lineWidth: number,
  color: number,
  alpha: number,
  /** The figure's own line width (the edge is drawn a bit wider than it). */
  base: number = PLAYER.lineWidth,
): void {
  const center = headCenter(pose);
  g.fillStyle(color, alpha);
  g.fillCircle(center.x, center.y, pose.headRadius + (lineWidth - base) / 2);
}

/** A filled shape of a weapon: points measured forward from the hand (x) and down (y). */
interface GunPart {
  points: readonly (readonly [number, number])[];
  color: number;
}

/** A rectangle as a weapon part. */
function box(x: number, y: number, w: number, h: number, color: number): GunPart {
  return {
    points: [
      [x, y],
      [x + w, y],
      [x + w, y + h],
      [x, y + h],
    ],
    color,
  };
}

/** The parts of each weapon, drawn in order. Facing right, hand at (0, 0). */
function weaponParts(weapon: Weapon): GunPart[] {
  if (weapon === 'club') {
    const { wood, dark, knot, iron, grip } = WEAPONS.club.colors;
    // A spike: a small triangle sticking out from (x, y) in direction (dx, dy)
    const spike = (x: number, y: number, dx: number, dy: number): GunPart => ({
      points: [
        [x - dy * 2.5, y + dx * 2.5],
        [x + dx * 7, y + dy * 7],
        [x + dy * 2.5, y - dx * 2.5],
      ],
      color: iron,
    });
    return [
      // Handle, thinner at the bottom, with a leather grip wrapped around it
      {
        points: [
          [-2.5, 12],
          [2.5, 12],
          [4, -30],
          [-4, -30],
        ],
        color: wood,
      },
      box(-3.2, -6, 6.4, 14, grip),
      box(-3.2, -3, 6.4, 1.2, dark),
      box(-3.2, 1, 6.4, 1.2, dark),
      box(-3.2, 5, 6.4, 1.2, dark),
      // Iron band where the heavy head starts
      box(-5.5, -33, 11, 5, iron),
      // The heavy, knobbly head
      {
        points: [
          [-5, -32],
          [5, -32],
          [10, -44],
          [13, -56],
          [11, -68],
          [5, -77],
          [-3, -79],
          [-10, -72],
          [-13, -60],
          [-11, -46],
        ],
        color: wood,
      },
      // Darker wood grain and knots
      box(-7, -66, 2, 14, dark),
      box(2, -72, 2, 18, dark),
      box(6, -60, 2, 10, dark),
      box(-4, -50, 5, 4, knot),
      box(5, -68, 4, 4, knot),
      // Iron spikes all around the head
      spike(12, -52, 1, 0),
      spike(12, -64, 1, -0.3),
      spike(-12, -54, -1, 0),
      spike(-11, -66, -1, -0.3),
      spike(3, -78, 0.2, -1),
      spike(-7, -75, -0.6, -0.8),
      spike(9, -72, 0.7, -0.7),
      spike(0, -58, 1, 0),
    ];
  }

  if (weapon === 'axe') {
    const { handle, blade, edge } = WEAPONS.axe.colors;
    return [
      // Wooden handle with a knob at the bottom
      box(-2.5, -44, 5, 54, handle),
      box(-3.5, 8, 7, 4, 0x4e342e),
      // Metal collar where the head sits on the handle
      box(-3.5, -46, 7, 8, 0x424242),
      // The head: thick at the back, flaring out to a wide curved edge
      {
        points: [
          [3, -44],
          [12, -47],
          [20, -54],
          [25, -50],
          [25, -28],
          [20, -24],
          [12, -31],
          [3, -36],
        ],
        color: blade,
      },
      // Shiny sharpened edge
      {
        points: [
          [21, -53],
          [25, -50],
          [25, -28],
          [21, -25],
          [23, -39],
        ],
        color: edge,
      },
    ];
  }

  if (weapon === 'fireBreath') {
    const { outer, inner } = WEAPONS.fireBreath.colors;
    // A ball of fire flickering in the claw
    return [
      {
        points: [
          [-2, 2],
          [6, -14],
          [10, -4],
          [16, -10],
          [14, 4],
          [6, 8],
        ],
        color: outer,
      },
      {
        points: [
          [2, 2],
          [7, -8],
          [10, -1],
          [12, 4],
          [6, 6],
        ],
        color: inner,
      },
    ];
  }

  if (weapon === 'minigun') {
    const { body, dark, metal, brass } = WEAPONS.minigun.colors;
    return [
      // A bunch of barrels held together by rings
      box(10, -14, 42, 4, metal),
      box(10, -9, 42, 4, metal),
      box(10, -4, 42, 4, metal),
      box(20, -16, 4, 18, dark),
      box(40, -16, 4, 18, dark),
      box(50, -15, 4, 16, dark),
      // The big body, a carry handle on top and a grip
      box(-18, -18, 30, 22, body),
      box(-12, -24, 18, 4, dark),
      box(-12, -22, 3, 6, dark),
      box(3, -22, 3, 6, dark),
      {
        points: [
          [-4, 4],
          [5, 4],
          [3, 15],
          [-6, 14],
        ],
        color: dark,
      },
      // A belt of brass bullets hanging down
      box(-16, 4, 5, 8, brass),
      box(-10, 6, 5, 8, brass),
      box(-22, 2, 5, 8, brass),
      box(-18, -18, 30, 1.5, metal),
    ];
  }

  if (weapon === 'goldGun') {
    const { body, dark, shine, gem } = WEAPONS.goldGun.colors;
    return [
      // A long, fancy golden barrel with engraved lines
      box(-4, -10, 40, 8, body),
      box(2, -8, 1.5, 5, dark),
      box(8, -8, 1.5, 5, dark),
      box(14, -8, 1.5, 5, dark),
      box(34, -11, 6, 10, dark),
      box(-4, -2, 26, 3, dark),
      // A red jewel on the side
      {
        points: [
          [24, -8],
          [27, -6],
          [24, -4],
          [21, -6],
        ],
        color: gem,
      },
      // Curved golden grip
      {
        points: [
          [-4, -2],
          [5, -2],
          [4, 13],
          [-7, 12],
        ],
        color: dark,
      },
      // Glint along the top
      box(-4, -10, 40, 1.5, shine),
    ];
  }

  if (weapon === 'smallGun') {
    const { body, dark, shine } = WEAPONS.smallGun.colors;
    return [
      // Short chunky body with a stubby barrel
      box(-6, -9, 26, 9, body),
      box(20, -7, 6, 4, dark),
      // Grip in the gun hand and a front grip for the other hand
      {
        points: [
          [-3, 0],
          [4, 0],
          [2, 11],
          [-5, 10],
        ],
        color: dark,
      },
      box(-12, -3, 5, 9, dark),
      // A little sight on top and a shine along it
      box(8, -12, 4, 3, dark),
      box(-6, -9, 26, 1.2, shine),
    ];
  }

  if (weapon === 'rifle') {
    const { body, dark, metal, shine } = WEAPONS.rifle.colors;
    return [
      // Stock against the shoulder, and the tube it sits on
      {
        points: [
          [-32, -9],
          [-14, -7],
          [-14, 1],
          [-32, 5],
          [-33, -2],
        ],
        color: body,
      },
      box(-15, -6, 9, 4, dark),
      // Receiver (the middle) and the rail on top
      box(-7, -9, 22, 10, body),
      box(-6, -12, 20, 3, dark),
      // Handguard with cooling slots
      box(15, -8, 22, 8, body),
      box(18, -6, 3, 3, dark),
      box(24, -6, 3, 3, dark),
      box(30, -6, 3, 3, dark),
      // Front sight, barrel and muzzle brake
      box(33, -14, 3, 6, dark),
      box(37, -6, 13, 3, metal),
      box(50, -7.5, 5, 6, dark),
      // Pistol grip under the hand
      {
        points: [
          [-2, 1],
          [5, 1],
          [3, 12],
          [-4, 11],
        ],
        color: dark,
      },
      // Curved magazine
      {
        points: [
          [6, 1],
          [13, 1],
          [16, 9],
          [14, 17],
          [7, 15],
          [8, 8],
        ],
        color: dark,
      },
      // Light catching the top edge
      box(-7, -9, 44, 1.2, shine),
    ];
  }

  const { body, shine } = PLAYER.gun;
  return [
    // Slide on top, with grip lines at the back
    box(-4, -9, 33, 7, body),
    box(-2, -8, 1, 5, 0x0d0d0d),
    box(1, -8, 1, 5, 0x0d0d0d),
    box(4, -8, 1, 5, 0x0d0d0d),
    // Frame under the slide and the barrel tip
    box(4, -2, 22, 3, 0x262626),
    box(29, -7, 2, 4, 0x0d0d0d),
    // Sights
    box(-2, -11, 3, 2, 0x0d0d0d),
    box(26, -11, 2, 2, 0x0d0d0d),
    // Angled grip in the hand
    {
      points: [
        [-4, -2],
        [5, -2],
        [3, 13],
        [-6, 12],
      ],
      color: 0x2b2b2b,
    },
    // Light catching the top of the slide
    box(-4, -9, 33, 1.2, shine),
  ];
}

/**
 * Draws the gun in the gun hand, pointing the way the figure faces.
 * First a pale edge around every part, then the parts themselves.
 */
export function drawGun(
  g: Phaser.GameObjects.Graphics,
  pose: Pose,
  look: StickFigureLook,
  weapon: Weapon = 'pistol',
  /** A gun turned up (negative) or down (positive) to aim. */
  aim = 0,
): void {
  const { x: handX, y: handY } = pose.gunHand;
  const { facing, outlineColor, outlineAlpha } = look;
  const parts = weaponParts(weapon);
  // An axe or club turns with the arm, so a swing really swings it
  const melee = weapon === 'axe' || weapon === 'club';
  const tilt = melee ? weaponTilt(pose.shoulder, pose.gunHand, facing) : aim;
  const cos = Math.cos(tilt);
  const sin = Math.sin(tilt);
  const toScreen = ([dx, dy]: readonly [number, number]): Phaser.Math.Vector2 => {
    const rx = dx * cos - dy * sin;
    const ry = dx * sin + dy * cos;
    return new Phaser.Math.Vector2(handX + facing * rx, handY + ry);
  };

  // Pale edge: each part pushed out a little from its middle
  g.fillStyle(outlineColor, outlineAlpha);
  for (const part of parts) {
    const cx = part.points.reduce((sum, [x]) => sum + x, 0) / part.points.length;
    const cy = part.points.reduce((sum, [, y]) => sum + y, 0) / part.points.length;
    const grown = part.points.map(([x, y]): [number, number] => {
      const dx = x - cx;
      const dy = y - cy;
      const length = Math.hypot(dx, dy) || 1;
      return [x + (dx / length) * 1.5, y + (dy / length) * 1.5];
    });
    g.fillPoints(grown.map(toScreen), true);
  }
  for (const part of parts) {
    g.fillStyle(part.color, 1);
    g.fillPoints(part.points.map(toScreen), true);
  }

  // Trigger guard: a little ring in front of the grip
  if (weapon === 'pistol' || weapon === 'rifle' || weapon === 'smallGun' || weapon === 'goldGun') {
    const ring = toScreen([7, 3]);
    g.lineStyle(1.5, 0x1a1a1a, 1);
    g.strokeCircle(ring.x, ring.y, 3.5);
  }
}
