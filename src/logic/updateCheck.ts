/** Build identity published next to the app as `version.json`. */
export interface BuildManifest {
  readonly version: string;
  readonly buildId: string;
}

export const BUILD_MANIFEST_FILE = 'version.json';
export const RELOAD_PARAM = 'v';
export const CACHE_BUST_PARAM = 't';
export const UPDATE_CHECK_MIN_INTERVAL_MS = 60_000;
export const UPDATE_CHECK_TIMEOUT_MS = 8_000;

export type UpdateDecision = { kind: 'none' } | { kind: 'prompt'; manifest: BuildManifest };

export interface UpdateDecisionInput {
  enabled: boolean;
  currentBuildId: string;
  remote: BuildManifest | null;
  attemptedBuildId: string | null;
}

const SHORT_BUILD_ID_LENGTH = 7;

function readTrimmedString(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

/** Validates untrusted manifest JSON; null when it is not a usable manifest. */
export function parseBuildManifest(data: unknown): BuildManifest | null {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) return null;
  const record = data as Record<string, unknown>;
  const version = readTrimmedString(record, 'version');
  const buildId = readTrimmedString(record, 'buildId');
  if (version === null || buildId === null) return null;
  return { version, buildId };
}

/**
 * Decides whether to offer a reload. Stays quiet when disabled, offline, already
 * current, or when a reload to this exact build was already attempted (stale cache guard).
 */
export function decideUpdate(input: UpdateDecisionInput): UpdateDecision {
  const { enabled, currentBuildId, remote, attemptedBuildId } = input;
  if (!enabled || remote === null) return { kind: 'none' };
  if (remote.buildId === currentBuildId) return { kind: 'none' };
  if (attemptedBuildId === remote.buildId) return { kind: 'none' };
  return { kind: 'prompt', manifest: remote };
}

/** Same-origin path to the manifest under the app base, with a cache-busting nonce. */
export function manifestUrl(baseUrl: string, nonce: string): string {
  const withLeading = baseUrl.startsWith('/') ? baseUrl : `/${baseUrl}`;
  const base = withLeading.endsWith('/') ? withLeading : `${withLeading}/`;
  return `${base}${BUILD_MANIFEST_FILE}?${CACHE_BUST_PARAM}=${encodeURIComponent(nonce)}`;
}

/** Path and query for reloading into a build; keeps other params, drops origin and hash. */
export function reloadUrl(href: string, buildId: string): string {
  const url = new URL(href);
  url.searchParams.set(RELOAD_PARAM, buildId);
  return `${url.pathname}${url.search}`;
}

/** Build id a previous reload targeted, read from the reload param; null when absent. */
export function attemptedBuildIdFrom(href: string): string | null {
  return new URL(href).searchParams.get(RELOAD_PARAM);
}

/** Throttle: check when never checked or at least `minIntervalMs` has passed. */
export function shouldCheck(
  nowMs: number,
  lastCheckMs: number | null,
  minIntervalMs: number = UPDATE_CHECK_MIN_INTERVAL_MS,
): boolean {
  return lastCheckMs === null || nowMs - lastCheckMs >= minIntervalMs;
}

/** Human-readable build label, e.g. `v0.4.0 (a1b2c3d)` or `v0.4.0 (dev)`. */
export function formatVersionLabel(version: string, buildId: string): string {
  return `v${version} (${buildId.slice(0, SHORT_BUILD_ID_LENGTH)})`;
}
