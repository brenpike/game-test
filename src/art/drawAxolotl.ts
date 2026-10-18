/**
 * Axolotl painter. Port of drawAxolotl() from prototypes/art-styles/cartoon.js,
 * geometry from guide sections 6b-6g, layer order from 6a.
 *
 * The axolotl is authored facing right in local units (snout at +x). The caller
 * owns the transform: mirror, rotate and scale the sprite in the scene.
 * Presentational only: no game state, no randomness.
 */
import { blob, ell, inkMany, line, seg, type Seg, type TexSize } from './canvasKit';
import {
  BLUSH,
  BODY_SHINE,
  FIN_RAY,
  FRECKLE,
  INK,
  LEUCISTIC,
  LW,
  SUN,
  WHITE,
  type MorphPalette,
} from './palette';

/**
 * Texture frame in logical units. Covers snout, the whole tail at the largest
 * tail amplitude (1.6), the tail fin, all gills at every flutter phase, legs,
 * regeneration glints and the outline, with at least 6 logical px of padding
 * on every side (guide asks for 4 px at 1x).
 * Local x = 0 sits originX from the left; local y = 0 sits originY from the top.
 */
export const AXO_TEX: TexSize = { w: 148, h: 116, originX: 84, originY: 64 };

/** Local units are drawn at this scale in the scene (guide 6a). */
export const AXO_SCENE_SCALE = 0.95;

/** Largest tail amplitude the texture frame is sized for. */
export const AXO_MAX_TAIL_AMP = 1.6;

export interface AxolotlPose {
  /** Tail and leg cycle phase, radians (period 1.2 s at 2*pi * t / 1.2). */
  swimPhase: number;
  /** Gill flutter phase, radians (period 0.8 s at 2*pi * t / 0.8). */
  gillPhase: number;
  /** Eye height factor: 1 open down to 0.12 fully blinked. */
  blink: number;
  /** Tail wave amplitude: 1 normal, up to 1.6 while dashing. */
  tailAmp: number;
  /** Regeneration glints along the tail, 0 none to 1 full. */
  sparkle: number;
}

/** A calm, eyes-open pose. */
export const AXO_REST_POSE: AxolotlPose = {
  swimPhase: 0,
  gillPhase: 0,
  blink: 1,
  tailAmp: 1,
  sparkle: 0,
};

interface GillSpec {
  readonly bx: number;
  readonly by: number;
  /** Angle offset from straight back (added to pi). */
  readonly off: number;
  readonly len: number;
  readonly bend: number;
  readonly phase: number;
}

// Guide 6d. Far gills first (drawn behind everything), then near gills.
const FAR_GILLS: readonly GillSpec[] = [
  { bx: 6, by: -16, off: 1.4, len: 28, bend: 4, phase: 0.3 },
  { bx: 4, by: -8, off: 0.95, len: 32, bend: 4, phase: 1.6 },
  { bx: 6, by: 0, off: 0.5, len: 26, bend: 4, phase: 2.9 },
];
const NEAR_GILLS: readonly GillSpec[] = [
  { bx: 3, by: -12, off: 1.15, len: 34, bend: 5, phase: 0.0 },
  { bx: 1, by: -3, off: 0.65, len: 37, bend: 5, phase: 1.2 },
  { bx: 3, by: 7, off: 0.15, len: 31, bend: 5, phase: 2.4 },
];

function gill(
  ctx: CanvasRenderingContext2D,
  g: GillSpec,
  tfl: number,
  stemColour: string,
  filamentColour: string,
): void {
  const { bx, by, len, bend, phase } = g;
  const a = Math.PI + g.off + 0.13 * Math.sin(tfl + phase);
  const tx = bx + Math.cos(a) * len;
  const ty = by + Math.sin(a) * len;
  const nx = -Math.sin(a);
  const ny = Math.cos(a);
  const b = bend + 3 * Math.sin(tfl + phase + 1.2);
  const cx = (bx + tx) / 2 + nx * b;
  const cy = (by + ty) / 2 + ny * b;

  const stem = new Path2D();
  stem.moveTo(bx, by);
  stem.quadraticCurveTo(cx, cy, tx, ty);
  const segs: Seg[] = [seg(stem, 6, stemColour, 3)];

  const pt = (u: number): [number, number] => {
    const m = 1 - u;
    return [m * m * bx + 2 * u * m * cx + u * u * tx, m * m * by + 2 * u * m * cy + u * u * ty];
  };
  const tan = (u: number): number =>
    Math.atan2(2 * (1 - u) * (cy - by) + 2 * u * (ty - cy), 2 * (1 - u) * (cx - bx) + 2 * u * (tx - cx));

  for (const u of [0.35, 0.6, 0.82]) {
    const p0 = pt(u);
    for (const sd of [-1, 1]) {
      const fa = tan(u) + sd * (0.95 - 0.25 * u) + 0.22 * Math.sin(tfl + phase + u * 4 + sd);
      const fl = 13 * (1.05 - u * 0.55);
      segs.push(
        seg(line(p0[0], p0[1], p0[0] + Math.cos(fa) * fl, p0[1] + Math.sin(fa) * fl), 3.2, filamentColour, 2.4),
      );
    }
  }
  for (const sd of [-1, 1]) {
    const fa = tan(1) + sd * 0.38 + 0.18 * Math.sin(tfl + phase + 5 + sd);
    segs.push(seg(line(tx, ty, tx + Math.cos(fa) * 8, ty + Math.sin(fa) * 8), 3.2, filamentColour, 2.4));
  }
  inkMany(ctx, segs);
}

