/**
 * HUD leg icon painters (guide sections 2, 4, 5, 8, 10; PRD A6, A7, A8, X2).
 * Still frames only: no motion, no state, no Phaser. Presentational only.
 *
 * Three leg states are told apart by fill and stroke style, not by hue:
 *   present   = LEGS_FILL pink fill + solid ink outline
 *   lost      = no fill + dashed ink outline (the "faint outline" of PRD A6)
 *   regrowing = composed by the HUD at runtime, in this order:
 *               1. paintLegIcon(ctx, 'outline')
 *               2. clip to the bottom `progress` fraction of the icon box (a rect
 *                  from y = LEG_ICON_SIZE * (1 - progress) down to LEG_ICON_SIZE),
 *                  then paintLegIcon(ctx, 'present')
 *               3. paintRegrowMark at a corner of the box (the sparkle)
 *             The two kinds share one footprint, so the present part covers the
 *             dashes exactly as it fills in. At progress 0 only the outline and
 *             the mark show; at 1 the icon is 'present'.
 *
 * Both painters draw in the box (0, 0) to (size, size). The caller scales with
 * its transform; the icon stays readable at about 24 to 32 CSS px. Always pair
 * with a text label or count (guide section 8, icons).
 *
 * Contrast (guide section 10): ink #2b2350 on UI_PANEL #ffffff is 14.39:1, far
 * above the 3:1 icon rule, so the outline carries it. The LEGS_FILL pink
 * #e8567e is 3.46:1 against the white panel and 4.16:1 against ink (guide
 * section 3g), so the fill is a second cue as well as the outline.
 *
 * Every value marked "provisional" below is new to this module and needs
 * prototype confirmation (guide section 12). Palette constants are reused as
 * they are.
 */
import { INK, LEGS_FILL, BODY_SHINE, UI_PRIMARY } from './palette';

/** Leg icon box, logical px. Same box as ICON_SIZE in drawUi.ts. */
export const LEG_ICON_SIZE = 32;

/** Regrow sparkle box, logical px. Provisional. */
export const REGROW_MARK_SIZE = 14;

export type LegIconKind = 'present' | 'outline';

// ---- Geometry, in the 32 x 32 icon box (provisional) ---------------------
/**
 * Ink width, logical px. Equals the guide's mouth outline (2.4), not LW (3.5):
 * at 32 px, LW would merge the three toes into one blob. Provisional.
 */
const ICON_INK = 2.4;
/** Leg tube: colour half-width and the two end points (root, joint). Provisional. */
const LEG_R = 3.6;
const LEG_ROOT_X = 16;
const LEG_ROOT_Y = 9;
const JOINT_X = 16;
const JOINT_Y = 16;
/** Toe tube: colour half-width, length, and splay either side of straight down. Provisional. */
const TOE_R = 1.8;
const TOE_LEN = 9.5;
const TOE_SPLAY = 0.95;
/** Dash pattern for the lost outline: short dashes with round caps. Provisional. */
const DASH: readonly number[] = [2, 4.6];

/** A capsule: segment A to B swept by radius r. Closed path, no inner seams to worry about. */
interface Part {
  readonly ax: number;
  readonly ay: number;
  readonly bx: number;
  readonly by: number;
  readonly r: number;
}

/** Leg, then the left, middle and right toe. Fill radii; the outline kind grows them. */
const PARTS: readonly Part[] = [
  { ax: LEG_ROOT_X, ay: LEG_ROOT_Y, bx: JOINT_X, by: JOINT_Y, r: LEG_R },
  ...[-1, 0, 1].map((d): Part => ({
    ax: JOINT_X,
    ay: JOINT_Y,
    bx: JOINT_X + Math.sin(d * TOE_SPLAY) * TOE_LEN,
    by: JOINT_Y + Math.cos(d * TOE_SPLAY) * TOE_LEN,
    r: TOE_R,
  })),
];

