/**
 * Pure scheduler for the update check (ADR 0009): one check at a time, a 60 s wait anchored at
 * the start of the last check that got a usable manifest, and wake events during a check merged
 * into at most one follow-up, made only when that check fails.
 */
import { decideUpdate, shouldCheck, type BuildManifest } from './updateCheck';

export type UpdateSchedulerPhase = 'idle' | 'checking' | 'disposed';

export interface UpdateSchedulerState {
  readonly phase: UpdateSchedulerPhase;
  readonly checkStartMs: number | null;
  readonly lastSuccessStartMs: number | null;
  readonly pendingWake: boolean;
  readonly notifiedBuildIds: readonly string[];
  readonly currentBuildId: string;
  readonly attemptedBuildId: string | null;
}

export type UpdateSchedulerEvent =
  | { readonly kind: 'wake'; readonly nowMs: number }
  | { readonly kind: 'settled'; readonly nowMs: number; readonly remote: BuildManifest | null }
  | { readonly kind: 'notified'; readonly buildId: string }
  | { readonly kind: 'dispose' };

export type UpdateSchedulerAction =
  | { readonly kind: 'none' }
  | { readonly kind: 'start' }
  | { readonly kind: 'notify'; readonly manifest: BuildManifest };

export interface UpdateSchedulerStep {
  readonly state: UpdateSchedulerState;
  readonly action: UpdateSchedulerAction;
}

const NO_ACTION: UpdateSchedulerAction = { kind: 'none' };

/** Idle scheduler state for a running build and the build a previous reload targeted, if any. */
export function createUpdateSchedulerState(
  currentBuildId: string,
  attemptedBuildId: string | null,
): UpdateSchedulerState {
  return {
    phase: 'idle',
    checkStartMs: null,
    lastSuccessStartMs: null,
    pendingWake: false,
    notifiedBuildIds: [],
    currentBuildId,
    attemptedBuildId,
  };
}

/** Starts a check when the wait since the last successful check's start has passed. */
function wakeWhileIdle(state: UpdateSchedulerState, nowMs: number): UpdateSchedulerStep {
  if (!shouldCheck(nowMs, state.lastSuccessStartMs)) return { state, action: NO_ACTION };
  return {
    state: { ...state, phase: 'checking', checkStartMs: nowMs, pendingWake: false },
    action: { kind: 'start' },
  };
}

/** Anchors the wait at the finished check's start and offers a build not yet reported. */
function settleWithManifest(state: UpdateSchedulerState, remote: BuildManifest): UpdateSchedulerStep {
  const nextState: UpdateSchedulerState = {
    ...state,
    phase: 'idle',
    checkStartMs: null,
    lastSuccessStartMs: state.checkStartMs,
    pendingWake: false,
  };
  const decision = decideUpdate({
    enabled: true,
    currentBuildId: state.currentBuildId,
    remote,
    attemptedBuildId: state.attemptedBuildId,
  });
  if (decision.kind !== 'prompt') return { state: nextState, action: NO_ACTION };
  if (state.notifiedBuildIds.includes(decision.manifest.buildId)) return { state: nextState, action: NO_ACTION };
  return { state: nextState, action: { kind: 'notify', manifest: decision.manifest } };
}

/** Leaves the wait anchor alone and runs one follow-up check when a wake arrived during the failed one. */
function settleWithoutManifest(state: UpdateSchedulerState, nowMs: number): UpdateSchedulerStep {
  const nextState: UpdateSchedulerState = { ...state, phase: 'idle', checkStartMs: null, pendingWake: false };
  if (!state.pendingWake) return { state: nextState, action: NO_ACTION };
  return wakeWhileIdle(nextState, nowMs);
}

/** Records a build as reported so it is not offered again. */
function markNotified(state: UpdateSchedulerState, buildId: string): UpdateSchedulerStep {
  if (state.notifiedBuildIds.includes(buildId)) return { state, action: NO_ACTION };
  return { state: { ...state, notifiedBuildIds: [...state.notifiedBuildIds, buildId] }, action: NO_ACTION };
}

/** Applies one event to the scheduler. Total over every phase and event; never mutates its input. */
export function stepUpdateScheduler(state: UpdateSchedulerState, event: UpdateSchedulerEvent): UpdateSchedulerStep {
  if (state.phase === 'disposed') return { state, action: NO_ACTION };
  switch (event.kind) {
    case 'dispose':
      return { state: { ...state, phase: 'disposed' }, action: NO_ACTION };
    case 'notified':
      return markNotified(state, event.buildId);
    case 'wake':
      if (state.phase === 'checking') return { state: { ...state, pendingWake: true }, action: NO_ACTION };
      return wakeWhileIdle(state, event.nowMs);
    case 'settled':
      if (state.phase === 'idle') return { state, action: NO_ACTION };
      if (event.remote === null) return settleWithoutManifest(state, event.nowMs);
      return settleWithManifest(state, event.remote);
  }
}
