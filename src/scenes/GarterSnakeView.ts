import type * as Phaser from 'phaser';
import { GARTER_SWIM_FRAMES, type GarterSnakeFrame } from '../art/drawGarterSnake';
import { DEPTH } from '../art/layers';
import type { TexInfo } from '../art/textures';
import { GARTER_SNAKE_SPECIES, phaseProgress, type PredatorState } from '../logic/predators';
import type { Point } from '../logic/zone';
import type { GameAssets } from './BootScene';
import type { PredatorFrame } from './PredatorView';
import { faceSprite } from './spriteFacing';

/** Full motion: seconds each swim frame shows while the snake swims. */
const SWIM_FRAME_S = 0.2;
/** Full motion: share of the warning before each ripple ring starts to spread, outer ring first. */
const RIPPLE_START: readonly number[] = [0, 0.4];
/** Each ripple ring's scale once spread; also its still scale under reduced motion. */
const RIPPLE_END_SCALE: readonly number[] = [1, 0.6];
/** Full motion: the scale a ripple ring spreads from. */
const RIPPLE_GROW_FROM = 0.3;
/** Seconds the ripple rings take to fade once the warning ends: a one-time fade of 0.4 s or more. */
const RIPPLE_FADE_S = 0.4;

/** One frame of garter snake rendering input: the encounter, motion and dt, and the axolotl's logic position. */
export type GarterSnakeViewFrame = Pick<PredatorFrame, 'encounter' | 'motion' | 'dt'> & {
  axolotl: Readonly<Point>;
};

/** The encounter predator a garter snake is drawn from: its species and route id. */
export type GarterSnakeSource = Pick<PredatorState, 'species' | 'routeId'>;

/** The sprites and visual-only state of one garter snake. */
interface GarterSnakeDrawing {
  /** Index of the snake in the encounter's `predators`. */
  index: number;
  /** The snake, anchored at the head centre (the logic point), its body trailing behind it. */
  body: Phaser.GameObjects.Image;
  /** The warning's ripple rings, in RIPPLE_START order, centred on the head. */
  rings: Phaser.GameObjects.Image[];
  /** Seconds since the warning ended; RIPPLE_FADE_S or more once the rings have faded. */
  rippleFadeAge: number;
  /** Seconds the snake has swum under full motion; picks the swim frame. */
  swimTime: number;
  /** The logic point last drawn, to tell whether it moved this frame. */
  lastX: number;
  lastY: number;
}

function bakedImage(scene: Phaser.Scene, info: TexInfo, depth: number): Phaser.GameObjects.Image {
  return scene.add
    .image(0, 0, info.key)
    .setOrigin(info.originNormX, info.originNormY)
    .setScale(1 / info.scale)
    .setDepth(depth)
    .setVisible(false);
}

/** Full motion: a ripple ring's scale at warning share `progress`, or 0 before it starts to spread. */
function spreadScale(ring: number, progress: number): number {
  const start = RIPPLE_START[ring];
  if (progress < start) return 0;
  const share = start < 1 ? Math.min(1, (progress - start) / (1 - start)) : 1;
  return RIPPLE_GROW_FROM + (RIPPLE_END_SCALE[ring] - RIPPLE_GROW_FROM) * share;
}

/**
 * Draws each garter snake (issue #103; PRD N2 area 5, N3) from its encounter state, at the surface.
 * Visual only: it reads the encounter, the axolotl's position and the motion setting each frame, the
 * swim cycle and the ripple fade are driven by the frame `dt`, so they freeze with the scene, and
 * nothing here changes game state. It reuses its sprites and allocates nothing per frame.
 *
 * Mapping (art guide 7c, 7h): the sprite's anchor is the head centre, placed on the logic point
 * (`state.pos`), and the body trails behind it. It faces `state.facing`, except in cooldown, where
 * it turns away from the axolotl, like the tilapia, so it is never shown holding on.
 *
 * Phases: patrol and cooldown cycle the swim frames (the S-wiggle) while the snake moves; the
 * warning shows the hold frame with the ripple rings spreading from the head over the warning's
 * progress (`phaseProgress`); the strike shows the dart frame. Once the warning ends (a dart or a
 * cancel) the rings stay where they were and fade over RIPPLE_FADE_S. Under reduced motion the
 * snake still swims but holds one S pose (the hold frame), and the rings show still, at their
 * spread size, and fade the same way. No "!" bubble and no glint. A hit shows only PredatorView's
 * shared leg-loss poof.
 */
export class GarterSnakeView {
  private readonly snakes: GarterSnakeDrawing[] = [];
  private readonly assets: GameAssets;