function leg(ctx: CanvasRenderingContext2D, bx: number, by: number, ang: number, len: number, colour: string): void {
  const ex = bx + Math.cos(ang) * len;
  const ey = by + Math.sin(ang) * len;
  const segs: Seg[] = [seg(line(bx, by, ex, ey), 8, colour, 3.1)];
  for (let d = -1; d <= 1; d++) {
    const ta = ang + d * 0.6;
    segs.push(seg(line(ex, ey, ex + Math.cos(ta) * 8.5, ey + Math.sin(ta) * 8.5), 4.2, colour, 2.6));
  }
  inkMany(ctx, segs);
}

function eye(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, blink: number, colour: string): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(1, blink);
  const bead = new Path2D();
  ell(bead, 0, 0, r, r);
  ctx.fillStyle = colour;
  ctx.fill(bead);
  const g1 = new Path2D();
  ell(g1, r * 0.3, -r * 0.35, r * 0.38, r * 0.38);
  ctx.fillStyle = WHITE;
  ctx.fill(g1);
  const g2 = new Path2D();
  ell(g2, -r * 0.35, r * 0.35, r * 0.17, r * 0.17);
  ctx.fill(g2);
  ctx.restore();
}

/** Tail geometry: 14 segments, wave travels body to tip (guide 6f). */
const TAIL_N = 14;

interface TailPoint {
  readonly s: number;
  readonly x: number;
  readonly cy: number;
  readonly hc: number;
}

function tailPoints(swim: number, tailAmp: number): TailPoint[] {
  const pts: TailPoint[] = [];
  for (let i = 0; i <= TAIL_N; i++) {
    const s = i / TAIL_N;
    pts.push({
      s,
      x: -30 - 44 * s,
      cy: 4 + 11 * tailAmp * s * Math.sin(swim - 4.5 * s),
      hc: 2 + 11 * Math.pow(1 - s, 1.1),
    });
  }
  return pts;
}

/** Regeneration glints: rounded plus-shaped twinkles along the tail. Never gory. */
function paintRegenGlints(ctx: CanvasRenderingContext2D, tail: readonly TailPoint[], pose: AxolotlPose): void {
  const amount = Math.min(1, Math.max(0, pose.sparkle));
  if (amount <= 0.01) return;
  const along = [0.28, 0.42, 0.56, 0.7, 0.84];
  along.forEach((s, k) => {
    const tp = tail[Math.round(s * TAIL_N)];
    if (!tp) return;
    const side = k % 2 === 0 ? -1 : 1;
    const gx = tp.x;
    const gy = tp.cy + side * (tp.hc + 3);
    // Twinkle at the 1.2 s swim cycle, far below 3 flashes per second.
    const r = 4.2 * amount * (0.6 + 0.4 * Math.sin(pose.swimPhase + k * 1.3));
    if (r < 0.4) return;
    const arms: Seg[] = [
      seg(line(gx - r, gy, gx + r, gy), 3, SUN, 1.6),
      seg(line(gx, gy - r, gx, gy + r), 3, SUN, 1.6),
    ];
    inkMany(ctx, arms);
    const core = new Path2D();
    ell(core, gx, gy, r * 0.32, r * 0.32);
    ctx.fillStyle = WHITE;
    ctx.fill(core);
  });
}

/**
 * Paint the axolotl in local units, facing right, origin at local (0, 0).
 * The caller sets the transform (see AXO_TEX for the frame).
 */
