/**
 * Worn Wearables (guide 6a, 6i, 6q; PRD F13), headless. The painters run against a recording
 * context (the same stub-Path2D approach as the eye-layer tests in drawAxolotlParts.test.ts):
 * every fill and stroke is kept as flattened polygons in local units with the style, width and
 * clip it was painted under, so the tests can ask where ink landed and in what order.
 */
import { describe, expect, it, vi } from 'vitest';
import { AXO_REST_POSE, AXO_TEX, drawAxolotl, type AxolotlPose, type LegLook } from './drawAxolotl';
import {
  AXO_AGES,
  AXO_BODIES,
  AXO_SEXES,
  AXO_SIZES,
  AXO_TAILS,
  BACK_FRAME_BOX,
  DEFAULT_ART_LOOK,
  EYELASH_INK,
  EYELASH_UNDER,
  FAR_EYE_ZONE,
  FAR_LASH_REACH,
  GILL_ROOT_ZONE,
  GLASSES_EXTENT,
  HEAD_FOOTPRINT,
  HEAD_ELLIPSE,
  MOUTH_INK,
  MOUTH_ZONE,
  NECK_FOOTPRINT,
  NEAR_EYE_ZONE,
  NEAR_LASH_REACH,
  SHIRT_BACK_FRONT_LINE_X,
  SHIRT_FRONT_X,
  TAIL_SLOT_REACH,
  WEARABLE_LAYERS,
  WEARABLE_SLOTS,
  axolotlBodyGeometry,
  backFrame,
  feetEnvelope,
  legSlotFrames,
  shirtGeometry,
  sockFootPad,
  tailSlotFrame,
  type AxolotlArtLook,
  type BodyEllipse,
  type BodyWearableSlot,
  type Bounds,
  type LegSlotFrame,
  type WearFrame,
  type WearableSlot,
  type ZoneCircle,
} from './drawAxolotlParts';
import {
  NO_OUTFIT,
  WEARABLE_ART_SLOT,
  WEARABLE_ART_SLUGS,
  artOutfit,
  outfitKey,
  paintBodyWearable,
  paintLegWearables,
  wearsOnLegs,
  wornSlug,
  type ArtOutfit,
  type WearableArtSlug,
} from './drawWearables';
import { BLUSH, FRECKLE, INK, LEUCISTIC, LW, WHITE, type MorphPalette } from './palette';
import { bakeAxolotlStill } from './textures';
import {
  BOW_GEM,
  DIVING_TANK_FILL,
  DIVING_TANK_STRAP,
  FLIPPER_CUFF,
  FLIPPER_FILL,
  FLIPPER_RIDGE,
  GLASSES_FRAME,
  GLASSES_GEM,
  GLASSES_LENS,
  GOLD_TRIM,
  HAT_FILL,
  NECKLACE_CORD,
  NECKLACE_SHELL,
  SOCK_FILL,
  SOCK_STRIPE_ALPHA,
  TANK_TOP_FILL,
  TREASURE_SHINE,
  WORN_FAR_INK_MIX,
} from './treasurePalette';

// The texture module names Phaser only in types; keep the engine out of the node run regardless.
vi.mock('phaser', () => ({}));

const TAU = Math.PI * 2;
/** Guide 11: at least 4 logical units of padding inside the texture frame. */
const FRAME_PAD = 4;
/** Flattened arcs sit inside their circle by their sagitta (under 0.002 here); geometry is held to this. */
const TOL = 0.005;
/** The Sock sleeve's ink and colour widths (guide 6i). */
const SLEEVE_INK_W = 15.2;
const SLEEVE_COLOUR_W = 10.4;

// ---------------------------------------------------------------------------
// A recording canvas context
// ---------------------------------------------------------------------------

interface Pt {
  x: number;
  y: number;
}
type Mat = readonly [number, number, number, number, number, number];
const IDENTITY: Mat = [1, 0, 0, 1, 0, 0];

/** `m` then `n` in canvas order (n is applied to points first). */
function mul(m: Mat, n: Mat): Mat {
  return [
    m[0] * n[0] + m[2] * n[1],
    m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3],
    m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4],
    m[1] * n[4] + m[3] * n[5] + m[5],
  ];
}
function apply(m: Mat, p: Pt): Pt {
  return { x: m[0] * p.x + m[2] * p.y + m[4], y: m[1] * p.x + m[3] * p.y + m[5] };
}

interface SubPath {
  pts: Pt[];
  closed: boolean;
}

/** Signed sweep of an arc from `a0` to `a1` as canvas defines it. */
function sweep(a0: number, a1: number, ccw: boolean): number {
  const d = a1 - a0;
  if (!ccw) return d >= TAU ? TAU : ((d % TAU) + TAU) % TAU;
  return d <= -TAU ? -TAU : -((((-d) % TAU) + TAU) % TAU);
}

/** A Path2D stand-in that flattens every command into polylines. */
class RecPath {
  readonly subs: SubPath[] = [];
  private cur: SubPath | null = null;
  private start: Pt = { x: 0, y: 0 };
  private last: Pt = { x: 0, y: 0 };
  /** After closePath the next command starts a subpath at the old start point. */
  private reopen = false;

  private begin(p: Pt): void {
    this.cur = { pts: [p], closed: false };
    this.subs.push(this.cur);
    this.start = p;
    this.last = p;
    this.reopen = false;
  }
  private add(p: Pt): void {
    if (!this.cur) this.begin(p);
    else this.cur.pts.push(p);
    this.last = p;
  }
  private ensure(): void {
    if (!this.cur) this.begin(this.reopen ? this.start : this.last);
  }
  moveTo(x: number, y: number): void {
    this.begin({ x, y });
  }
  lineTo(x: number, y: number): void {
    if (!this.cur && this.reopen) this.ensure();
    this.add({ x, y });
  }
  closePath(): void {
    if (!this.cur) return;
    this.cur.closed = true;
    this.cur = null;
    this.last = this.start;
    this.reopen = true;
  }
  ellipse(x: number, y: number, rx: number, ry: number, rot: number, a0: number, a1: number, ccw = false): void {
    const d = sweep(a0, a1, ccw);
    const n = Math.max(8, Math.ceil(Math.abs(d) / 0.03));
    const c = Math.cos(rot);
    const s = Math.sin(rot);
    for (let k = 0; k <= n; k++) {
      const a = a0 + (d * k) / n;
      const ex = rx * Math.cos(a);
      const ey = ry * Math.sin(a);
      const p = { x: x + ex * c - ey * s, y: y + ex * s + ey * c };
      if (k === 0 && this.reopen) this.ensure();
      this.add(p);
    }
  }
  arc(x: number, y: number, r: number, a0: number, a1: number, ccw = false): void {
    this.ellipse(x, y, r, r, 0, a0, a1, ccw);
  }
  arcTo(x1: number, y1: number, x2: number, y2: number, r: number): void {
    this.ensure();
    const p0 = this.last;
    const v0 = { x: p0.x - x1, y: p0.y - y1 };
    const v1 = { x: x2 - x1, y: y2 - y1 };
    const l0 = Math.hypot(v0.x, v0.y);
    const l1 = Math.hypot(v1.x, v1.y);
    const u0 = { x: v0.x / l0, y: v0.y / l0 };
    const u1 = { x: v1.x / l1, y: v1.y / l1 };
    const cross = u0.x * u1.y - u0.y * u1.x;
    if (l0 === 0 || l1 === 0 || r === 0 || Math.abs(cross) < 1e-9) {
      this.add({ x: x1, y: y1 });
      return;
    }
    const half = Math.acos(Math.max(-1, Math.min(1, u0.x * u1.x + u0.y * u1.y))) / 2;
    const dist = r / Math.tan(half);
    const t0 = { x: x1 + u0.x * dist, y: y1 + u0.y * dist };
    const t1 = { x: x1 + u1.x * dist, y: y1 + u1.y * dist };
    const bis = { x: u0.x + u1.x, y: u0.y + u1.y };
    const bl = Math.hypot(bis.x, bis.y);
    const cd = r / Math.sin(half);
    const centre = { x: x1 + (bis.x / bl) * cd, y: y1 + (bis.y / bl) * cd };
    this.add(t0);
    const a0 = Math.atan2(t0.y - centre.y, t0.x - centre.x);
    const a1 = Math.atan2(t1.y - centre.y, t1.x - centre.x);
    const d = sweep(a0, a1, cross > 0);
    const n = Math.max(4, Math.ceil(Math.abs(d) / 0.03));
    for (let k = 1; k <= n; k++) {
      const a = a0 + (d * k) / n;
      this.add({ x: centre.x + r * Math.cos(a), y: centre.y + r * Math.sin(a) });
    }
  }
  quadraticCurveTo(cx: number, cy: number, x: number, y: number): void {
    this.ensure();
    const p0 = this.last;
    for (let k = 1; k <= 24; k++) {
      const t = k / 24;
      const m = 1 - t;
      this.add({ x: m * m * p0.x + 2 * m * t * cx + t * t * x, y: m * m * p0.y + 2 * m * t * cy + t * t * y });
    }
  }
  bezierCurveTo(c1x: number, c1y: number, c2x: number, c2y: number, x: number, y: number): void {
    this.ensure();
    const p0 = this.last;
    for (let k = 1; k <= 32; k++) {
      const t = k / 32;
      const m = 1 - t;
      this.add({
        x: m * m * m * p0.x + 3 * m * m * t * c1x + 3 * m * t * t * c2x + t * t * t * x,
        y: m * m * m * p0.y + 3 * m * m * t * c1y + 3 * m * t * t * c2y + t * t * t * y,
      });
    }
  }
}

