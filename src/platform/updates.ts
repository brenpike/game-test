/**
 * Browser glue for the first-party update check (ADR 0009).
 * Same-origin GET of `version.json` only; never touches storage or service workers.
 */
import {
  UPDATE_CHECK_TIMEOUT_MS,
  attemptedBuildIdFrom,
  decideUpdate,
  formatVersionLabel,
  manifestUrl,
  parseBuildManifest,
  reloadUrl,
  shouldCheck,
  type BuildManifest,
} from '../logic/updateCheck';

/** App version from package.json, injected at build time. */
export const APP_VERSION: string = __APP_VERSION__;

/** Build id of the running game, injected at build time. */
export const BUILD_ID: string = __BUILD_ID__;

interface UpdateWatch {
  readonly onReady: (manifest: BuildManifest) => void;
  readonly notifiedBuildIds: Set<string>;
  lastCheckMs: number | null;
  inFlight: AbortController | null;
  timeoutId: number | null;
  disposed: boolean;
}

/** Small version label for the title screen, e.g. `v0.4.0 (a1b2c3d)`. */
export function versionLabel(): string {
  return formatVersionLabel(APP_VERSION, BUILD_ID);
}

/** Random cache-busting value; carries no player data. */
function createNonce(): string {
  return Math.random().toString(36).slice(2);
}

/** Fetches and validates the remote manifest; null on offline, timeout, or a bad response (silent by design, ADR 0009). */
async function fetchRemoteManifest(signal: AbortSignal): Promise<BuildManifest | null> {
  try {
    const response = await fetch(manifestUrl(import.meta.env.BASE_URL, createNonce()), {
      method: 'GET',
      cache: 'no-store',
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      signal,
    });
    if (!response.ok) return null;
    return parseBuildManifest(await response.json());
  } catch {
    return null;
  }
}

function clearCheckTimeout(watch: UpdateWatch): void {
  if (watch.timeoutId === null) return;
  window.clearTimeout(watch.timeoutId);
  watch.timeoutId = null;
}

/**
 * Runs one check and reports a new build at most once per build id.
 * A build counts as reported only after `onReady` returns, so a throwing `onReady` is retried on the next check.
 */
async function runCheck(watch: UpdateWatch): Promise<void> {
  const controller = new AbortController();
  watch.inFlight = controller;
  watch.timeoutId = window.setTimeout(() => controller.abort(), UPDATE_CHECK_TIMEOUT_MS);
  let remote: BuildManifest | null;
  try {
    remote = await fetchRemoteManifest(controller.signal);
  } finally {
    if (watch.inFlight === controller) {
      clearCheckTimeout(watch);
      watch.inFlight = null;
    }
  }
  if (watch.disposed) return;
  const decision = decideUpdate({
    enabled: true,
    currentBuildId: BUILD_ID,
    remote,
    attemptedBuildId: attemptedBuildIdFrom(window.location.href),
  });
  if (decision.kind !== 'prompt') return;
  const { manifest } = decision;
  if (watch.notifiedBuildIds.has(manifest.buildId)) return;
  watch.onReady(manifest);
  watch.notifiedBuildIds.add(manifest.buildId);
}

/** Starts a check unless disposed, one is in flight, or the 60 s throttle has not passed. */
function requestCheck(watch: UpdateWatch): void {
  if (watch.disposed || watch.inFlight !== null) return;
  const nowMs = performance.now();
  if (!shouldCheck(nowMs, watch.lastCheckMs)) return;
  watch.lastCheckMs = nowMs;
  // Any failure, including a throwing onReady, stays silent (ADR 0009) and never becomes an unhandled rejection.
  void runCheck(watch).catch(() => undefined);
}

/** Ends a watch: removes listeners, clears the timeout, and aborts any in-flight check. */
function stopWatch(watch: UpdateWatch, handleVisibilityChange: () => void, handleWake: () => void): void {
  watch.disposed = true;
  document.removeEventListener('visibilitychange', handleVisibilityChange);
  window.removeEventListener('online', handleWake);
  window.removeEventListener('pageshow', handleWake);
  clearCheckTimeout(watch);
  watch.inFlight?.abort();
  watch.inFlight = null;
}

/**
 * Checks now, then again on visibilitychange (when visible), online, and pageshow.
 * Calls `onReady` when a newer build is published. Makes no request outside production builds.
 * Returns a disposer that removes listeners, aborts any in-flight check, and clears timers.
 */
export function watchForUpdates(onReady: (manifest: BuildManifest) => void): () => void {
  if (!import.meta.env.PROD) return () => undefined;
  const watch: UpdateWatch = {
    onReady,
    notifiedBuildIds: new Set(),
    lastCheckMs: null,
    inFlight: null,
    timeoutId: null,
    disposed: false,
  };
  const handleVisibilityChange = (): void => {
    if (document.visibilityState === 'visible') requestCheck(watch);
  };
  const handleWake = (): void => requestCheck(watch);
  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('online', handleWake);
  window.addEventListener('pageshow', handleWake);
  requestCheck(watch);
  return () => stopWatch(watch, handleVisibilityChange, handleWake);
}

/** Reloads into the new build via `?v=<buildId>`, bypassing the cached index.html. Saved progress is untouched. */
export function applyUpdate(manifest: BuildManifest): void {
  window.location.replace(reloadUrl(window.location.href, manifest.buildId));
}
