/**
 * How big a worn Wearable must be (#88, owner rule): the one swim-view floor
 * every item meets on every look, and the per-slot minimum sizes, each a share
 * of the body part the slot sits on. Footprints, zones and layers change to
 * meet these numbers; these numbers never change to fit a footprint.
 *
 * Plain numbers only: the painters and footprints in drawAxolotlParts.ts and
 * drawWearables.ts are built to them, and the tests hold every look to them.
 */
import { AXO_SCENE_SCALE } from './drawAxolotl';
import { AXO_SIZE_SCALE } from './drawAxolotlParts';

/** Each worn item shows this much of its own fill, or more, in the swim view (CSS px²). */
export const WEARABLE_SWIM_VIEW_MIN_CSS_PX2 = 64;

/**
 * Camera fit zoom of the swim view the floor is measured in: the Small phone
 * viewport, 320 x 440 CSS px. The world fits 360 high and 320 wide, so the
 * zoom is min(440 / 360, 320 / 320) = 1 (fitView in src/logic/viewport.ts).
 */
export const SWIM_VIEW_FIT_ZOOM = 1;

/** CSS px per local unit in the swim view: AXO_SCENE_SCALE x AXO_SIZE_SCALE.small x the fit zoom (0.684). */
export const SWIM_VIEW_CSS_PX_PER_UNIT = AXO_SCENE_SCALE * AXO_SIZE_SCALE.small * SWIM_VIEW_FIT_ZOOM;

/** Shirt minimum: the item's silhouette (fill and its own ink) over the torso side. */
export interface ShirtSlotMinimum {
  /** Share of the torso fill between the tail root and the front line the item covers. */
  readonly torsoSideShare: number;
}

/** Back minimum: the item's length along the back edge and how far it stands off the back. */
export interface BackSlotMinimum {
  /** Ink length along the back edge, in units: at least this, and at least torsoLengthShare of the torso length. */
  readonly minLength: number;
  /** Share of the torso length (2 rx - 30) the ink length along the back edge reaches, at least. */
  readonly torsoLengthShare: number;
  /** Ink reaches at least this many units outside the torso outline. */
  readonly proud: number;
  /** Share of the item's fill outside the silhouette (the torso and its outline ink). */
  readonly outsideShare: number;
}

/** Tail minimum: the item's ink across and along the tail at its anchor. */
export interface TailSlotMinimum {
  /** Ink across the tail is at least this share of the full tail height at the anchor (2 hc and both fins, still pose). */
  readonly tailHeightShare: number;
  /** Ink along the tail is at least this many units. */
  readonly minAlong: number;
}

/** Head minimum: the item's ink across the head and how far it rises above it. */
export interface HeadSlotMinimum {
  /** Ink width along x is at least this share of the head width (2 rx of HEAD_ELLIPSE, 54). */
  readonly headWidthShare: number;
  /** Ink rises at least this many units above the outer edge of the head outline (LW outside the head ellipse). */
  readonly rise: number;
}

/** Neck minimum: the item's ink along the throat. */
export interface NeckSlotMinimum {
  /** Ink width along x is at least this many units. */
  readonly minWidth: number;
}

/** Face minimum: the item's ink across the eyes and round them. */
export interface FaceSlotMinimum {
  /** Ink spans at least this share of the eye span: the near eye zone's left edge to the far eye zone's right edge. */
  readonly eyeSpanShare: number;
  /** Share of each eye zone the item's outer outline encloses. */
  readonly eyeZoneShare: number;
}

/** Socks minimum: the sleeve along and across the leg, and the foot pad over the toe tips. */
export interface SocksSlotMinimum {
  /** Share of the leg tube, u 0 to the leg end l, the sleeve's colour runs along. */
  readonly legLengthShare: number;
  /** The sleeve's ink reaches at least this many units past the bare leg tube's ink on each side. */
  readonly tubeProud: number;
  /** Share of the three toe tips' ink (a disc of the toe ink's half width about each tip) the pad covers, its own ink included. */
  readonly toeTipShare: number;
}

/** Feet minimum: the item over the toes and over the Sock's foot pad. */
export interface FeetSlotMinimum {
  /** Share of the three toes' ink, past the leg tube's ink, the item covers, its own ink included. */
  readonly toeShare: number;
  /** Share of the Sock's foot pad, ink included, the item covers, its own ink included. */
  readonly padShare: number;
}

/** Per-slot minimum sizes: every look meets each value or more. */
export interface WearableSlotMinimums {
  readonly head: HeadSlotMinimum;
  readonly neck: NeckSlotMinimum;
  readonly face: FaceSlotMinimum;
  readonly shirt: ShirtSlotMinimum;
  readonly back: BackSlotMinimum;
  readonly tail: TailSlotMinimum;
  readonly socks: SocksSlotMinimum;
  readonly feet: FeetSlotMinimum;
}

export const WEARABLE_SLOT_MINIMUMS: WearableSlotMinimums = {
  head: { headWidthShare: 0.5, rise: 8 },
  neck: { minWidth: 27 },
  face: { eyeSpanShare: 1, eyeZoneShare: 1 },
  shirt: { torsoSideShare: 0.75 },
  back: { minLength: 22, torsoLengthShare: 0.5, proud: 8, outsideShare: 0.4 },
  tail: { tailHeightShare: 0.4, minAlong: 16 },
  socks: { legLengthShare: 1, tubeProud: 1, toeTipShare: 1 },
  feet: { toeShare: 1, padShare: 1 },
};

/** Least Back ink length along the back edge on a torso of x radius `torsoRx`: the torso length is 2 rx - 30. */
export function backMinimumLength(torsoRx: number): number {
  const { minLength, torsoLengthShare } = WEARABLE_SLOT_MINIMUMS.back;
  return Math.max(minLength, torsoLengthShare * (2 * torsoRx - 30));
}