export function drawAxolotl(
  ctx: CanvasRenderingContext2D,
  pose: AxolotlPose,
  palette: MorphPalette = LEUCISTIC,
): void {
  const swim = pose.swimPhase;
  const tfl = pose.gillPhase;

  // 1. far gills (behind everything)
  for (const g of FAR_GILLS) gill(ctx, g, tfl, palette.gillFarStem, palette.gillFarFilament);

  // 2-3. legs behind the body: far pair darker, then near pair
  leg(ctx, 8, 15, Math.PI / 2 - 0.2 + 0.35 * Math.sin(swim + Math.PI), 14, palette.farSide);
  leg(ctx, -14, 17, Math.PI / 2 + 0.5 + 0.35 * Math.sin(swim), 14, palette.farSide);
  leg(ctx, 18, 15, Math.PI / 2 - 0.2 + 0.35 * Math.sin(swim), 15, palette.body);
  leg(ctx, -24, 17, Math.PI / 2 + 0.5 + 0.35 * Math.sin(swim + Math.PI), 15, palette.body);

  // tail geometry
  const tail = tailPoints(swim, pose.tailAmp);
  const topC: [number, number][] = [];
  const topF: [number, number][] = [];
  const botC: [number, number][] = [];
  const botF: [number, number][] = [];
  for (const tp of tail) {
    const ft = 2 + 9 * Math.sin(Math.PI * Math.pow(tp.s, 0.8));
    const fb = 2 + 7 * Math.sin(Math.PI * Math.pow(tp.s, 0.8));
    topC.push([tp.x, tp.cy - tp.hc]);
    topF.push([tp.x, tp.cy - tp.hc - ft]);
    botC.push([tp.x, tp.cy + tp.hc]);
    botF.push([tp.x, tp.cy + tp.hc + fb]);
  }
  const N = TAIL_N;

  // 4. merged silhouette: tail + torso + head as one blob
  const sil = new Path2D();
  sil.moveTo(topF[N][0], topF[N][1]);
  for (let i = N; i >= 0; i--) sil.lineTo(topF[i][0], topF[i][1]);
  for (let i = 0; i <= N; i++) sil.lineTo(botF[i][0], botF[i][1]);
  sil.closePath();
  ell(sil, -8, 4, 37, 19);
  ell(sil, 26, -1, 27, 22);
  blob(ctx, sil, palette.body, LW);

  // 5. fin bands, fin rays, core edge
  const i0 = 3;
  const bandT = new Path2D();
  const bandB = new Path2D();
  bandT.moveTo(topC[i0][0], topC[i0][1]);
  bandB.moveTo(botC[i0][0], botC[i0][1]);
  for (let i = i0 + 1; i <= N; i++) {
    bandT.lineTo(topC[i][0], topC[i][1]);
    bandB.lineTo(botC[i][0], botC[i][1]);
  }
  for (let i = N; i >= i0; i--) {
    bandT.lineTo(topF[i][0], topF[i][1]);
    bandB.lineTo(botF[i][0], botF[i][1]);
  }
  bandT.closePath();
  bandB.closePath();
  ctx.fillStyle = palette.fin;
  ctx.fill(bandT);
  ctx.fill(bandB);

  const rays = new Path2D();
  for (const ri of [5, 8, 11]) {
    rays.moveTo(topC[ri][0], topC[ri][1]);
    rays.lineTo(topF[ri][0], topF[ri][1]);
    rays.moveTo(botC[ri][0], botC[ri][1]);
    rays.lineTo(botF[ri][0], botF[ri][1]);
  }
  for (let i = i0; i <= N; i++) {
    if (i === i0) rays.moveTo(topC[i][0], topC[i][1]);
    else rays.lineTo(topC[i][0], topC[i][1]);
  }
  for (let i = i0; i <= N; i++) {
    if (i === i0) rays.moveTo(botC[i][0], botC[i][1]);
    else rays.lineTo(botC[i][0], botC[i][1]);
  }
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = FIN_RAY;
  ctx.stroke(rays);

  // 6. belly
  let p = new Path2D();
  ell(p, -6, 14, 26, 6.2, 0.03);
  ctx.fillStyle = palette.belly;
  ctx.fill(p);

  // 7. shines (body, head)
  p = new Path2D();
  ell(p, -16, -9, 12, 3, -0.08);
  ctx.fillStyle = BODY_SHINE;
  ctx.fill(p);
  p = new Path2D();
  ell(p, 17, -16, 7, 2.8, -0.35);
  ctx.fill(p);

  // 8. freckles
  ctx.fillStyle = FRECKLE;
  for (const [fx, fy, fr] of [
    [-20, 1, 1.7],
    [-29, -4, 1.5],
    [-12, 5, 1.4],
  ]) {
    p = new Path2D();
    ell(p, fx, fy, fr, fr);
    ctx.fill(p);
  }

  // 9. near gills (in front of the body, sprouting from the cheek)
  for (const g of NEAR_GILLS) gill(ctx, g, tfl, palette.gillNearStem, palette.gillNearFilament);

  // 10. blush
  p = new Path2D();
  ell(p, 27, 9, 5, 3.3);
  ell(p, 44, 8, 4, 2.7);
  ctx.fillStyle = BLUSH;
  ctx.fill(p);

  // 11. mouth: fill, outline, corner ticks
  const mouth = new Path2D();
  mouth.moveTo(28, 10);
  mouth.quadraticCurveTo(38, 13, 49, 7);
  mouth.quadraticCurveTo(38, 22, 28, 10);
  mouth.closePath();
  ctx.fillStyle = palette.mouth;
  ctx.fill(mouth);
  ctx.lineWidth = 2.4;
  ctx.strokeStyle = INK;
  ctx.stroke(mouth);
  const ticks = new Path2D();
  ticks.moveTo(28, 10);
  ticks.lineTo(26.4, 7.6);
  ticks.moveTo(49, 7);
  ticks.lineTo(50.4, 4.6);
  ctx.lineWidth = 2;
  ctx.stroke(ticks);

  // 12. eyes
  eye(ctx, 28, -6, 6.4, pose.blink, palette.eye);
  eye(ctx, 42, -7, 5.3, pose.blink, palette.eye);

  // regeneration glints sit on top of everything
  paintRegenGlints(ctx, tail, pose);
}
