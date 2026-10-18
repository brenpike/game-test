/** The part of `version.json` the update check trusts: only the build id. */
export interface BuildManifest {
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
// https://semver.org/#is-there-a-suggested-regular-expression-regex-to-check-a-semver-string
const APP_VERSION_PATTERN =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

/** True for a build id of 1 to 64 characters from `[A-Za-z0-9._-]`. */
export function isBuildId(value: unknown): value is string {
  return typeof value === 'string' && BUILD_ID_PATTERN.test(value);
}

/**
 * True for a SemVer 2.0.0 version string (semver.org grammar) of at most 32 characters.
 * A build-time check used by `vite.config.ts`; the runtime never validates a remote version.
 */
export function isAppVersion(value: unknown): value is string {
  return typeof value === 'string' && value.length <= APP_VERSION_MAX_LENGTH && APP_VERSION_PATTERN.test(value);
}

/**
 * Reads the trusted build id from untrusted manifest JSON; null when it is not a non-array object
 * with a valid `buildId`. Every other field, including `version`, is ignored and never trusted.
 */
export function parseBuildManifest(data: unknown): BuildManifest | null {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) return null;
  const { buildId } = data as Record<string, unknown>;
  if (!isBuildId(buildId)) return null;
  return { buildId };
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

/**
 * The one URL builder for the update check (ADR 0009). Reads only the origin of `pageHref`;
 * its path, query and hash are never kept. Returns `<origin><base>/<file>?<param>=<value>`
 * with no hash, or null when the page or base does not parse, the page has an opaque origin,
 * or the base leaves the page's origin.
 */
function appUrl(pageHref: string, baseUrl: string, file: string, param: string, value: string): string | null {
  try {
    const pageOrigin = new URL(pageHref).origin;
    if (pageOrigin === 'null') return null;
    const originRoot = `${pageOrigin}/`;
    const base = new URL(baseUrl, originRoot);
    if (base.origin !== pageOrigin) return null;
    const basePath = base.pathname.endsWith('/') ? base.pathname : `${base.pathname}/`;
    const url = new URL(originRoot);
    url.pathname = `${basePath}${file}`;
    url.searchParams.set(param, value);
    return url.href;
  } catch {
    return null;
  }
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
 * Absolute manifest URL `<page origin><base>version.json?t=<nonce>`; null when the page or base
 * does not parse, or the base leaves the page's origin.
 */
export function manifestRequestUrl(pageHref: string, baseUrl: string, nonce: string): string | null {
  return appUrl(pageHref, baseUrl, BUILD_MANIFEST_FILE, CACHE_BUST_PARAM, nonce);
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

/**
 * Absolute URL `<page origin><base>?v=<buildId>` for reloading into a build. Keeps no path,
 * query or hash from the current page. Null when the page or base does not parse, or the base
 * leaves the page's origin.
 */
export function reloadUrl(pageHref: string, baseUrl: string, buildId: string): string | null {
  return appUrl(pageHref, baseUrl, '', RELOAD_PARAM, buildId);
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
