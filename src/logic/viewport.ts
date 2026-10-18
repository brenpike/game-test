import type { ViewTuning } from './tuning';

/** Inputs for fitting the world into the browser viewport. */
export interface FitViewOptions extends ViewTuning {
  /** World height in px that must always fit vertically. */
  worldH: number;
}

/** Resolved canvas and camera sizing. */
export interface ViewFit {
  /** Device pixel ratio after capping. */
  dpr: number;
  /** Backing canvas width in device pixels. */
  canvasW: number;
  /** Backing canvas height in device pixels. */
  canvasH: number;
  /** World-to-CSS-pixel zoom. */
  fitZoom: number;
  /** World-to-device-pixel camera zoom (fitZoom * dpr). */
  zoom: number;
  /** Texture bake scale, zoom clamped to [1, bakeScaleMax]. */
  bakeScale: number;
}

/** Returns a positive finite value, or `fallback` for zero, negative, or NaN input. */
function positiveOr(value: number, fallback: number): number {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

/** Throws when a configuration value is not a positive finite number. */
function assertPositive(name: string, value: number): void {
  if (!(Number.isFinite(value) && value > 0)) {
    throw new RangeError(`fitView: ${name} must be a positive finite number, got ${value}`);
  }
}

/**
 * Fits the world into a CSS viewport: full world height always visible, and at
 * least minVisibleW world px across. Degenerate viewport sizes (zero/NaN) are
 * treated as 1 CSS px and a missing DPR as 1, so output is always positive and finite.
 */
export function fitView(cssW: number, cssH: number, rawDpr: number, options: FitViewOptions): ViewFit {
  assertPositive('worldH', options.worldH);
  assertPositive('minVisibleW', options.minVisibleW);
  assertPositive('dprCap', options.dprCap);
  assertPositive('bakeScaleMax', options.bakeScaleMax);

  const width = positiveOr(cssW, 1);
  const height = positiveOr(cssH, 1);
  const dpr = Math.min(positiveOr(rawDpr, 1), options.dprCap);
  const fitZoom = Math.min(height / options.worldH, width / options.minVisibleW);
  const zoom = fitZoom * dpr;

  return {
    dpr,
    canvasW: Math.max(1, Math.round(width * dpr)),
    canvasH: Math.max(1, Math.round(height * dpr)),
    fitZoom,
    zoom,
    bakeScale: Math.min(options.bakeScaleMax, Math.max(1, zoom)),
  };
}
