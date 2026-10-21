/**
 * Developer-only query flags. They work only in dev builds; the caller passes whether this is one, so
 * this module never reads build-time constants.
 */

/** Renderer request: 'auto' lets Phaser choose, 'canvas' forces the Canvas renderer. */
export type DevRenderer = 'auto' | 'canvas';

export interface DevFlags {
  readonly perf: boolean;
  readonly compare: boolean;
  readonly renderer: DevRenderer;
  /** Id of a dev-and-test area to load (for example `dev-test-area`), or null. The caller ignores unknown ids. */
  readonly area: string | null;
}

/** Every flag off, the renderer left to Phaser, and no area requested. */
export const NO_DEV_FLAGS: DevFlags = Object.freeze({ perf: false, compare: false, renderer: 'auto', area: null });

/** Marker that tags dev-flag output. */
export const DEV_FLAGS_MARK = 'glam-gills-dev-flags';

const OFF_VALUES: readonly string[] = ['0', 'false'];

/** True when `name` is in `params` and its value is not '0' or 'false' (any case). */
function isFlagOn(params: URLSearchParams, name: string): boolean {
  const value = params.get(name);
  if (value === null) return false;
  return !OFF_VALUES.includes(value.toLowerCase());
}

/**
 * Reads dev flags from `query` (a `location.search` string, with or without the leading '?').
 * Returns NO_DEV_FLAGS when `dev` is false. `perf` and `compare` are on when present, unless set to
 * '0' or 'false'. `renderer` is 'canvas' only for `renderer=canvas` (any case), otherwise 'auto'.
 * `area` is the trimmed value of `area=<id>` (for example `area=dev-test-area`), or null when absent
 * or blank; the caller ignores ids it does not know.
 * When a flag repeats, its first value counts.
 */
export function parseDevFlags(query: string, dev: boolean): DevFlags {
  if (!dev) return NO_DEV_FLAGS;
  const params = new URLSearchParams(query);
  const renderer: DevRenderer = params.get('renderer')?.toLowerCase() === 'canvas' ? 'canvas' : 'auto';
  const area = params.get('area')?.trim() || null;
  return { perf: isFlagOn(params, 'perf'), compare: isFlagOn(params, 'compare'), renderer, area };
}