/** One fill or stroke, in local units, with what it was painted under. */
interface Paint {
  kind: 'fill' | 'stroke';
  style: string;
  lineWidth: number;
  alpha: number;
  lineCap: string;
  subs: SubPath[];
  /** Every active clip region, each a list of subpaths. */
  clips: SubPath[][];
}

interface CtxState {
  fillStyle: string;
  strokeStyle: string;
  lineWidth: number;
  globalAlpha: number;
  lineCap: string;
  lineJoin: string;
  m: Mat;
  clips: SubPath[][];
}

class Recorder {
  readonly paints: Paint[] = [];
  /** save() calls not yet matched by restore(). */
  depth = 0;
  private st: CtxState = {
    fillStyle: '#000000',
    strokeStyle: '#000000',
    lineWidth: 1,
    globalAlpha: 1,
    // What beginDraw sets before every bake; paintEyelashes sets 'butt' for itself.
    lineCap: 'round',
    lineJoin: 'round',
    m: IDENTITY,
    clips: [],
  };
  private stack: CtxState[] = [];

  get matrix(): Mat {
    return this.st.m;
  }
  get alpha(): number {
    return this.st.globalAlpha;
  }

  context(): CanvasRenderingContext2D {
    const handlers: Record<string, (...a: never[]) => unknown> = {
      save: () => {
        this.stack.push({ ...this.st });
        this.depth++;
      },
      restore: () => {
        const s = this.stack.pop();
        if (s) this.st = s;
        this.depth--;
      },
      translate: (x: number, y: number) => {
        this.st.m = mul(this.st.m, [1, 0, 0, 1, x, y]);
      },
      rotate: (a: number) => {
        const c = Math.cos(a);
        const s = Math.sin(a);
        this.st.m = mul(this.st.m, [c, s, -s, c, 0, 0]);
      },
      scale: (x: number, y: number) => {
        this.st.m = mul(this.st.m, [x, 0, 0, y, 0, 0]);
      },
      setTransform: (a: number, b: number, c: number, d: number, e: number, f: number) => {
        this.st.m = [a, b, c, d, e, f];
      },
      clip: (path: RecPath) => {
        this.st.clips = [...this.st.clips, this.device(path)];
      },
      fill: (path: RecPath) => this.paint('fill', path),
      stroke: (path: RecPath) => this.paint('stroke', path),
    };
    return new Proxy(
      {},
      {
        get: (_target, key: string) => {
          if (Object.hasOwn(handlers, key)) return handlers[key];
          if (Object.hasOwn(this.st, key)) return (this.st as unknown as Record<string, unknown>)[key];
          return () => undefined;
        },
        set: (_target, key: string, value: unknown) => {
          (this.st as unknown as Record<string, unknown>)[key] = value;
          return true;
        },
      },
    ) as CanvasRenderingContext2D;
  }

  private device(path: RecPath): SubPath[] {
    return path.subs.map((s) => ({ pts: s.pts.map((p) => apply(this.st.m, p)), closed: s.closed }));
  }

  private paint(kind: 'fill' | 'stroke', path: RecPath): void {
    this.paints.push({
      kind,
      style: kind === 'fill' ? this.st.fillStyle : this.st.strokeStyle,
      lineWidth: this.st.lineWidth,
      alpha: this.st.globalAlpha,
      lineCap: this.st.lineCap,
      subs: this.device(path),
      clips: this.st.clips,
    });
  }
}

/** Run `draw` against a fresh recorder with Path2D stubbed. */
function record(draw: (ctx: CanvasRenderingContext2D) => void): Recorder {
  const rec = new Recorder();
  vi.stubGlobal('Path2D', RecPath);
  try {
    draw(rec.context());
  } finally {
    vi.unstubAllGlobals();
  }
  return rec;
}

// ---------------------------------------------------------------------------
// Geometry of what was painted
// ---------------------------------------------------------------------------

/** The painted region as the checks see it: a clipped paint counts as its whole clip (a superset). */
interface Region {
  subs: SubPath[];
  kind: 'fill' | 'stroke';
  /** Half the line width for a stroke, else 0. */
  hw: number;
}

function regionOf(p: Paint): Region {
  if (p.clips.length > 0) return { subs: p.clips[p.clips.length - 1], kind: 'fill', hw: 0 };
  return { subs: p.subs, kind: p.kind, hw: p.kind === 'stroke' ? p.lineWidth / 2 : 0 };
}

/** Nonzero winding number of `subs` about (x, y). */
function winding(subs: readonly SubPath[], x: number, y: number): number {
  let w = 0;
  for (const s of subs) {
    const pts = s.pts;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      const side = (b.x - a.x) * (y - a.y) - (x - a.x) * (b.y - a.y);
      if (a.y <= y) {
        if (b.y > y && side > 0) w++;
      } else if (b.y <= y && side < 0) w--;
    }
  }
  return w;
}

function segDist(px: number, py: number, a: Pt, b: Pt): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l2 = dx * dx + dy * dy;
  const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - a.x) * dx + (py - a.y) * dy) / l2));
  return Math.hypot(px - (a.x + t * dx), py - (a.y + t * dy));
}

/** Edges of a region: every consecutive pair, plus the closing edge of a closed subpath or any fill. */
function edgesOf(r: Region): [Pt, Pt][] {
  const out: [Pt, Pt][] = [];
  for (const s of r.subs) {
    const n = s.pts.length;
    const close = s.closed || r.kind === 'fill';
    for (let i = 0; i < (close ? n : n - 1); i++) out.push([s.pts[i], s.pts[(i + 1) % n]]);
  }
  return out;
}

/** Whether the closed segment a-b touches the closed box (Liang-Barsky). */
function segHitsBox(a: Pt, b: Pt, box: Bounds): boolean {
  let t0 = 0;
  let t1 = 1;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const clip = (p: number, q: number): boolean => {
    if (p === 0) return q >= 0;
    const t = q / p;
    if (p < 0) {
      if (t > t1) return false;
      if (t > t0) t0 = t;
    } else {
      if (t < t0) return false;
      if (t < t1) t1 = t;
    }
    return true;
  };
  return (
    clip(-dx, a.x - box.minX) && clip(dx, box.maxX - a.x) && clip(-dy, a.y - box.minY) && clip(dy, box.maxY - a.y)
  );
}

/** Whether the painted region reaches more than `eps` into the circle. */
function reachesCircle(r: Region, c: ZoneCircle, eps = TOL): boolean {
  if (r.kind === 'fill' && winding(r.subs, c.x, c.y) !== 0) return true;
  let best = Infinity;
  for (const [a, b] of edgesOf(r)) best = Math.min(best, segDist(c.x, c.y, a, b));
  return best - r.hw < c.r - eps;
}

/** Whether the painted region reaches more than `eps` into the box. */
function reachesBox(r: Region, box: Bounds, eps = TOL): boolean {
  const grow = r.hw - eps;
  const probe: Bounds = {
    minX: box.minX - grow,
    minY: box.minY - grow,
    maxX: box.maxX + grow,
    maxY: box.maxY + grow,
  };
  if (probe.minX >= probe.maxX || probe.minY >= probe.maxY) return false;
  if (r.kind === 'fill' && winding(r.subs, (box.minX + box.maxX) / 2, (box.minY + box.maxY) / 2) !== 0) return true;
  return edgesOf(r).some(([a, b]) => segHitsBox(a, b, probe));
}

/** Local box of every painted point, ink included. */
function inkBounds(paints: readonly Paint[]): Bounds {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of paints) {
    const r = regionOf(p);
    for (const s of r.subs) {
      for (const q of s.pts) {
        minX = Math.min(minX, q.x - r.hw);
        minY = Math.min(minY, q.y - r.hw);
        maxX = Math.max(maxX, q.x + r.hw);
        maxY = Math.max(maxY, q.y + r.hw);
      }
    }
  }
  return { minX, minY, maxX, maxY };
}

function isInside(inner: Bounds, outer: Bounds, eps = TOL): boolean {
  return (
    inner.minX >= outer.minX - eps &&
    inner.minY >= outer.minY - eps &&
    inner.maxX <= outer.maxX + eps &&
    inner.maxY <= outer.maxY + eps
  );
}

/** A point in a frame's own (u, v) axes. */
function toFrame(frame: WearFrame, p: Pt): Pt {
  const c = Math.cos(frame.angle);
  const s = Math.sin(frame.angle);
  const dx = p.x - frame.x;
  const dy = p.y - frame.y;
  return { x: dx * c + dy * s, y: -dx * s + dy * c };
}

/** Every painted point of `paints` as (point, ink half-width), clips counted as their region. */
function inkPoints(paints: readonly Paint[]): { p: Pt; hw: number }[] {
  return paints.flatMap((paint) => {
    const r = regionOf(paint);
    return r.subs.flatMap((s) => s.pts.map((p) => ({ p, hw: r.hw })));
  });
}

function frameInner(pad: number): Bounds {
  return {
    minX: -AXO_TEX.originX + pad,
    minY: -AXO_TEX.originY + pad,
    maxX: AXO_TEX.w - AXO_TEX.originX - pad,
    maxY: AXO_TEX.h - AXO_TEX.originY - pad,
  };
}

// ---------------------------------------------------------------------------
// What to paint
// ---------------------------------------------------------------------------

const BODY_SLOTS: readonly BodyWearableSlot[] = ['shirt', 'tail', 'neck', 'back', 'head', 'face'];
const SLUG_OF: Readonly<Record<WearableSlot, WearableArtSlug>> = {
  head: 'sun-hat',
  neck: 'shell-necklace',
  face: 'heart-glasses',
  shirt: 'tank-top',
  back: 'diving-tank',
  tail: 'golden-bow',
  socks: 'stripy-socks',
  feet: 'flippers',
};
const FULL: ArtOutfit = { ...SLUG_OF };

