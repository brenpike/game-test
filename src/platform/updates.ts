/**
 * Browser glue for the first-party update check (ADR 0009).
 * Same-origin GET of `version.json` only; never touches storage or service workers.
 */
import {
  MANIFEST_REQUEST_POLICY,
  MAX_BUILD_MANIFEST_BYTES,
  UPDATE_CHECK_TIMEOUT_MS,
  attemptedBuildIdFrom,
  formatVersionLabel,
  isAcceptedManifestResponse,
  manifestRequestUrl,
  parseBuildManifestText,
  reloadUrl,
  type BuildManifest,
} from '../logic/updateCheck';
import {
  createUpdateSchedulerState,
  stepUpdateScheduler,
  type UpdateSchedulerAction,
  type UpdateSchedulerEvent,
  type UpdateSchedulerState,
} from '../logic/updateScheduler';

/** App version from package.json, injected at build time. */
export const APP_VERSION: string = __APP_VERSION__;

/** Build id of the running game, injected at build time. */
export const BUILD_ID: string = __BUILD_ID__;

interface UpdateWatch {
  readonly onReady: (manifest: BuildManifest) => void;
  state: UpdateSchedulerState;
  controller: AbortController | null;
  timeoutId: number | null;
}

/** Small version label for the title screen, e.g. `v0.4.0 (a1b2c3d)`. */
export function versionLabel(): string {
  return formatVersionLabel(APP_VERSION, BUILD_ID);
}

/** Random cache-busting value; carries no player data. */
function createNonce(): string {
  return Math.random().toString(36).slice(2);
}

/**
 * Reads the body as strict UTF-8, stopping and cancelling the stream once it passes `maxBytes`.
 * Null when there is no body or it is too large; rejects on a read or decode error.
 */
async function readBoundedText(response: Response, maxBytes: number): Promise<string | null> {
  if (response.body === null) return null;
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > maxBytes) {
      await reader.cancel().catch(() => undefined);
      return null;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}

/**
 * Fetches and validates the remote manifest with `MANIFEST_REQUEST_POLICY` only.
 * Null on offline, timeout, a redirect, a cross-origin URL, or a bad response (silent by design, ADR 0009).
 */
async function fetchRemoteManifest(signal: AbortSignal): Promise<BuildManifest | null> {
  try {
    const requestUrl = manifestRequestUrl(window.location.href, import.meta.env.BASE_URL, createNonce());
    if (requestUrl === null) return null;
    const response = await fetch(requestUrl, { ...MANIFEST_REQUEST_POLICY, signal });
    if (!isAcceptedManifestResponse(response, requestUrl)) return null;
    const text = await readBoundedText(response, MAX_BUILD_MANIFEST_BYTES);
    return text === null ? null : parseBuildManifestText(text);
  } catch {
    return null;
  }
}

function clearCheckTimeout(watch: UpdateWatch): void {
  if (watch.timeoutId === null) return;
  window.clearTimeout(watch.timeoutId);
  watch.timeoutId = null;
}

/** Steps the scheduler, stores the new state, then runs the action it asked for. */
function dispatch(watch: UpdateWatch, event: UpdateSchedulerEvent): void {
  const step = stepUpdateScheduler(watch.state, event);
  watch.state = step.state;
  runAction(watch, step.action);
}

function runAction(watch: UpdateWatch, action: UpdateSchedulerAction): void {
  switch (action.kind) {
    case 'none':
      return;
    case 'start':
      startCheck(watch);
      return;
    case 'notify':
      notifyReady(watch, action.manifest);
      return;
  }
}

/** Starts one fetch with a timeout. Any failure stays silent (ADR 0009) and never becomes an unhandled rejection. */
function startCheck(watch: UpdateWatch): void {
  const controller = new AbortController();
  watch.controller = controller;
  watch.timeoutId = window.setTimeout(() => controller.abort(), UPDATE_CHECK_TIMEOUT_MS);
  void fetchRemoteManifest(controller.signal)
    .then((remote) => settleCheck(watch, remote))
    .catch(() => undefined);
}

/** Clears the finished check's timer and controller before reporting it, so a follow-up check starts clean. */
function settleCheck(watch: UpdateWatch, remote: BuildManifest | null): void {
  clearCheckTimeout(watch);
  watch.controller = null;
  dispatch(watch, { kind: 'settled', nowMs: performance.now(), remote });
}

/**
 * Calls `onReady`; the build counts as reported only after it returns.
 * A throwing `onReady` stays silent (ADR 0009) and is offered again after the next successful check.
 */
function notifyReady(watch: UpdateWatch, manifest: BuildManifest): void {
  try {
    watch.onReady(manifest);
  } catch {
    return;
  }
  dispatch(watch, { kind: 'notified', buildId: manifest.buildId });
}

function wake(watch: UpdateWatch): void {
  dispatch(watch, { kind: 'wake', nowMs: performance.now() });
}

/** Ends a watch: disposes the scheduler, removes listeners, clears the timeout, and aborts any in-flight check. */
function stopWatch(watch: UpdateWatch, handleVisibilityChange: () => void, handleWake: () => void): void {
  dispatch(watch, { kind: 'dispose' });
  document.removeEventListener('visibilitychange', handleVisibilityChange);
  window.removeEventListener('online', handleWake);
  window.removeEventListener('pageshow', handleWake);
  clearCheckTimeout(watch);
  watch.controller?.abort();
  watch.controller = null;
}

/**
 * Checks now, then on visibilitychange (when visible), online, and pageshow, as the scheduler allows:
 * one check at a time, at least 60 s after the start of the last check that got a usable `version.json`,
 * and at most one follow-up for wake events that arrive during a check that then fails.
 * Calls `onReady` once per newer build. Makes no request outside production builds.
 * Returns a disposer that removes listeners, aborts any in-flight check, and clears timers.
 */
export function watchForUpdates(onReady: (manifest: BuildManifest) => void): () => void {
  if (!import.meta.env.PROD) return () => undefined;
  const watch: UpdateWatch = {
    onReady,
    state: createUpdateSchedulerState(BUILD_ID, attemptedBuildIdFrom(window.location.href)),
    controller: null,
    timeoutId: null,
  };
  const handleVisibilityChange = (): void => {
    if (document.visibilityState === 'visible') wake(watch);
  };
  const handleWake = (): void => wake(watch);
  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('online', handleWake);
  window.addEventListener('pageshow', handleWake);
  wake(watch);
  return () => stopWatch(watch, handleVisibilityChange, handleWake);
}

/** Reloads into the new build via `?v=<buildId>`, bypassing the cached index.html. Saved progress is untouched. */
export function applyUpdate(manifest: BuildManifest): void {
  window.location.replace(reloadUrl(window.location.href, manifest.buildId));
}
