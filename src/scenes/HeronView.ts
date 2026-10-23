import type * as Phaser from 'phaser';
import {
  HERON_BEAK_REST_TIP,
  HERON_NECK_BASE,
  HERON_STAB_HEAD_BACK,
  HERON_STAB_NECK_LEN,
  HERON_WATER_LINE_Y,
  type HeronBodyFrame,
} from '../art/drawHeron';
import { DEPTH } from '../art/layers';
import type { TexInfo } from '../art/textures';
import { inSightCover } from '../logic/hiding';
import { HERON_SPECIES, phaseProgress, type PredatorState } from '../logic/predators';
import type { Point } from '../logic/zone';
import type { GameAssets } from './BootScene';
import type { PredatorFrame } from './PredatorView';
import { faceSprite } from './spriteFacing';

/** Full motion: seconds each wading leg frame shows while the heron moves. */
const STEP_FRAME_S = 0.25;
/** Full motion: the wading leg cycle, one frame per STEP_FRAME_S. */
const WADE_FRAMES: readonly HeronBodyFrame[] = ['stepA', 'stand', 'stepB', 'stand'];

/** One frame of heron rendering input: the encounter, motion and dt, and the axolotl's logic position. */
export type HeronFrame = Pick<PredatorFrame, 'encounter' | 'motion' | 'dt'> & {
  axolotl: Readonly<Point>;
};

/** The encounter predator a heron is drawn from: its species and route id. */
export type HeronSource = Pick<PredatorState, 'species' | 'routeId'>;

/** The sprites and visual-only state of one heron. */
interface HeronDrawing {
  /** Index of the heron in the encounter's `predators`. */
  index: number;
  /** Rest, watch and warn head and neck, anchored at the neck base. Added before `body`, so the body ink covers the neck base. */
  head: Phaser.GameObjects.Image;
  /** Body and legs, anchored on the art water line under the resting beak tip. */
  body: Phaser.GameObjects.Image;
  /** Stab neck piece, anchored at its rear end on the neck base. */
  stabNeck: Phaser.GameObjects.Image;
  /** Stab head, anchored at the beak tip. Added after `stabNeck`, so it draws over the neck's front end. */
  stabHead: Phaser.GameObjects.Image;
  /** Seconds the heron has waded under full motion; picks the leg frame. */
  wadeTime: number;
  /** The logic x last drawn, to tell whether it moved this frame. */
  lastX: number;
}

function bakedImage(scene: Phaser.Scene, info: TexInfo, depth: number): Phaser.GameObjects.Image {
  return scene.add
    .image(0, 0, info.key)
    .setOrigin(info.originNormX, info.originNormY)
    .setScale(1 / info.scale)
    .setDepth(depth)
    .setVisible(false);
}

/** The sign of `dx` as a facing, or `fallback` when it is 0. */
function facingOf(dx: number, fallback: -1 | 1): -1 | 1 {
  if (dx > 0) return 1;
  if (dx < 0) return -1;
  return fallback;
}

/**
 * Draws each wading heron (PRD N3, issue #111) from its encounter state: legs in the water, body,
 * neck and head above it. Visual only: it reads the encounter, the axolotl's position and the
 * motion setting each frame, the leg cycle is driven by the frame `dt`, so it freezes with the
 * scene, and nothing here changes game state. It allocates nothing per frame: the drawn stab tip
 * is a reused scratch point.
 *
 * Mapping (art guide 7h): the body anchor is at the logic point's x (`state.pos.x`) on the art
 * water line (HERON_WATER_LINE_Y), so the resting beak tip is over the logic point and the planted
 * feet are on it. The body faces `state.facing`: the wading direction while wading, toward the
 * axolotl while the heron warns or cools down, toward the spot while it stabs. The head and neck
 * sit at the neck base (HERON_NECK_BASE, mirrored with the body) and look toward the axolotl only
 * while it is within the heron's meet range and not in sight cover; otherwise along the body.
 *
 * Phases: wading and cooldown show the rest head; the warning shows the S-neck warn head; the
 * strike hides the head and shows the stab neck and stab head from the neck base to the beak tip.
 * Under full motion the drawn stab runs in a straight line from the drawn resting beak tip
 * (HERON_BEAK_REST_TIP, over the logic point) to the logic spot (`strikeSpot`), over the same
 * share of the strike as the logic stab tip (`stabTip`), which the hit test uses; the two tips
 * meet at the spot. Under reduced motion the stab is one pose with the beak on the fixed strike
 * spot, and the legs do not step (the heron still wades). No "!" bubble and no glint, and the beak is always closed: the heron is never shown
 * grabbing, holding or lifting the axolotl. A hit shows only PredatorView's shared leg-loss poof.
 */
export class HeronView {
  private readonly herons: HeronDrawing[] = [];
  private readonly assets: GameAssets;
  /** Reused for the drawn stab tip each frame. */
  private readonly stabTipPoint: Point = { x: 0, y: 0 };

  /** `predators` holds every encounter predator, in `predators` order; only the herons are drawn. */
  constructor(scene: Phaser.Scene, assets: GameAssets, predators: readonly HeronSource[]) {
    this.assets = assets;
    predators.forEach((predator, index) => {
      if (predator.species === HERON_SPECIES.id) this.herons.push(this.createHeron(scene, index));
    });
  }

  /** Draws one frame. */
  render(frame: HeronFrame): void {
    const axolotlSeen = !inSightCover(frame.axolotl, frame.encounter);
    for (const heron of this.herons) {
      const state = frame.encounter.predators[heron.index];
      if (!state || state.species !== HERON_SPECIES.id) {
        throw new Error(`HeronView: encounter predator ${heron.index} is not a heron`);
      }
      this.renderBody(heron, state, frame);
      if (state.phase === 'lunge') {
        heron.head.setVisible(false);
        this.renderStab(heron, state, frame);
      } else {
        heron.stabNeck.setVisible(false);
        heron.stabHead.setVisible(false);
        this.renderHead(heron, state, frame, axolotlSeen);
      }
    }
  }

