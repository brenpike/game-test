/**
 * Home Tank kit painters (guide 3g and 7f; PRD C7 to C9). Three full-frame
 * layers at the 480 x 360 reference viewport, origin at the top-left corner:
 * back (wall, stand, lid back, air gap, water, gravel), glass (the shine
 * stripes) and front (tank outline and lid front). The scene puts the
 * decorations between back and glass, the axolotls and bubbles above glass,
 * the surface line above those, and front last. The surface line is NOT baked;
 * the scene draws it (as the canal, at y 44).
 *
 * Also the "no" icon for an invalid placement (guide 7f).
 *
 * Painters are still frames, so each is also the reduced-motion version. The
 * only randomness is the injected `rand` for the gravel. Presentational only:
 * no Phaser, no game state. Every value is derived (provisional).
 */
import { TAU, ell, line, shape, frameFromBounds, type TexSize } from './canvasKit';
import { roundedPolygon, type Pt } from './drawBadges';
import {
  BED_BOTTOM,
  BED_TOP,
  HOME_TANK_AIR_GAP,
  HOME_TANK_GLASS_SHINE,
  HOME_TANK_LID,
  HOME_TANK_STAND,
  HOME_TANK_WALL,
  INK,
  LW,
  PEBBLE_COLOURS,
  PEBBLE_SHINE,
  VIEW_H,
  VIEW_W,
  WATER_DEEP,
  WATER_MID,
  WATER_SHALLOW,
  WATER_STOP_MID,
  WHITE,
} from './palette';

/**
 * Tank layout at the 480 x 360 reference viewport, logical px (guide 7f).
 * These mirror TANK in src/logic/tank.ts; this file does not import it.
 */
export const HOME_TANK_ART = {
  /** Tank rounded rectangle, to the ink centreline. */
  left: 16,
  right: 464,
  top: 24,
  bottom: 340,
  radius: 20,
  /** Lid bar. */
  lidLeft: 10,
  lidRight: 470,
  lidTop: 16,
  lidBottom: 30,
  /** Air gap under the lid, and the water surface (where the scene draws the surface line). */
  airTop: 30,
  waterTop: 44,
  /** Gravel top (about) and the stand band. */
  gravelTop: 300,
  standTop: 340,
} as const;

/** Frame of the back, glass and front layers: the whole reference viewport, origin top-left. */
export const TANK_FRAME: TexSize = { w: VIEW_W, h: VIEW_H, originX: 0, originY: 0 };

/** "No" icon side, logical px to the outer ink edge (guide 7f). */
export const NO_ICON_SIZE = 24;
/** Ring and bar ink of the "no" icon. */
const NO_ICON_LW = 3;
/** Texture frame for the "no" icon. Anchor is the disc centre. */
export const NO_ICON_TEX: TexSize = frameFromBounds(-NO_ICON_SIZE / 2, -NO_ICON_SIZE / 2, NO_ICON_SIZE / 2, NO_ICON_SIZE / 2, 1);

/** Gravel pebble radius range and rows (guide 7f: packed, radius 4 to 7). */
const PEBBLE_R_MIN = 4;
const PEBBLE_R_MAX = 7;
const PEBBLE_ROW_YS = [306, 314, 322, 330, 338] as const;
const PEBBLE_STEP_X = 11;
/** Gravel top edge wobble, +/- px. */
const GRAVEL_WOBBLE = 3;
const GRAVEL_PEBBLE_LW = 2.6;

function roundedRectPath(x0: number, y0: number, x1: number, y1: number, r: number): Path2D {
  const p = new Path2D();
  p.moveTo(x0 + r, y0);
  p.arcTo(x1, y0, x1, y1, r);
  p.arcTo(x1, y1, x0, y1, r);
  p.arcTo(x0, y1, x0, y0, r);
  p.arcTo(x0, y0, x1, y0, r);
  p.closePath();
  return p;
}

function tankPath(): Path2D {
  const t = HOME_TANK_ART;
  return roundedRectPath(t.left, t.top, t.right, t.bottom, t.radius);
}

function lidPath(): Path2D {
  const t = HOME_TANK_ART;
  const r = (t.lidBottom - t.lidTop) / 2;
  return roundedRectPath(t.lidLeft, t.lidTop, t.lidRight, t.lidBottom, r);
}

/** Gravel top edge: a gentle wobble of +/- GRAVEL_WOBBLE around gravelTop. Deterministic, so it also works as a still. */
function gravelEdgeY(x: number): number {
  const w = 0.6 * Math.sin(x * 0.045 + 0.8) + 0.4 * Math.sin(x * 0.13 + 2.1);
  return HOME_TANK_ART.gravelTop + GRAVEL_WOBBLE * w;
}