function capsule(part: Part, grow: number): Path2D {
  const { ax, ay, bx, by } = part;
  const r = part.r + grow;
  const a = Math.atan2(by - ay, bx - ax);
  const p = new Path2D();
  p.arc(bx, by, r, a - Math.PI / 2, a + Math.PI / 2);
  p.arc(ax, ay, r, a + Math.PI / 2, a + (3 * Math.PI) / 2);
  p.closePath();
  return p;
}

/**
 * Paint a leg icon in the box (0, 0) to (LEG_ICON_SIZE, LEG_ICON_SIZE):
 * a short leg with three toes.
 *
 * 'present': LEGS_FILL fill, solid ink outline sitting outside the fill
 * (the `inkMany` order: all ink first, then all fills, so the parts merge into
 * one inked shape), plus one small shine.
 * 'outline': no fill, dashed ink outline on the same footprint.
 */
export function paintLegIcon(ctx: CanvasRenderingContext2D, kind: LegIconKind): void {
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = INK;

  if (kind === 'present') {
    const paths = PARTS.map((part) => capsule(part, 0));
    ctx.lineWidth = 2 * ICON_INK;
    for (const p of paths) ctx.stroke(p);
    ctx.fillStyle = LEGS_FILL;
    for (const p of paths) ctx.fill(p);

    // one simple shine, upper left of the leg (guide section 5)
    ctx.lineWidth = 1.8;
    ctx.strokeStyle = BODY_SHINE;
    ctx.beginPath();
    ctx.moveTo(LEG_ROOT_X - 1.8, LEG_ROOT_Y + 0.6);
    ctx.lineTo(LEG_ROOT_X - 1.8, LEG_ROOT_Y + 3.4);
    ctx.stroke();
  } else {
    // Dashed edge of the union of the parts. The edge sits half an ink width
    // outside the fill edge, so the stroke's outer edge matches the solid ink's.
    // Each part is stroked only where no other part covers it, so no dash
    // crosses the inside of the shape.
    const grow = ICON_INK / 2;
    const paths = PARTS.map((part) => capsule(part, grow));
    ctx.lineWidth = ICON_INK;
    ctx.setLineDash([...DASH]);
    const edge = -8;
    const span = LEG_ICON_SIZE + 16;
    paths.forEach((own, i) => {
      ctx.save();
      paths.forEach((other, j) => {
        if (i === j) return;
        const outside = new Path2D();
        outside.rect(edge, edge, span, span);
        outside.addPath(other);
        ctx.clip(outside, 'evenodd');
      });
      ctx.stroke(own);
      ctx.restore();
    });
  }
  ctx.restore();
}

/**
 * Paint the regrow sparkle in the box (0, 0) to (REGROW_MARK_SIZE, REGROW_MARK_SIZE):
 * a four-point star, UI_PRIMARY fill, ink outline. The star shape carries the
 * meaning; the yellow is only decoration (ink on it is 11.05:1). Still frame:
 * never animate it faster than the guide's flash limits (section 10).
 */
export function paintRegrowMark(ctx: CanvasRenderingContext2D): void {
  const c = REGROW_MARK_SIZE / 2;
  const r = 5.8; // centre to tip. Provisional.
  const k = 1.7; // control point offset, sets how fat the waist is. Provisional.
  const star = new Path2D();
  star.moveTo(c, c - r);
  star.quadraticCurveTo(c + k, c - k, c + r, c);
  star.quadraticCurveTo(c + k, c + k, c, c + r);
  star.quadraticCurveTo(c - k, c + k, c - r, c);
  star.quadraticCurveTo(c - k, c - k, c, c - r);
  star.closePath();

  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.fillStyle = UI_PRIMARY;
  ctx.fill(star);
  ctx.lineWidth = 1.8;
  ctx.strokeStyle = INK;
  ctx.stroke(star);
  ctx.restore();
}