/** Every Boy or girl, Tail, Body and Age (the size only scales the bake): 54 looks. */
function everyBodyLook(): AxolotlArtLook[] {
  const looks: AxolotlArtLook[] = [];
  for (const sex of AXO_SEXES)
    for (const tail of AXO_TAILS)
      for (const body of AXO_BODIES)
        for (const age of AXO_AGES) looks.push({ ...DEFAULT_ART_LOOK, sex, tail, body, age });
  return looks;
}
const EVERY_BODY_LOOK = everyBodyLook();
const lookId = (look: AxolotlArtLook): string => [look.size, look.sex, look.tail, look.body, look.age].join(' ');
/** Swim phases round a whole cycle, tail amplitudes up to the frame's 1.6. */
const SWIMS = Array.from({ length: 13 }, (_, i) => (i / 12) * TAU);
const AMPS = [1, 1.6] as const;
/** The enumerations over 54 looks and a swim cycle take a few seconds each. */
const ENUMERATION_TIMEOUT_MS = 30_000;

function bodyPaints(slot: BodyWearableSlot, look: AxolotlArtLook, swim = 0, amp = 1): Paint[] {
  const outfit: ArtOutfit = { [slot]: SLUG_OF[slot] };
  const rec = record((ctx) => paintBodyWearable(ctx, slot, outfit, look, swim, amp));
  expect(rec.depth).toBe(0);
  expect(rec.matrix).toEqual(IDENTITY);
  expect(rec.alpha).toBe(1);
  return rec.paints;
}

function legPaints(outfit: ArtOutfit, frame: LegSlotFrame): Paint[] {
  const rec = record((ctx) => paintLegWearables(ctx, outfit, frame));
  expect(rec.depth).toBe(0);
  expect(rec.matrix).toEqual(IDENTITY);
  return rec.paints;
}

/** A palette whose eye colour no other paint uses, to find the eyes in a recording. */
const EYE_COLOUR = '#123456';
const SENTINEL_PALETTE: MorphPalette = { ...LEUCISTIC, eye: EYE_COLOUR };

function drawn(pose: AxolotlPose, look: AxolotlArtLook, outfit?: ArtOutfit): Paint[] {
  const rec = record((ctx) => {
    if (outfit === undefined) drawAxolotl(ctx, pose, SENTINEL_PALETTE, look);
    else drawAxolotl(ctx, pose, SENTINEL_PALETTE, look, outfit);
  });
  expect(rec.depth).toBe(0);
  expect(rec.matrix).toEqual(IDENTITY);
  expect(rec.alpha).toBe(1);
  return rec.paints;
}

const signature = (p: Paint): string =>
  [
    p.kind,
    p.style,
    p.lineWidth,
    p.alpha,
    p.lineCap,
    p.clips.length,
    p.subs.map((s) => s.pts.map((q) => `${q.x.toFixed(3)},${q.y.toFixed(3)}`).join(' ')).join('/'),
  ].join('|');

interface Inserted {
  /** Index in the outfit recording. */
  index: number;
  paint: Paint;
}

/**
 * The paints `withOutfit` has beyond `base`, or null when `base` is not a subsequence of it (so a
 * Wearable changed or moved a paint the axolotl already made).
 */
function insertedPaints(base: readonly Paint[], withOutfit: readonly Paint[]): Inserted[] | null {
  const baseSigs = base.map(signature);
  const extra: Inserted[] = [];
  let b = 0;
  withOutfit.forEach((paint, index) => {
    if (b < baseSigs.length && signature(paint) === baseSigs[b]) b++;
    else extra.push({ index, paint });
  });
  return b === baseSigs.length ? extra : null;
}

/** Index of the first paint of the eyes: a Girl's lash under-stroke, or the bead fill. */
function firstEyePaint(paints: readonly Paint[]): number {
  return paints.findIndex(
    (p) =>
      (p.kind === 'stroke' && p.lineCap === 'butt' && (p.lineWidth === EYELASH_UNDER || p.lineWidth === EYELASH_INK)) ||
      (p.kind === 'fill' && p.style === EYE_COLOUR),
  );
}

const SOCKS_AND_FEET: ArtOutfit = { socks: 'stripy-socks', feet: 'flippers' };

/** The Sock sleeve's paints: its 15.2 ink stroke, its 10.4 colour stroke and its alpha 0.30 stripes. */
const isSleevePaint = (p: Paint): boolean =>
  (p.kind === 'stroke' && (p.lineWidth === SLEEVE_INK_W || p.lineWidth === SLEEVE_COLOUR_W)) ||
  (p.kind === 'fill' && p.alpha === SOCK_STRIPE_ALPHA);

const POSES: Readonly<Record<string, AxolotlPose>> = {
  rest: AXO_REST_POSE,
  swimming: { ...AXO_REST_POSE, swimPhase: 1.3, tailAmp: 1.6, sparkle: 0.7 },
};
const GIRL: AxolotlArtLook = { ...DEFAULT_ART_LOOK, sex: 'girl' };

const present: LegLook = { status: 'present', progress: 0 };
const lost: LegLook = { status: 'lost', progress: 0 };
const regrowing = (progress: number): LegLook => ({ status: 'regrowing', progress });

/**
 * The paints the Socks and Feet make on leg `i` alone in a full drawAxolotl run at the rest pose (the
 * other three legs lost, which paints no wear), as signatures.
 */
function legWearSignatures(look: AxolotlArtLook, i: number, outfit: ArtOutfit): string[] {
  const legs = [lost, lost, lost, lost];
  legs[i] = present;
  const pose: AxolotlPose = { ...AXO_REST_POSE, legs };
  return insertedPaints(drawn(pose, look), drawn(pose, look, outfit))!.map((x) => signature(x.paint));
}

/** A pose where leg `i` has `look` and the other three are present. */
function legPose(i: number, look: LegLook): AxolotlPose {
  const legs = [present, present, present, present];
  legs[i] = look;
  return { ...AXO_REST_POSE, swimPhase: 0.7, legs };
}

// ---------------------------------------------------------------------------
// The art outfit
// ---------------------------------------------------------------------------

