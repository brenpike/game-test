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
export const MAX_BUILD_MANIFEST_BYTES = 1024;

export type UpdateDecision = { kind: 'none' } | { kind: 'prompt'; manifest: BuildManifest };

export interface UpdateDecisionInput {
  enabled: boolean;
  currentBuildId: string;
  remote: BuildManifest | null;
  attemptedBuildId: string | null;
}

const SHORT_BUILD_ID_LENGTH = 7;

const BUILD_ID_PATTERN = /^[A-Za-z0-9._-]{1,64}$/;
const APP_VERSION_MAX_LENGTH = 32;
const APP_VERSION_PATTERN = /^[0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

/** True for a build id of 1 to 64 characters from `[A-Za-z0-9._-]`. */
export function isBuildId(value: unknown): value is string {
  return typeof value === 'string' && BUILD_ID_PATTERN.test(value);
}

/** True for a SemVer version string of at most 32 characters. */
export function isAppVersion(value: unknown): value is string {
  return typeof value === 'string' && value.length <= APP_VERSION_MAX_LENGTH && APP_VERSION_PATTERN.test(value);
}

/** Validates untrusted manifest JSON; null when it is not a usable manifest. Extra fields are ignored. */
export function parseBuildManifest(data: unknown): BuildManifest | null {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) return null;
  const record = data as Record<string, unknown>;
  const { version, buildId } = record;
  if (!isAppVersion(version) || !isBuildId(buildId)) return null;
  return { version, buildId };
}

/** Parses untrusted manifest text; null when it is too long, not JSON, or not a usable manifest. */
export function parseBuildManifestText(text: string): BuildManifest | null {
  if (text.length > MAX_BUILD_MANIFEST_BYTES) return null;
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return null;
  }
  return parseBuildManifest(data);
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

/** Options for the manifest request; the browser glue spreads these and must not add or override any. */
export interface ManifestRequestPolicy {
  readonly method: 'GET';
  readonly mode: 'same-origin';
  readonly redirect: 'error';
  readonly cache: 'no-store';
  readonly credentials: 'omit';
  readonly referrerPolicy: 'no-referrer';
}

/** The one declaration of the manifest request options (ADR 0009). */
export const MANIFEST_REQUEST_POLICY: ManifestRequestPolicy = Object.freeze({
  method: 'GET',
  mode: 'same-origin',
  redirect: 'error',
  cache: 'no-store',
  credentials: 'omit',
  referrerPolicy: 'no-referrer',
});

/** Fields of a manifest response that decide whether its body may be read. */
export interface ManifestResponseFacts {
  readonly ok: boolean;
  readonly redirected: boolean;
  readonly type: string;
  readonly url: string;
}

/**
 * Absolute manifest URL resolved against the page; null when the page or base does not parse,
 * or when the base or the resolved manifest URL leaves the page's origin.
 */
export function manifestRequestUrl(pageHref: string, baseUrl: string, nonce: string): string | null {
  try {
    const pageOrigin = new URL(pageHref).origin;
    if (new URL(baseUrl, pageHref).origin !== pageOrigin) return null;
    const resolved = new URL(manifestUrl(baseUrl, nonce), pageHref);
    return resolved.origin === pageOrigin ? resolved.href : null;
  } catch {
    return null;
  }
}

/**
 * True only for an ok, unredirected, same-origin (`basic`) response whose final URL has the
 * request's origin and path. The query may differ. A missing or unparseable URL is rejected.
 */
export function isAcceptedManifestResponse(response: ManifestResponseFacts, requestUrl: string): boolean {
  if (response.ok !== true || response.redirected !== false || response.type !== 'basic') return false;
  if (response.url === '') return false;
  try {
    const requested = new URL(requestUrl);
    const received = new URL(response.url);
    return received.origin === requested.origin && received.pathname === requested.pathname;
  } catch {
    return false;
  }
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