  /** `predators` holds every encounter predator, in `predators` order; only the garter snakes are drawn. */
  constructor(scene: Phaser.Scene, assets: GameAssets, predators: readonly GarterSnakeSource[]) {
    this.assets = assets;
    predators.forEach((predator, index) => {
      if (predator.species === GARTER_SNAKE_SPECIES.id) this.snakes.push(this.createSnake(scene, index));
    });
  }

  /** Draws one frame. */
  render(frame: GarterSnakeViewFrame): void {
    for (const snake of this.snakes) {
      const state = frame.encounter.predators[snake.index];
      if (!state || state.species !== GARTER_SNAKE_SPECIES.id) {
        throw new Error(`GarterSnakeView: encounter predator ${snake.index} is not a garter snake`);
      }
      this.renderBody(snake, state, frame);
      this.renderRipples(snake, state, frame);
    }
  }

  destroy(): void {
    for (const snake of this.snakes) {
      snake.body.destroy();
      for (const ring of snake.rings) ring.destroy();
    }
  }

  private createSnake(scene: Phaser.Scene, index: number): GarterSnakeDrawing {
    const art = this.assets.predator;
    const body = bakedImage(scene, art.garterSnake.swimA, DEPTH.tilapia);
    const rings = RIPPLE_START.map(() => bakedImage(scene, art.garterRipple, DEPTH.fx));
    return { index, body, rings, rippleFadeAge: RIPPLE_FADE_S, swimTime: 0, lastX: Number.NaN, lastY: Number.NaN };
  }

  private renderBody(snake: GarterSnakeDrawing, state: PredatorState, frame: GarterSnakeViewFrame): void {
    const moved = state.pos.x !== snake.lastX || state.pos.y !== snake.lastY;
    snake.lastX = state.pos.x;
    snake.lastY = state.pos.y;
    const info = this.assets.predator.garterSnake[this.bodyFrame(snake, state, frame, moved)];
    snake.body.setTexture(info.key).setVisible(true).setPosition(state.pos.x, state.pos.y);
    faceSprite(snake.body, this.snakeFacing(state, frame.axolotl), 1 / info.scale);
  }

  /**
   * The strike shows the dart and the warning the hold frame. Patrol and cooldown cycle the swim
   * frames under full motion, advancing only while the snake moves, and hold one S pose under
   * reduced motion.
   */
  private bodyFrame(
    snake: GarterSnakeDrawing,
    state: PredatorState,
    frame: GarterSnakeViewFrame,
    moved: boolean,
  ): GarterSnakeFrame {
    if (state.phase === 'lunge') return 'dart';
    if (state.phase === 'telegraph' || !frame.motion.ambient) return 'hold';
    if (moved) snake.swimTime += frame.dt;
    return GARTER_SWIM_FRAMES[Math.floor(snake.swimTime / SWIM_FRAME_S) % GARTER_SWIM_FRAMES.length];
  }

  /** In cooldown the snake turns away from the axolotl, so it is never shown holding on. */
  private snakeFacing(state: PredatorState, axolotl: Readonly<Point>): -1 | 1 {
    if (state.phase !== 'cooldown') return state.facing;
    const away = Math.sign(state.pos.x - axolotl.x);
    if (away > 0) return 1;
    if (away < 0) return -1;
    return state.facing;
  }

  /**
   * During the warning the rings sit on the head at full alpha: spreading over the warning's
   * progress under full motion, still at their spread size under reduced motion. Afterwards they
   * stay put and fade over RIPPLE_FADE_S, then hide.
   */
  private renderRipples(snake: GarterSnakeDrawing, state: PredatorState, frame: GarterSnakeViewFrame): void {
    if (state.phase === 'telegraph') {
      snake.rippleFadeAge = 0;
      this.placeRings(snake, state, frame);
      return;
    }
    snake.rippleFadeAge = Math.min(snake.rippleFadeAge + frame.dt, RIPPLE_FADE_S);
    const alpha = 1 - snake.rippleFadeAge / RIPPLE_FADE_S;
    for (const ring of snake.rings) {
      if (alpha <= 0) ring.setVisible(false);
      else ring.setAlpha(alpha);
    }
  }

  private placeRings(snake: GarterSnakeDrawing, state: PredatorState, frame: GarterSnakeViewFrame): void {
    const info = this.assets.predator.garterRipple;
    const progress = phaseProgress(state);
    for (let k = 0; k < snake.rings.length; k++) {
      const scale = frame.motion.ambient ? spreadScale(k, progress) : RIPPLE_END_SCALE[k];
      snake.rings[k]
        .setVisible(scale > 0)
        .setAlpha(1)
        .setPosition(state.pos.x, state.pos.y)
        .setScale(scale / info.scale);
    }
  }
}