describe('art outfit', () => {
  it('has one art slug per slot, in PRD slot order', () => {
    expect(WEARABLE_ART_SLUGS).toEqual([
      'sun-hat',
      'shell-necklace',
      'heart-glasses',
      'tank-top',
      'diving-tank',
      'golden-bow',
      'stripy-socks',
      'flippers',
    ]);
    expect(WEARABLE_ART_SLUGS.map((slug) => WEARABLE_ART_SLOT[slug])).toEqual([...WEARABLE_SLOTS]);
  });

  it('is empty by default, and the default is frozen', () => {
    expect(NO_OUTFIT).toEqual({});
    expect(Object.isFrozen(NO_OUTFIT)).toBe(true);
    expect(outfitKey(NO_OUTFIT)).toBe('');
    for (const slot of WEARABLE_SLOTS) expect(wornSlug(NO_OUTFIT, slot)).toBeUndefined();
    expect(wearsOnLegs(NO_OUTFIT)).toBe(false);
  });

  it('maps catalogue ids to art slugs by the text after the first slash, per slot', () => {
    expect(
      artOutfit({
        head: 'canal/sun-hat',
        neck: 'canal/shell-necklace',
        face: 'canal/heart-glasses',
        shirt: 'canal/tank-top',
        back: 'canal/diving-tank',
        tail: 'canal/golden-bow',
        socks: 'canal/stripy-socks',
        feet: 'canal/flippers',
      }),
    ).toEqual(FULL);
    expect(artOutfit({ head: 'canal/sun-hat', neck: null, face: undefined })).toEqual({ head: 'sun-hat' });
  });

  it('leaves out ids that are unknown, and ids worn in the wrong slot', () => {
    expect(artOutfit({ head: 'canal/pond-plant', neck: 'canal/sun-hat', face: 'sun-hat/x', shirt: 'canal/constructor' })).toEqual({});
    expect(artOutfit({ head: 'canal/toString', back: 'canal/__proto__' })).toEqual({});
    expect(artOutfit({ head: 'sun-hat' })).toEqual({ head: 'sun-hat' });
  });

  it('keys an outfit by what is worn, in slot order, so a repaint check sees only real changes', () => {
    expect(outfitKey({ head: 'sun-hat' })).toBe('head=sun-hat');
    expect(outfitKey({ feet: 'flippers', head: 'sun-hat' })).toBe('head=sun-hat,feet=flippers');
    expect(outfitKey({ head: null, neck: undefined })).toBe('');
    // A slug for another slot paints nothing, so it must not change the key either.
    expect(outfitKey({ head: 'tank-top' })).toBe('');
    expect(wornSlug({ head: 'tank-top' }, 'head')).toBeUndefined();
    expect(outfitKey(FULL)).toBe(WEARABLE_SLOTS.map((slot) => `${slot}=${SLUG_OF[slot]}`).join(','));
    expect(wearsOnLegs({ socks: 'stripy-socks' })).toBe(true);
    expect(wearsOnLegs({ feet: 'flippers' })).toBe(true);
    expect(wearsOnLegs({ head: 'sun-hat' })).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Default: no outfit paints exactly as before Wearables
// ---------------------------------------------------------------------------

describe('no outfit (regression)', () => {
  /** Hash of every call and property set drawAxolotl makes, with Path2D commands in the log. */
  function callLogHash(pose: AxolotlPose, look: AxolotlArtLook, outfit?: ArtOutfit): string {
    class LogPath {
      readonly cmds: unknown[] = [];
      constructor() {
        return new Proxy(this, {
          get: (target, key) =>
            key === 'cmds' ? target.cmds : (...args: unknown[]) => void target.cmds.push([String(key), ...args]),
        });
      }
    }
    const log: unknown[] = [];
    vi.stubGlobal('Path2D', LogPath);
    const ctx = new Proxy(
      {},
      {
        get:
          (_target, key) =>
          (...args: unknown[]) => {
            log.push([String(key), ...args.map((a) => (a instanceof LogPath ? a.cmds : a))]);
          },
        set: (_target, key, value) => {
          log.push(['set', String(key), value]);
          return true;
        },
      },
    ) as unknown as CanvasRenderingContext2D;
    try {
      if (outfit === undefined) drawAxolotl(ctx, pose, LEUCISTIC, look);
      else drawAxolotl(ctx, pose, LEUCISTIC, look, outfit);
    } finally {
      vi.unstubAllGlobals();
    }
    const text = JSON.stringify(log);
    const hash = (seed: number): string => {
      let x = seed;
      for (let i = 0; i < text.length; i++) x = Math.imul(x ^ text.charCodeAt(i), 16777619) >>> 0;
      return x.toString(16).padStart(8, '0');
    };
    return `${hash(0x811c9dc5)}${hash(0x9e3779b9)}:${text.length}`;
  }

  const legs: readonly LegLook[] = [present, lost, regrowing(0.5), present];
  const looks: AxolotlArtLook[] = [
    DEFAULT_ART_LOOK,
    { ...DEFAULT_ART_LOOK, sex: 'girl', body: 'chubby', age: 'baby', tail: 'long' },
    { ...DEFAULT_ART_LOOK, sex: 'boy', body: 'slim', age: 'grownUp', tail: 'short' },
  ];
  const poses: AxolotlPose[] = [AXO_REST_POSE, { ...AXO_REST_POSE, swimPhase: 1.3, tailAmp: 1.6, sparkle: 0.7, legs }];
  /** Recorded from the painter before Wearables existed (pose-major, then look). */
  const BEFORE_WEARABLES = [
    'bd38c5db2508a8d7:32084',
    '4c9243ce24f164aa:34251',
    'dc5a96b05f46a954:32963',
    '07de654681b19bda:41725',
    '9ff458d18e3f786d:43879',
    'e6dd6f9972bdf625:42638',
  ];

  it('makes exactly the calls the painter made before Wearables existed', () => {
    const now = poses.flatMap((pose) => looks.map((look) => callLogHash(pose, look)));
    expect(now).toEqual(BEFORE_WEARABLES);
  });

  it('makes those same calls for an empty outfit, empty slots, and slugs that do not fit their slot', () => {
    const empties: ArtOutfit[] = [
      NO_OUTFIT,
      {},
      { head: null, neck: null, face: null, shirt: null, back: null, tail: null, socks: null, feet: null },
      { head: 'tank-top', socks: 'sun-hat', feet: 'stripy-socks', tail: 'flippers' },
    ];
    for (const outfit of empties) {
      const now = poses.flatMap((pose) => looks.map((look) => callLogHash(pose, look, outfit)));
      expect(now).toEqual(BEFORE_WEARABLES);
    }
  });
});

// ---------------------------------------------------------------------------
// Layers and the eyes
// ---------------------------------------------------------------------------

describe('layers (guide 6a)', { timeout: ENUMERATION_TIMEOUT_MS }, () => {
  const looks: AxolotlArtLook[] = [
    DEFAULT_ART_LOOK,
    GIRL,
    { ...GIRL, body: 'chubby', age: 'baby', tail: 'short' },
    { ...DEFAULT_ART_LOOK, body: 'slim', age: 'grownUp', tail: 'long' },
  ];

  /** The paints one slot's item makes in a full drawAxolotl run, found by painting it alone. */
  function itemSignatures(slot: WearableSlot, pose: AxolotlPose, look: AxolotlArtLook): Set<string> {
    const alone = insertedPaints(drawn(pose, look), drawn(pose, look, { [slot]: SLUG_OF[slot] }));
    expect(alone).not.toBeNull();
    expect(alone!.length).toBeGreaterThan(0);
    return new Set(alone!.map((x) => signature(x.paint)));
  }

  function firstIndexOf(all: readonly Paint[], sigs: ReadonlySet<string>): number {
    return all.findIndex((p) => sigs.has(signature(p)));
  }
  function lastIndexOf(all: readonly Paint[], sigs: ReadonlySet<string>): number {
    for (let i = all.length - 1; i >= 0; i--) if (sigs.has(signature(all[i]))) return i;
    return -1;
  }

  it('adds Wearables without changing, moving or restyling any paint the axolotl already made', () => {
    for (const pose of Object.values(POSES)) {
      for (const look of looks) {
        expect(insertedPaints(drawn(pose, look), drawn(pose, look, FULL))).not.toBeNull();
      }
    }
  });

  it('paints every Wearable before the eyes, a Girl lashes included, which stay the last of the body', () => {
    for (const look of looks) {
      const base = drawn(AXO_REST_POSE, look);
      const worn = drawn(AXO_REST_POSE, look, FULL);
      const inserted = insertedPaints(base, worn);
      expect(inserted).not.toBeNull();
      expect(inserted!.length).toBeGreaterThan(0);
      const eyes = firstEyePaint(worn);
      expect(eyes).toBeGreaterThan(0);
      for (const x of inserted!) expect(x.index).toBeLessThan(eyes);
      // Everything from the first eye paint on is the base axolotl's own eye paint.
      expect(worn.length - eyes).toBe(base.length - firstEyePaint(base));
      if (look.sex === 'girl') {
        const lashes = worn.filter((p) => p.lineCap === 'butt' && (p.lineWidth === EYELASH_UNDER || p.lineWidth === EYELASH_INK));
        expect(lashes).toHaveLength(4);
        for (const lash of lashes) expect(worn.indexOf(lash)).toBeGreaterThanOrEqual(eyes);
      }
    }
  });

  it('paints the Face item below the eyes layer even with the glasses alone', () => {
    const base = drawn(AXO_REST_POSE, GIRL);
    const worn = drawn(AXO_REST_POSE, GIRL, { face: 'heart-glasses' });
    const inserted = insertedPaints(base, worn)!;
    expect(Math.max(...inserted.map((x) => x.index))).toBeLessThan(firstEyePaint(worn));
  });

  it('orders the body items by layer: Shirt 8.2, Tail 8.5, Neck 9.5, Back 9.7, Head 10.5, Face 11.5', () => {
    expect(WEARABLE_LAYERS.shirt).toBeLessThan(WEARABLE_LAYERS.tail);
    for (const look of looks) {
      const worn = drawn(AXO_REST_POSE, look, FULL);
      const at = (slot: WearableSlot): number => firstIndexOf(worn, itemSignatures(slot, AXO_REST_POSE, look));
      const end = (slot: WearableSlot): number => lastIndexOf(worn, itemSignatures(slot, AXO_REST_POSE, look));
      const order: WearableSlot[] = ['shirt', 'tail', 'neck', 'back', 'head', 'face'];
      for (let i = 1; i < order.length; i++) {
        // Each item's first paint comes after the previous item's last paint.
        expect(at(order[i])).toBeGreaterThan(end(order[i - 1]));
      }
      // The Shirt, then the Neck item, then the Back item, from the body out.
      expect(at('shirt')).toBeLessThan(at('neck'));
      expect(at('neck')).toBeLessThan(at('back'));
    }
  });

  it('puts the Shirt over the spots, the near gills under the Neck and Back items, the Head item over the blush and the Face item over the mouth', () => {
    const look = { ...GIRL, spots: 'patches' as const };
    const worn = drawn(AXO_REST_POSE, look, FULL);
    const nearGill = (p: Paint): boolean =>
      p.kind === 'stroke' && (p.style === LEUCISTIC.gillNearStem || p.style === LEUCISTIC.gillNearFilament);
    const lastOf = (holds: (p: Paint) => boolean): number => worn.map(holds).lastIndexOf(true);
    const firstOf = (holds: (p: Paint) => boolean): number => worn.findIndex(holds);
    const spots = lastOf((p) => p.kind === 'fill' && p.style === FRECKLE);
    const blush = lastOf((p) => p.kind === 'fill' && p.style === BLUSH);
    const mouth = lastOf((p) => p.kind === 'stroke' && p.lineWidth === MOUTH_INK);
    const gills = { first: firstOf(nearGill), last: lastOf(nearGill) };
    const shirt = firstIndexOf(worn, itemSignatures('shirt', AXO_REST_POSE, look));
    const tail = firstIndexOf(worn, itemSignatures('tail', AXO_REST_POSE, look));
    const neck = firstIndexOf(worn, itemSignatures('neck', AXO_REST_POSE, look));
    const back = firstIndexOf(worn, itemSignatures('back', AXO_REST_POSE, look));
    const head = firstIndexOf(worn, itemSignatures('head', AXO_REST_POSE, look));
    const face = firstIndexOf(worn, itemSignatures('face', AXO_REST_POSE, look));
    for (const index of [spots, blush, mouth, gills.first, gills.last, shirt, tail, neck, back, head, face]) {
      expect(index).toBeGreaterThan(0);
    }
    // 8 spots, 8.2 Shirt, 8.5 Tail item, 9 near gills, 9.5 Neck item, 9.7 Back item, 10 blush, 10.5 Head item,
    // 11 mouth, 11.5 Face item.
    const layers = [spots, shirt, tail, gills.first, gills.last, neck, back, blush, head, mouth, face];
    expect(layers).toEqual([...layers].sort((x, y) => x - y));
  });

  it('paints Socks and Feet with their leg behind the silhouette: far legs, then their wear, then near legs, then theirs', () => {
    for (const look of looks) {
      const worn = drawn(AXO_REST_POSE, look, FULL);
      const silhouette = worn.findIndex((p) => p.kind === 'stroke' && p.lineWidth === 2 * LW && p.style === INK);
      expect(silhouette).toBeGreaterThan(0);
      const wear = [0, 1, 2, 3].map((i) => legWearSignatures(look, i, SOCKS_AND_FEET).map((sig) => worn.findIndex((p) => signature(p) === sig)));
      for (const indices of wear) {
        expect(indices.length).toBeGreaterThan(0);
        for (const index of indices) expect(index).toBeGreaterThan(0);
        for (const index of indices) expect(index).toBeLessThan(silhouette);
      }
      // The leg tubes: colour strokes of width 8 (the tube) and 4.2 (a toe), far side colour then body colour.
      const tube = (colour: string): number[] =>
        worn.flatMap((p, i) => (p.kind === 'stroke' && p.style === colour && (p.lineWidth === 8 || p.lineWidth === 4.2) ? [i] : []));
      const farTubes = tube(LEUCISTIC.farSide);
      const nearTubes = tube(LEUCISTIC.body);
      const [far0, far1, near2, near3] = wear;
      // Layer 2 far legs, 2.5 their wear, 3 near legs, 3.5 their wear, 4 silhouette.
      expect(Math.max(...farTubes)).toBeLessThan(Math.min(...far0, ...far1));
      expect(Math.max(...far0, ...far1)).toBeLessThan(Math.min(...nearTubes));
      expect(Math.max(...nearTubes)).toBeLessThan(Math.min(...near2, ...near3));
      expect(Math.max(...near2, ...near3)).toBeLessThan(silhouette);
    }
  });

  it('paints the Sock first and the Feet item over it on every leg', () => {
    const look = GIRL;
    for (let i = 0; i < 4; i++) {
      const legs = [lost, lost, lost, lost];
      legs[i] = present;
      const pose: AxolotlPose = { ...AXO_REST_POSE, swimPhase: 0.7, legs };
      const base = drawn(pose, look);
      const both = insertedPaints(base, drawn(pose, look, { socks: 'stripy-socks', feet: 'flippers' }))!;
      const socks = insertedPaints(base, drawn(pose, look, { socks: 'stripy-socks' }))!;
      const feet = insertedPaints(base, drawn(pose, look, { feet: 'flippers' }))!;
      expect(socks.length).toBeGreaterThan(0);
      expect(feet.length).toBeGreaterThan(0);
      expect(both.length).toBe(socks.length + feet.length);
      const sockSigs = new Set(socks.map((x) => signature(x.paint)));
      const feetSigs = new Set(feet.map((x) => signature(x.paint)));
      const lastSock = Math.max(...both.filter((x) => sockSigs.has(signature(x.paint))).map((x) => x.index));
      const firstFeet = Math.min(...both.filter((x) => feetSigs.has(signature(x.paint))).map((x) => x.index));
      expect(lastSock).toBeLessThan(firstFeet);
    }
  });

  it('paints the same items at every size: the size scales the bake, not the painter', () => {
    for (const pose of Object.values(POSES)) {
      const bySize = AXO_SIZES.map((size) => {
        const look = { ...GIRL, size };
        return insertedPaints(drawn(pose, look), drawn(pose, look, FULL))!.map((x) => signature(x.paint));
      });
      expect(bySize[0].length).toBeGreaterThan(0);
      expect(bySize[1]).toEqual(bySize[0]);
      expect(bySize[2]).toEqual(bySize[0]);
    }
  });
});

// ---------------------------------------------------------------------------
// The feet rule (guide 6i, 6q)
// ---------------------------------------------------------------------------

describe('feet rule: a Sock and a Shoe go with their leg', { timeout: ENUMERATION_TIMEOUT_MS }, () => {
  const look = GIRL;

  function legWear(pose: AxolotlPose, outfit: ArtOutfit = SOCKS_AND_FEET): Set<string> {
    return new Set(insertedPaints(drawn(pose, look), drawn(pose, look, outfit))!.map((x) => signature(x.paint)));
  }

  /** The paints of leg `i` alone: the other three lost. */
  function onlyLeg(i: number): Set<string> {
    const legs = [lost, lost, lost, lost];
    legs[i] = present;
    return legWear({ ...AXO_REST_POSE, swimPhase: 0.7, legs });
  }

  it('wears on all four feet when every leg is present, and with the legs input absent', () => {
    const all = legWear({ ...AXO_REST_POSE, swimPhase: 0.7 });
    const parts = [0, 1, 2, 3].map(onlyLeg);
    expect(parts.every((p) => p.size > 0)).toBe(true);
    expect(all.size).toBe(parts.reduce((n, p) => n + p.size, 0));
    for (const part of parts) for (const sig of part) expect(all.has(sig)).toBe(true);
    expect(legWear({ ...AXO_REST_POSE, swimPhase: 0.7, legs: [present, present, present, present] })).toEqual(all);
    // A missing entry counts as present, as in the leg painter.
    expect(legWear({ ...AXO_REST_POSE, swimPhase: 0.7, legs: [present] })).toEqual(all);
  });

  it('draws neither Sock nor Shoe on a lost leg, and the other legs keep theirs', () => {
    const all = legWear({ ...AXO_REST_POSE, swimPhase: 0.7 });
    for (let i = 0; i < 4; i++) {
      const worn = legWear(legPose(i, lost));
      for (const sig of onlyLeg(i)) expect(worn.has(sig)).toBe(false);
      expect(worn.size).toBe(all.size - onlyLeg(i).size);
      for (const j of [0, 1, 2, 3].filter((k) => k !== i)) for (const sig of onlyLeg(j)) expect(worn.has(sig)).toBe(true);
    }
  });

  it('draws neither on a regrowing leg, at any progress, 100% included', () => {
    for (let i = 0; i < 4; i++) {
      const mine = onlyLeg(i);
      for (const progress of [0, 0.03, 0.5, 0.97, 1]) {
        const worn = legWear(legPose(i, regrowing(progress)));
        for (const sig of mine) expect(worn.has(sig)).toBe(false);
      }
    }
  });

  it('brings both back when the leg is fully regrown (present again), on that frame', () => {
    for (let i = 0; i < 4; i++) {
      const all = legWear({ ...AXO_REST_POSE, swimPhase: 0.7 });
      const regrown = legWear(legPose(i, present));
      expect(regrown).toEqual(all);
      for (const sig of onlyLeg(i)) expect(regrown.has(sig)).toBe(true);
    }
  });

  it('works for Socks alone and for Feet alone', () => {
    for (const outfit of [{ socks: 'stripy-socks' }, { feet: 'flippers' }] as ArtOutfit[]) {
      const all = legWear({ ...AXO_REST_POSE, swimPhase: 0.7 }, outfit);
      expect(all.size).toBeGreaterThan(0);
      for (let i = 0; i < 4; i++) {
        const worn = legWear(legPose(i, lost), outfit);
        expect(worn.size).toBeLessThan(all.size);
        expect(legWear(legPose(i, regrowing(0.5)), outfit).size).toBe(worn.size);
      }
    }
  });

  it('leaves the lost-leg ghost the plain bare leg: no paint of the leg is added, moved or enlarged', () => {
    for (let i = 0; i < 4; i++) {
      const pose = legPose(i, lost);
      expect(insertedPaints(drawn(pose, look), drawn(pose, look, SOCKS_AND_FEET))).not.toBeNull();
      const pose2 = legPose(i, regrowing(0.5));
      expect(insertedPaints(drawn(pose2, look), drawn(pose2, look, SOCKS_AND_FEET))).not.toBeNull();
    }
  });

  it('keeps wearing on the legs that are left, however many are lost (never all four)', () => {
    const legs = [lost, lost, lost, present];
    const worn = legWear({ ...AXO_REST_POSE, swimPhase: 0.7, legs });
    expect([...worn].sort()).toEqual([...onlyLeg(3)].sort());
  });

  it('never lets a Shirt see the leg state: it paints the same with every leg lost or regrowing', () => {
    const shirtAlone = (pose: AxolotlPose): string[] =>
      insertedPaints(drawn(pose, look), drawn(pose, look, { shirt: 'tank-top' }))!.map((x) => signature(x.paint));
    const four = shirtAlone({ ...AXO_REST_POSE, swimPhase: 0.7 });
    expect(four.length).toBeGreaterThan(0);
    for (const legs of [
      [lost, present, present, present],
      [lost, lost, lost, present],
      [regrowing(0.4), lost, regrowing(1), present],
      [present, regrowing(0), regrowing(0.99), lost],
    ]) {
      expect(shirtAlone({ ...AXO_REST_POSE, swimPhase: 0.7, legs })).toEqual(four);
    }
    // The full outfit's Shirt paints are the same too, whatever the legs do.
    const fullShirt = (pose: AxolotlPose): number =>
      insertedPaints(drawn(pose, look, { ...FULL, socks: null, feet: null }), drawn(pose, look, FULL))!.length;
    expect(fullShirt({ ...AXO_REST_POSE, swimPhase: 0.7 })).toBeGreaterThan(0);
  });

  it('paints the Sock pad in its leg frame, so it turns with the paddle', () => {
    for (const swim of [0, 1, 2.5, 4]) {
      for (const frame of legSlotFrames(look, swim)) {
        const pad = sockFootPad(frame);
        const fill = legPaints({ socks: 'stripy-socks' }, frame).find(
          (p) => p.kind === 'fill' && p.style !== INK && p.style !== TREASURE_SHINE,
        )!;
        const corners = fill.subs[0].pts.map((p) => toFrame(frame, p));
        const half = 1.4;
        // The pad's path is its ink-included rectangle pulled in by half the ink, whatever the leg angle.
        expect(Math.min(...corners.map((q) => q.x))).toBeCloseTo(pad.u0 + half, 3);
        expect(Math.max(...corners.map((q) => q.x))).toBeCloseTo(pad.u1 - half, 3);
        expect(Math.max(...corners.map((q) => q.y))).toBeCloseTo(pad.vHalf - half, 3);
        expect(Math.min(...corners.map((q) => q.y))).toBeCloseTo(-(pad.vHalf - half), 3);
      }
    }
  });

  it('mixes the far legs 12% toward ink and leaves the near legs as authored', () => {
    expect(WORN_FAR_INK_MIX).toBe(0.12);
    const frames = legSlotFrames(look, 0.7);
    const colours = (frame: LegSlotFrame): string[] =>
      legPaints(SOCKS_AND_FEET, frame)
        .filter((p) => p.alpha === 1 && p.style !== INK && p.style !== TREASURE_SHINE)
        .map((p) => p.style);
    // #efdcba 12% toward #2b2350 is #d7c6ad; #ffe14a is #e6ca4b.
    for (const i of [0, 1]) {
      const far = colours(frames[i]);
      expect(far).toContain('#d7c6ad');
      expect(far).toContain('#e6ca4b');
      expect(far).not.toContain(SOCK_FILL);
      expect(far).not.toContain(FLIPPER_FILL);
    }
    for (const i of [2, 3]) {
      const near = colours(frames[i]);
      expect(near).toContain(SOCK_FILL);
      expect(near).toContain(FLIPPER_FILL);
      expect(near).toContain(FLIPPER_CUFF);
      expect(near).toContain(FLIPPER_RIDGE);
    }
  });
});

// ---------------------------------------------------------------------------
// Keep-clear zones and footprints
// ---------------------------------------------------------------------------

describe('keep-clear zones (guide 6i, PRD F13)', { timeout: ENUMERATION_TIMEOUT_MS }, () => {
  const eyeZones: readonly ZoneCircle[] = [NEAR_EYE_ZONE, FAR_EYE_ZONE];
  const lashZones: readonly ZoneCircle[] = [NEAR_LASH_REACH, FAR_LASH_REACH];

  /** Why `paint` is not clear, or null. `lens` paints are the clear lens tint: the one allowed exception. */
  function trouble(paint: Paint, opts: { lashes: boolean; gills: boolean; mouth: boolean }): string | null {
    const region = regionOf(paint);
    if (paint.kind === 'fill' && paint.style === GLASSES_LENS) return null;
    if (eyeZones.some((z) => reachesCircle(region, z))) return 'eye zone';
    if (opts.lashes && lashZones.some((z) => reachesCircle(region, z))) return 'lash reach';
    if (opts.gills && reachesBox(region, GILL_ROOT_ZONE)) return 'gill-root zone';
    if (opts.mouth && reachesBox(region, MOUTH_ZONE)) return 'mouth zone';
    return null;
  }

  /** Ids of every look (and phase) in which `check` finds trouble; expected empty. */
  function failures(check: (look: AxolotlArtLook) => string[]): string[] {
    return EVERY_BODY_LOOK.flatMap((look) => check(look).map((why) => `${lookId(look)}: ${why}`));
  }

  it('keeps the Head, Neck and Face items off the eyes, the gill roots and the mouth zone', () => {
    for (const slot of ['head', 'neck', 'face'] as const) {
      const paints = bodyPaints(slot, DEFAULT_ART_LOOK);
      expect(paints.length).toBeGreaterThan(0);
      for (const paint of paints) {
        // The glasses band reaches into the lash reach circles and the mouth zone box on purpose: the eyes
        // paint above it, and its gap to the mouth ink is measured in drawAxolotlParts.test.ts.
        const found = trouble(paint, { lashes: slot !== 'face', gills: true, mouth: slot !== 'face' });
        expect(found, `${slot} ${paint.kind} ${paint.style}`).toBeNull();
      }
    }
  });

  it('keeps the Shirt, Back and Tail items off the eyes, lashes, gill roots and mouth zone on every look', () => {
    expect(
      failures((look) =>
        BODY_SLOTS.filter((slot) => slot === 'shirt' || slot === 'back').flatMap((slot) =>
          bodyPaints(slot, look).flatMap((p) => {
            const why = trouble(p, { lashes: true, gills: true, mouth: true });
            return why ? [`${slot} ${why}`] : [];
          }),
        ),
      ),
    ).toEqual([]);
    expect(
      failures((look) =>
        SWIMS.flatMap((swim) =>
          AMPS.flatMap((amp) =>
            bodyPaints('tail', look, swim, amp).flatMap((p) => {
              const why = trouble(p, { lashes: true, gills: true, mouth: true });
              return why ? [`tail swim ${swim.toFixed(2)} amp ${amp} ${why}`] : [];
            }),
          ),
        ),
      ),
    ).toEqual([]);
  });

  it('keeps the Socks and Feet items off the eyes and lashes on every look and swim phase; they stay behind the silhouette', () => {
    expect(
      failures((look) =>
        SWIMS.flatMap((swim) =>
          legSlotFrames(look, swim).flatMap((frame) =>
            legPaints({ socks: 'stripy-socks', feet: 'flippers' }, frame).flatMap((p) => {
              // The sleeve starts inside the torso, where the gill roots are; it is behind the silhouette (layer
              // 2.5 or 3.5, under 4), so only its eye and lash clearance is geometric. The pad and Shoe are clear of
              // the gill-root zone too. The mouth zone is the head's, which paints over every leg.
              const why = trouble(p, { lashes: true, gills: !isSleevePaint(p), mouth: false });
              return why ? [`leg ${frame.index} swim ${swim.toFixed(2)} ${why}`] : [];
            }),
          ),
        ),
      ),
    ).toEqual([]);
  });

  it('keeps every Wearable of a full drawAxolotl run off the eyes and, once past the silhouette, the gill roots, at every size and look', () => {
    const looks = AXO_SIZES.flatMap((size): AxolotlArtLook[] => [
      { ...DEFAULT_ART_LOOK, size },
      { ...GIRL, size, body: 'chubby', age: 'baby', tail: 'short' },
      { ...GIRL, size, body: 'slim', age: 'grownUp', tail: 'long' },
    ]);
    for (const pose of Object.values(POSES)) {
      for (const look of looks) {
        const base = drawn(pose, look);
        const worn = drawn(pose, look, FULL);
        const silhouette = worn.findIndex((p) => p.kind === 'stroke' && p.lineWidth === 2 * LW && p.style === INK);
        const inserted = insertedPaints(base, worn)!;
        expect(inserted.length).toBeGreaterThan(0);
        for (const { index, paint } of inserted) {
          const why = trouble(paint, { lashes: false, gills: index > silhouette, mouth: false });
          expect(why, `${lookId(look)} paint ${index} ${paint.kind} ${paint.style}`).toBeNull();
        }
      }
    }
  });

  it('paints only the clear lens tint over the eye zones, and the tint is under the band, the gem and the eyes', () => {
    const paints = bodyPaints('face', GIRL);
    const lens = paints.filter((p) => p.style === GLASSES_LENS);
    expect(lens).toHaveLength(1);
    expect(lens[0].kind).toBe('fill');
    // The lens is a tint: white at 0.25, never opaque and never dark.
    expect(GLASSES_LENS).toBe('rgba(255,255,255,0.25)');
    // It covers both beads, so it is the one paint over the eye zones.
    for (const zone of eyeZones) expect(reachesCircle(regionOf(lens[0]), zone)).toBe(true);
    for (const p of paints.filter((q) => q !== lens[0])) {
      for (const zone of eyeZones) expect(reachesCircle(regionOf(p), zone), `${p.kind} ${p.style}`).toBe(false);
    }
    expect(paints.indexOf(lens[0])).toBe(0);
  });
});

describe('footprints (guide 6i), ink included, and the frame (guide 11)', { timeout: ENUMERATION_TIMEOUT_MS }, () => {
  it('keeps the Sun hat on the head top: x 16 to 36, lowest ink y -19.5, top no higher than y -46', () => {
    const box = inkBounds(bodyPaints('head', DEFAULT_ART_LOOK));
    expect(isInside(box, HEAD_FOOTPRINT)).toBe(true);
    expect(box.maxY).toBeLessThanOrEqual(-19.5 + TOL);
    expect(box.minY).toBeGreaterThanOrEqual(-46 - TOL);
    // It rests on the head: its brim reaches the head outline.
    expect(box.maxY).toBeGreaterThan(HEAD_ELLIPSE.cy - HEAD_ELLIPSE.ry - 5);
  });

  it('keeps the Shell necklace at the throat: x 13 to 22, y 11 to 21', () => {
    expect(isInside(inkBounds(bodyPaints('neck', DEFAULT_ART_LOOK)), NECK_FOOTPRINT)).toBe(true);
  });

  it('keeps the Heart glasses in the Face footprint, x 14 to 54, y -18 to 6, the band at x 16.3 to 52.6', () => {
    const paints = bodyPaints('face', DEFAULT_ART_LOOK);
    expect(isInside(inkBounds(paints), { minX: 14, minY: -18, maxX: 54, maxY: 6 })).toBe(true);
    const band = paints.filter((p) => p.kind === 'stroke' && p.lineWidth === 3.5);
    expect(band).toHaveLength(1);
    expect(isInside(inkBounds(band), GLASSES_EXTENT, 0.01)).toBe(true);
    const box = inkBounds(band);
    expect(box.minX).toBeCloseTo(16.3, 1);
    expect(box.maxX).toBeCloseTo(52.6, 1);
    expect(box.minY).toBeCloseTo(-17.7, 1);
    expect(box.maxY).toBeCloseTo(5.7, 1);
  });

  it('draws the glasses as one merged outline with no inner seam: one closed subpath, no point inside either lens', () => {
    const band = bodyPaints('face', DEFAULT_ART_LOOK).filter((p) => p.kind === 'stroke' && p.lineWidth === 3.5)[0];
    expect(band.subs).toHaveLength(1);
    expect(band.subs[0].closed).toBe(true);
    const [near, far] = [
      { x: 28, y: -6, r: 9.95 },
      { x: 42, y: -7, r: 8.85 },
    ];
    for (const p of band.subs[0].pts) {
      // Each point is on one lens circle and not inside the other.
      const dNear = Math.hypot(p.x - near.x, p.y - near.y);
      const dFar = Math.hypot(p.x - far.x, p.y - far.y);
      const onNear = Math.abs(dNear - near.r) < 1e-6 && dFar >= far.r - 1e-6;
      const onFar = Math.abs(dFar - far.r) < 1e-6 && dNear >= near.r - 1e-6;
      expect(onNear || onFar).toBe(true);
    }
  });

  it('keeps the Shirt inside the torso edge band, behind the front line, cut at the tail root, on every look', () => {
    const bad: string[] = [];
    for (const look of EVERY_BODY_LOOK) {
      const shirt = shirtGeometry(look);
      const e: BodyEllipse = shirt.inset;
      const boundary = Array.from({ length: 720 }, (_, k) => ({
        x: e.cx + Math.cos((k / 720) * TAU) * e.rx,
        y: e.cy + Math.sin((k / 720) * TAU) * e.ry,
      }));
      const paints = bodyPaints('shirt', look);
      expect(paints.length).toBeGreaterThan(0);
      for (const { p, hw } of inkPoints(paints)) {
        const inside = ((p.x - e.cx) / e.rx) ** 2 + ((p.y - e.cy) / e.ry) ** 2 <= 1 + 1e-9;
        const gap = Math.min(...boundary.map((q) => Math.hypot(p.x - q.x, p.y - q.y)));
        if (!inside || gap < hw - TOL) bad.push(`${lookId(look)} edge band`);
        if (p.x + hw > SHIRT_FRONT_X + TOL) bad.push(`${lookId(look)} front`);
        if (p.x + hw > SHIRT_BACK_FRONT_LINE_X) bad.push(`${lookId(look)} front line`);
        if (p.x - hw < shirt.rearX - TOL) bad.push(`${lookId(look)} rear`);
      }
    }
    expect([...new Set(bad)]).toEqual([]);
  });

  it('paints the Shirt as the whole footprint: one silhouette from the tail root to the front edge, neckline bowing back to x -10.5', () => {
    for (const look of EVERY_BODY_LOOK) {
      const shirt = shirtGeometry(look);
      const paints = bodyPaints('shirt', look);
      const fills = paints.filter((p) => p.kind === 'fill' && p.style === TANK_TOP_FILL);
      expect(fills).toHaveLength(1);
      expect(paints.filter((p) => p.kind === 'stroke' && p.lineWidth === 2.8 && p.style === INK)).toHaveLength(1);
      const pts = fills[0].subs[0].pts;
      // The path sits half the 2.8 ink inside the footprint's rear and front edges.
      expect(Math.min(...pts.map((p) => p.x))).toBeCloseTo(shirt.rearX + 1.4, 3);
      expect(Math.max(...pts.map((p) => p.x))).toBeCloseTo(SHIRT_FRONT_X - 1.4, 3);
      // The neckline is the last 24 points (the curve back to the start): its apex is 3 units behind the front edge.
      const neckline = pts.slice(-24);
      expect(Math.min(...neckline.map((p) => p.x))).toBeCloseTo(shirt.neckline.apexX - 1.4, 6);
      expect(shirt.neckline.apexX).toBeCloseTo(-10.5, 9);
    }
  });

  it('keeps the Back item in the back frame, x\' -9 to 9, y\' -8 to 5, with its forward corner at x -6.8 or less', () => {
    const bad: string[] = [];
    for (const look of EVERY_BODY_LOOK) {
      const frame = backFrame(axolotlBodyGeometry(look).torso);
      const paints = bodyPaints('back', look);
      expect(paints.length).toBeGreaterThan(0);
      for (const { p, hw } of inkPoints(paints)) {
        const q = toFrame(frame, p);
        if (q.x - hw < BACK_FRAME_BOX.minU - TOL || q.x + hw > BACK_FRAME_BOX.maxU + TOL) bad.push(`${lookId(look)} u`);
        if (q.y - hw < BACK_FRAME_BOX.minV - TOL || q.y + hw > BACK_FRAME_BOX.maxV + TOL) bad.push(`${lookId(look)} v`);
        if (p.x + hw > SHIRT_BACK_FRONT_LINE_X + 0.005) bad.push(`${lookId(look)} front line`);
      }
    }
    expect([...new Set(bad)]).toEqual([]);
  });

  it('keeps the Golden bow within 9 units of its anchor, ink included, at every look, swim phase and tail amplitude', () => {
    expect(TAIL_SLOT_REACH).toBe(9);
    const bad: string[] = [];
    for (const look of EVERY_BODY_LOOK) {
      const tail = axolotlBodyGeometry(look).tail;
      for (const swim of SWIMS) {
        for (const amp of AMPS) {
          const frame = tailSlotFrame(tail, swim, amp);
          for (const { p, hw } of inkPoints(bodyPaints('tail', look, swim, amp))) {
            if (Math.hypot(p.x - frame.x, p.y - frame.y) + hw > TAIL_SLOT_REACH + TOL) bad.push(lookId(look));
          }
        }
      }
    }
    expect([...new Set(bad)]).toEqual([]);
  });

  it('turns the Golden bow with the local tail direction: its knot sits on the anchor line, rotated by the frame', () => {
    const look = DEFAULT_ART_LOOK;
    const tail = axolotlBodyGeometry(look).tail;
    for (const swim of SWIMS) {
      const frame = tailSlotFrame(tail, swim, 1.6);
      const gem = bodyPaints('tail', look, swim, 1.6).find((p) => p.kind === 'fill' && p.style === BOW_GEM)!;
      const box = inkBounds([gem]);
      const q = toFrame(frame, { x: (box.minX + box.maxX) / 2, y: (box.minY + box.maxY) / 2 });
      // The knot is on the frame's y' axis (u 0), a little into the tail core.
      expect(q.x).toBeCloseTo(0, 6);
      expect(q.y).toBeGreaterThan(0);
      expect(q.y).toBeLessThan(2);
    }
  });

  it('keeps the Sock sleeve, pad and Feet item in leg space: sleeve about the leg, pad and Flippers inside their rectangles', () => {
    const bad: string[] = [];
    for (const look of EVERY_BODY_LOOK) {
      for (const swim of SWIMS.filter((_, i) => i % 3 === 0)) {
        for (const frame of legSlotFrames(look, swim)) {
          const pad = sockFootPad(frame);
          const env = feetEnvelope(frame);
          for (const p of legPaints({ socks: 'stripy-socks' }, frame)) {
            for (const { p: pt, hw } of inkPoints([p])) {
              const q = toFrame(frame, pt);
              const onSleeve = isSleevePaint(p);
              if (onSleeve) {
                // Within the sleeve's ink radius (7.6) of the leg axis (u 0 to l), round ends. Its colour stroke
                // carries its own half width, so a stroke's points are measured with it.
                const d = segDist(q.x, q.y, { x: 0, y: 0 }, { x: frame.length, y: 0 });
                if (d + hw > SLEEVE_INK_W / 2 + TOL) bad.push(`${lookId(look)} sleeve`);
              } else if (
                q.x - hw < pad.u0 - TOL ||
                q.x + hw > pad.u1 + TOL ||
                Math.abs(q.y) + hw > pad.vHalf + TOL
              ) {
                bad.push(`${lookId(look)} pad`);
              }
            }
          }
          for (const p of legPaints({ feet: 'flippers' }, frame)) {
            for (const { p: pt, hw } of inkPoints([p])) {
              const q = toFrame(frame, pt);
              if (q.x - hw < env.u0 - TOL || q.x + hw > env.u1 + TOL || Math.abs(q.y) + hw > env.vHalf + TOL) {
                bad.push(`${lookId(look)} flippers`);
              }
            }
          }
        }
      }
    }
    expect([...new Set(bad)]).toEqual([]);
  });

  it('covers the Sock pad with the Flippers at the sides and front, so the Sock shows above them at the back', () => {
    for (const look of [DEFAULT_ART_LOOK, { ...DEFAULT_ART_LOOK, age: 'baby' as const }, { ...DEFAULT_ART_LOOK, age: 'grownUp' as const }]) {
      for (const frame of legSlotFrames(look, 0.9)) {
        const pad = sockFootPad(frame);
        // The Flippers' fill, in leg space.
        const fan = legPaints({ feet: 'flippers' }, frame).find((p) => p.kind === 'fill' && p.style.startsWith('#') && p.clips.length === 0)!;
        const fanLeg: SubPath[] = fan.subs.map((sub) => ({ closed: true, pts: sub.pts.map((q) => toFrame(frame, q)) }));
        // The pad's ink-included outline: straight sides and four corner arcs of the pad's radius.
        const r = pad.radius;
        const corners: [number, number, number][] = [
          [pad.u1 - r, -(pad.vHalf - r), -Math.PI / 2],
          [pad.u1 - r, pad.vHalf - r, 0],
          [pad.u0 + r, pad.vHalf - r, Math.PI / 2],
          [pad.u0 + r, -(pad.vHalf - r), Math.PI],
        ];
        const outline: Pt[] = corners.flatMap(([cu, cv, a0]) =>
          Array.from({ length: 13 }, (_, k) => ({ x: cu + r * Math.cos(a0 + (k / 12) * (Math.PI / 2)), y: cv + r * Math.sin(a0 + (k / 12) * (Math.PI / 2)) })),
        );
        let uncovered = 0;
        for (const q of outline) {
          const inside = winding(fanLeg, q.x, q.y) !== 0;
          const nearInk =
            Math.min(...edgesOf({ subs: fanLeg, kind: 'fill', hw: 0 }).map(([a, b]) => segDist(q.x, q.y, a, b))) <= 1.4 + TOL;
          if (!inside && !nearInk) uncovered++;
        }
        expect(uncovered, `leg ${frame.index} ${look.age}`).toBe(0);
        // At the back the pad starts as far back as the Flippers' ink: the Sock's sleeve shows above them.
        const backOfFan = Math.min(...fanLeg[0].pts.map((q) => q.x)) - 1.4;
        expect(backOfFan).toBeCloseTo(pad.u0, 3);
      }
    }
  });

  it('keeps every Wearable, ink included, in the texture frame with 4 or more units of padding', () => {
    const inner = frameInner(FRAME_PAD);
    const bad: string[] = [];
    for (const look of EVERY_BODY_LOOK) {
      const check = (what: string, paints: Paint[]): void => {
        if (!isInside(inkBounds(paints), inner, 1e-6)) bad.push(`${lookId(look)} ${what}`);
      };
      for (const slot of ['head', 'neck', 'face', 'shirt', 'back'] as const) check(slot, bodyPaints(slot, look));
      for (const swim of SWIMS) {
        for (const amp of AMPS) check('tail', bodyPaints('tail', look, swim, amp));
        for (const frame of legSlotFrames(look, swim)) check('legs', legPaints({ socks: 'stripy-socks', feet: 'flippers' }, frame));
      }
    }
    expect([...new Set(bad)]).toEqual([]);
    // The frame did not need to grow: guide 11 gives 166 x 142.
    expect([AXO_TEX.w, AXO_TEX.h]).toEqual([166, 142]);
  });
});

// ---------------------------------------------------------------------------
// The rarity look ladder (guide 6i, PRD F9)
// ---------------------------------------------------------------------------

describe('rarity look ladder: worn looks keep their counted details', () => {
  const colours = (paints: readonly Paint[], kind: 'fill' | 'stroke'): string[] =>
    paints.filter((p) => p.kind === kind && p.alpha === 1).map((p) => p.style);
  const count = (list: readonly string[], value: string): number => list.filter((v) => v === value).length;
  const nearLeg = legSlotFrames(GIRL, 0)[2];

  it('paints Common as one flat colour plus one shine: Sun hat, Tank top, Stripy socks', () => {
    const hat = bodyPaints('head', GIRL);
    expect(new Set(colours(hat, 'fill'))).toEqual(new Set([HAT_FILL, TREASURE_SHINE]));
    expect(count(colours(hat, 'fill'), TREASURE_SHINE)).toBe(1);
    const top = bodyPaints('shirt', GIRL);
    expect(new Set(colours(top, 'fill'))).toEqual(new Set([TANK_TOP_FILL, TREASURE_SHINE]));
    expect(count(colours(top, 'fill'), TREASURE_SHINE)).toBe(1);
    const socks = legPaints({ socks: 'stripy-socks' }, nearLeg);
    // The three stripes are ink at alpha 0.30: the same colour darkened, not a second colour.
    const stripes = socks.filter((p) => p.kind === 'fill' && p.alpha === SOCK_STRIPE_ALPHA);
    expect(stripes).toHaveLength(3);
    expect(stripes.every((p) => p.style === INK)).toBe(true);
    expect(new Set(colours(socks, 'fill'))).toEqual(new Set([SOCK_FILL, TREASURE_SHINE]));
    expect(new Set(colours(socks, 'stroke'))).toEqual(new Set([INK, SOCK_FILL]));
    expect(count(colours(socks, 'fill'), TREASURE_SHINE)).toBe(1);
  });

  it('adds one trim band in a second colour for Rare: Shell necklace cord, Diving tank strap, Flippers cuff', () => {
    const necklace = bodyPaints('neck', GIRL);
    expect(colours(necklace, 'stroke')).toContain(NECKLACE_CORD);
    expect(colours(necklace, 'fill')).toContain(NECKLACE_SHELL);
    // Three scallop shells, three ridges each.
    expect(count(colours(necklace, 'fill'), NECKLACE_SHELL)).toBe(3);
    const tank = bodyPaints('back', GIRL);
    expect(count(colours(tank, 'fill'), DIVING_TANK_STRAP)).toBe(1);
    expect(colours(tank, 'fill')).toContain(DIVING_TANK_FILL);
    expect(count(colours(tank, 'fill'), TREASURE_SHINE)).toBe(1);
    const flippers = legPaints({ feet: 'flippers' }, nearLeg);
    expect(count(colours(flippers, 'fill'), FLIPPER_CUFF)).toBe(1);
    expect(colours(flippers, 'fill')).toContain(FLIPPER_FILL);
    expect(colours(flippers, 'stroke')).toContain(FLIPPER_RIDGE);
    expect(count(colours(flippers, 'fill'), TREASURE_SHINE)).toBe(1);
  });

  it('adds one rounded gem for Epic: Heart glasses, a #55e4d8 gem of radius 2.5 and a clear or white-tint lens', () => {
    const glasses = bodyPaints('face', GIRL);
    const gems = glasses.filter((p) => p.kind === 'fill' && p.style === GLASSES_GEM);
    expect(gems).toHaveLength(1);
    const box = inkBounds([gems[0]]);
    expect((box.maxX - box.minX) / 2).toBeCloseTo(2.5, 1);
    expect(colours(glasses, 'stroke')).toContain(GLASSES_FRAME);
    expect(glasses.filter((p) => p.style === GLASSES_LENS)).toHaveLength(1);
  });

  it('adds gold trim, one gem and one static 4-point star for Legendary: Golden bow', () => {
    const bow = bodyPaints('tail', GIRL);
    expect(colours(bow, 'fill')).toContain(GOLD_TRIM);
    expect(bow.filter((p) => p.kind === 'fill' && p.style === BOW_GEM)).toHaveLength(1);
    // The star: a white fill of one 8-vertex polygon (four points, outer R 3, inner 0.38 R).
    const stars = bow.filter((p) => p.kind === 'fill' && p.style === WHITE && p.subs.length === 1 && p.subs[0].pts.length === 8);
    expect(stars).toHaveLength(1);
    const star = stars[0].subs[0].pts;
    const cx = star.reduce((n, p) => n + p.x, 0) / 8;
    const cy = star.reduce((n, p) => n + p.y, 0) / 8;
    const radii = star.map((p) => Math.hypot(p.x - cx, p.y - cy));
    expect(Math.max(...radii)).toBeCloseTo(3, 6);
    expect(Math.min(...radii)).toBeCloseTo(3 * 0.38, 6);
    // The star is outside the bow's fill: the pieces are filled before it, and it is above the knot.
    expect(cy).toBeLessThan(Math.min(...bow.find((p) => p.style === BOW_GEM)!.subs[0].pts.map((p) => p.y)));
  });
});

// ---------------------------------------------------------------------------
// Textures: the outfit rides the still bake
// ---------------------------------------------------------------------------

describe('bakeAxolotlStill carries the outfit', () => {
  interface FakeCanvas {
    key: string;
    rec: Recorder;
  }

  function fakeScene(): { scene: never; canvases: FakeCanvas[] } {
    const canvases: FakeCanvas[] = [];
    const textures = {
      exists: (key: string): boolean => canvases.some((c) => c.key === key),
      remove: (): void => undefined,
      createCanvas: (key: string) => {
        const entry: FakeCanvas = { key, rec: new Recorder() };
        canvases.push(entry);
        return {
          context: entry.rec.context(),
          refresh: (): void => undefined,
        };
      },
    };
    return { scene: { textures } as never, canvases };
  }

  /** Paints the texture made since `from`, with Path2D stubbed. */
  function withPaths<T>(fn: () => T): T {
    vi.stubGlobal('Path2D', RecPath);
    try {
      return fn();
    } finally {
      vi.unstubAllGlobals();
    }
  }

  const POSE = POSES.swimming;

  it('bakes a still with the outfit when it has one, and with none otherwise', () => {
    const crop = { minX: -102, minY: -79, maxX: 64, maxY: 63 };
    const still = { look: GIRL, palette: LEUCISTIC, pose: POSE, crop, scale: 2, sizeFactor: 1 };
    const none = fakeScene();
    withPaths(() => bakeAxolotlStill(none.scene, 'still-none', still));
    const worn = fakeScene();
    withPaths(() => bakeAxolotlStill(worn.scene, 'still-worn', { ...still, outfit: FULL }));
    expect(none.canvases[0].rec.paints.length).toBe(drawn(POSE, GIRL, NO_OUTFIT).length);
    expect(worn.canvases[0].rec.paints.length).toBe(drawn(POSE, GIRL, FULL).length);
    expect(worn.canvases[0].rec.paints.length).toBeGreaterThan(none.canvases[0].rec.paints.length);
  });
});