function paintGravel(ctx: CanvasRenderingContext2D, rand: () => number): void {
  const t = HOME_TANK_ART;
  const x0 = t.left - 8;
  const x1 = t.right + 8;

  const edge = new Path2D();
  const fill = new Path2D();
  edge.moveTo(x0, gravelEdgeY(x0));
  fill.moveTo(x0, gravelEdgeY(x0));
  for (let x = x0 + 8; x <= x1; x += 8) {
    edge.lineTo(x, gravelEdgeY(x));
    fill.lineTo(x, gravelEdgeY(x));
  }
  fill.lineTo(x1, t.bottom + 4);
  fill.lineTo(x0, t.bottom + 4);
  fill.closePath();

  const g = ctx.createLinearGradient(0, t.gravelTop, 0, t.bottom);
  g.addColorStop(0, BED_TOP);
  g.addColorStop(1, BED_BOTTOM);
  ctx.fillStyle = g;
  ctx.fill(fill);
  ctx.lineWidth = LW;
  ctx.strokeStyle = INK;
  ctx.stroke(edge);

  // packed pebbles: rows from the back (top) to the front, each pebble a touch off its grid spot
  PEBBLE_ROW_YS.forEach((rowY, row) => {
    const offset = row % 2 === 0 ? 0 : PEBBLE_STEP_X / 2;
    for (let x = x0 + offset; x <= x1; x += PEBBLE_STEP_X) {
      const r = PEBBLE_R_MIN + rand() * (PEBBLE_R_MAX - PEBBLE_R_MIN);
      const px = x + (rand() - 0.5) * 4;
      const py = rowY + (rand() - 0.5) * 3;
      const colour = PEBBLE_COLOURS[Math.floor(rand() * PEBBLE_COLOURS.length)];
      const ry = r * 0.85;
      const p = new Path2D();
      ell(p, px, py, r, ry);
      shape(ctx, p, colour, GRAVEL_PEBBLE_LW);
      const hp = new Path2D();
      ell(hp, px - r * 0.3, py - ry * 0.4, r * 0.32, ry * 0.25);
      ctx.fillStyle = PEBBLE_SHINE;
      ctx.fill(hp);
    }
  });
}

/**
 * Back layer: wall, stand (ink top edge), lid back, air gap, clean water
 * gradient (y 44 to 340) and gravel with packed pebbles (y 300 to 340). Water,
 * air gap and gravel are clipped to the tank's rounded rectangle. The tank
 * outline and lid front are in {@link paintTankFront}. `rand` places the pebbles.
 */
export function paintTankBack(ctx: CanvasRenderingContext2D, rand: () => number): void {
  const t = HOME_TANK_ART;

  ctx.fillStyle = HOME_TANK_WALL;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  // stand: band below the tank with an ink top edge
  ctx.fillStyle = HOME_TANK_STAND;
  ctx.fillRect(0, t.standTop, VIEW_W, VIEW_H - t.standTop);
  ctx.lineWidth = LW;
  ctx.strokeStyle = INK;
  ctx.stroke(line(0, t.standTop, VIEW_W, t.standTop));

  // lid back: the lid colour behind the tank top; the front layer draws the bar and its ink
  ctx.fillStyle = HOME_TANK_LID;
  ctx.fill(lidPath());

  ctx.save();
  ctx.clip(tankPath());

  ctx.fillStyle = HOME_TANK_AIR_GAP;
  ctx.fillRect(t.left, t.airTop, t.right - t.left, t.waterTop - t.airTop);

  const g = ctx.createLinearGradient(0, t.waterTop, 0, t.bottom);
  g.addColorStop(0, WATER_SHALLOW);
  g.addColorStop(WATER_STOP_MID, WATER_MID);
  g.addColorStop(1, WATER_DEEP);
  ctx.fillStyle = g;
  ctx.fillRect(t.left, t.waterTop, t.right - t.left, t.bottom - t.waterTop);

  paintGravel(ctx, rand);
  ctx.restore();
}

/** One slanted shine stripe, top edge at xTop (width w) at y0, leaning left to y1 by dx. Rounded corners. */
function shineStripe(xTop: number, w: number, y0: number, y1: number, dx: number): Path2D {
  const pts: Pt[] = [
    { x: xTop, y: y0 },
    { x: xTop + w, y: y0 },
    { x: xTop + w - dx, y: y1 },
    { x: xTop - dx, y: y1 },
  ];
  return roundedPolygon(pts, Math.min(3, w / 2));
}

/**
 * Glass layer: two slanted shine stripes (18 and 8 wide, rgba(255,255,255,0.25))
 * at the upper left, clipped to the tank. Drawn before the axolotls so the hero
 * is never hazed. Inside the glass, so the alpha is fine.
 */
export function paintTankGlass(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.clip(tankPath());
  ctx.fillStyle = HOME_TANK_GLASS_SHINE;
  ctx.fill(shineStripe(96, 18, 52, 232, 60));
  ctx.fill(shineStripe(126, 8, 52, 172, 40));
  ctx.restore();
}

/** Front layer: the tank outline (ink 3.5) and the lid front (rounded bar, lid colour, ink 3.5). */
export function paintTankFront(ctx: CanvasRenderingContext2D): void {
  ctx.lineWidth = LW;
  ctx.strokeStyle = INK;
  ctx.stroke(tankPath());
  shape(ctx, lidPath(), HOME_TANK_LID, LW);
}

/**
 * The "no" icon for an invalid move: a white disc, an ink ring and a diagonal
 * ink bar, 24 px, centred at (0, 0), all opaque (ink on white is 14.39:1). The
 * disc and the bar carry the meaning by shape, not colour. Use NO_ICON_TEX.
 */
export function paintNoIcon(ctx: CanvasRenderingContext2D): void {
  const r = NO_ICON_SIZE / 2 - NO_ICON_LW / 2;
  const disc = new Path2D();
  disc.arc(0, 0, r, 0, TAU);
  ctx.fillStyle = WHITE;
  ctx.fill(disc);
  ctx.lineWidth = NO_ICON_LW;
  ctx.strokeStyle = INK;
  ctx.stroke(disc);
  const d = r * Math.SQRT1_2;
  ctx.stroke(line(-d, -d, d, d));
}