  destroy(): void {
    for (const heron of this.herons) {
      heron.head.destroy();
      heron.body.destroy();
      heron.stabNeck.destroy();
      heron.stabHead.destroy();
    }
  }

  private createHeron(scene: Phaser.Scene, index: number): HeronDrawing {
    const art = this.assets.predator;
    const head = bakedImage(scene, art.heronHead.rest, DEPTH.heronBody);
    const body = bakedImage(scene, art.heronBody.stand, DEPTH.heronBody);
    const stabNeck = bakedImage(scene, art.heronStabNeck, DEPTH.heronStab);
    const stabHead = bakedImage(scene, art.heronStabHead, DEPTH.heronStab);
    return { index, head, body, stabNeck, stabHead, wadeTime: 0, lastX: Number.NaN };
  }

  /** Under full motion the legs step while the heron wades; otherwise it stands. */
  private renderBody(heron: HeronDrawing, state: PredatorState, frame: HeronFrame): void {
    const wading = frame.motion.ambient && state.phase === 'patrol' && state.pos.x !== heron.lastX;
    heron.lastX = state.pos.x;
    heron.wadeTime = wading ? heron.wadeTime + frame.dt : 0;
    const legFrame = wading ? WADE_FRAMES[Math.floor(heron.wadeTime / STEP_FRAME_S) % WADE_FRAMES.length] : 'stand';
    const info = this.assets.predator.heronBody[legFrame];
    heron.body.setTexture(info.key).setVisible(true).setPosition(state.pos.x, HERON_WATER_LINE_Y);
    faceSprite(heron.body, state.facing, 1 / info.scale);
  }

  /** The rest head (wading, cooldown) or the S-neck warn head (warning), at the neck base. */
  private renderHead(heron: HeronDrawing, state: PredatorState, frame: HeronFrame, axolotlSeen: boolean): void {
    const info = this.assets.predator.heronHead[state.phase === 'telegraph' ? 'warn' : 'rest'];
    const watching = axolotlSeen && this.withinMeetRange(state, frame.axolotl);
    const look = watching ? facingOf(frame.axolotl.x - state.pos.x, state.facing) : state.facing;
    heron.head.setTexture(info.key).setVisible(true).setPosition(this.neckBaseX(state), this.neckBaseY());
    faceSprite(heron.head, look, 1 / info.scale);
  }

  /**
   * The stab: the neck piece runs straight from the neck base to the stab head centre, and the
   * closed beak's tip is on the fixed strike spot (reduced motion) or moves from the drawn resting
   * beak tip to the strike spot (full motion). The stab head is mirrored when the tip is to the left, so its eye stays on top.
   */
  private renderStab(heron: HeronDrawing, state: PredatorState, frame: HeronFrame): void {
    const tip = frame.motion.ambient ? this.drawnStabTip(state) : (state.strikeSpot ?? state.pos);
    const baseX = this.neckBaseX(state);
    const baseY = this.neckBaseY();
    const dx = tip.x - baseX;
    const dy = tip.y - baseY;
    const reach = Math.hypot(dx, dy);
    const unitX = reach > 0 ? dx / reach : state.facing;
    const unitY = reach > 0 ? dy / reach : 0;
    const neckLen = Math.max(0, reach - HERON_STAB_HEAD_BACK);

    const neckInfo = this.assets.predator.heronStabNeck;
    heron.stabNeck
      .setVisible(neckLen > 0)
      .setPosition(baseX, baseY)
      .setRotation(Math.atan2(unitY, unitX));
    faceSprite(heron.stabNeck, 1, neckLen / HERON_STAB_NECK_LEN / neckInfo.scale, 1 / neckInfo.scale);

    const headInfo = this.assets.predator.heronStabHead;
    const mirror = facingOf(unitX, state.facing);
    heron.stabHead
      .setVisible(true)
      .setPosition(tip.x, tip.y)
      .setRotation(Math.atan2(mirror * unitY, mirror * unitX));
    faceSprite(heron.stabHead, mirror, 1 / headInfo.scale);
  }

  /**
   * The full-motion stab tip: a straight line from the drawn resting beak tip to the strike spot,
   * the share `stabTip` uses (all of it for a strike with no duration). Without a spot it rests.
   */
  private drawnStabTip(state: PredatorState): Point {
    const restX = state.pos.x + state.facing * HERON_BEAK_REST_TIP.x;
    const restY = HERON_WATER_LINE_Y + HERON_BEAK_REST_TIP.y;
    const spot = state.strikeSpot;
    const share = state.duration > 0 ? phaseProgress(state) : 1;
    this.stabTipPoint.x = spot ? restX + (spot.x - restX) * share : restX;
    this.stabTipPoint.y = spot ? restY + (spot.y - restY) * share : restY;
    return this.stabTipPoint;
  }

  private withinMeetRange(state: PredatorState, axolotl: Readonly<Point>): boolean {
    return Math.hypot(axolotl.x - state.pos.x, axolotl.y - state.pos.y) <= HERON_SPECIES.meetRange;
  }

  /** World x of the neck base: HERON_NECK_BASE mirrored with the body. */
  private neckBaseX(state: PredatorState): number {
    return state.pos.x + state.facing * HERON_NECK_BASE.x;
  }

  /** World y of the neck base. */
  private neckBaseY(): number {
    return HERON_WATER_LINE_Y + HERON_NECK_BASE.y;
  }
}
