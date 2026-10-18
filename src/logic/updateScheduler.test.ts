import { describe, expect, it } from 'vitest';
import { UPDATE_CHECK_MIN_INTERVAL_MS, type BuildManifest } from './updateCheck';
import {
  createUpdateSchedulerState,
  stepUpdateScheduler,
  type UpdateSchedulerEvent,
  type UpdateSchedulerPhase,
  type UpdateSchedulerState,
  type UpdateSchedulerStep,
} from './updateScheduler';

const CURRENT = 'current-build';
const REMOTE: BuildManifest = { version: '0.5.0', buildId: 'remote-build' };
const NEWER: BuildManifest = { version: '0.6.0', buildId: 'newer-build' };

/** Applies events in order from a starting state and returns every step. */
function runEvents(start: UpdateSchedulerState, events: readonly UpdateSchedulerEvent[]): UpdateSchedulerStep[] {
  const steps: UpdateSchedulerStep[] = [];
  let state = start;
  for (const event of events) {
    const step = stepUpdateScheduler(state, event);
    steps.push(step);
    state = step.state;
  }
  return steps;
}

/** Returns the state after applying events in order. */
function stateAfter(start: UpdateSchedulerState, events: readonly UpdateSchedulerEvent[]): UpdateSchedulerState {
  return events.reduce((state, event) => stepUpdateScheduler(state, event).state, start);
}

/** Freezes a state and its notified build id list. */
function deepFreeze(state: UpdateSchedulerState): UpdateSchedulerState {
  Object.freeze(state.notifiedBuildIds);
  return Object.freeze(state);
}

/** Returns a fresh scheduler for the current build with no reload attempted. */
function freshState(): UpdateSchedulerState {
  return createUpdateSchedulerState(CURRENT, null);
}

/** Returns a scheduler in each phase, with a pending wake and a notified build to expose mutation. */
function stateInPhase(phase: UpdateSchedulerPhase): UpdateSchedulerState {
  const checking = stateAfter(freshState(), [
    { kind: 'notified', buildId: 'seen-build' },
    { kind: 'wake', nowMs: 0 },
    { kind: 'wake', nowMs: 10 },
  ]);
  if (phase === 'checking') return checking;
  if (phase === 'idle') return stateAfter(freshState(), [{ kind: 'notified', buildId: 'seen-build' }]);
  return stateAfter(checking, [{ kind: 'dispose' }]);
}

const wakeAt = (nowMs: number): UpdateSchedulerEvent => ({ kind: 'wake', nowMs });
const successAt = (nowMs: number, remote: BuildManifest = REMOTE): UpdateSchedulerEvent => ({
  kind: 'settled',
  nowMs,
  remote,
});
const failureAt = (nowMs: number): UpdateSchedulerEvent => ({ kind: 'settled', nowMs, remote: null });

describe('createUpdateSchedulerState', () => {
  it('starts idle with nothing checked or reported', () => {
    expect(createUpdateSchedulerState(CURRENT, 'tried')).toEqual({
      phase: 'idle',
      checkStartMs: null,
      lastSuccessStartMs: null,
      pendingWake: false,
      notifiedBuildIds: [],
      currentBuildId: CURRENT,
      attemptedBuildId: 'tried',
    });
  });
});

describe('stepUpdateScheduler', () => {
  it('starts a check on the first wake', () => {
    const step = stepUpdateScheduler(freshState(), wakeAt(5));
    expect(step.action).toEqual({ kind: 'start' });
    expect(step.state.phase).toBe('checking');
    expect(step.state.checkStartMs).toBe(5);
  });

  it('anchors the wait at the start of the last successful check', () => {
    const afterSuccess = stateAfter(freshState(), [wakeAt(1_000), successAt(4_000)]);
    expect(afterSuccess.lastSuccessStartMs).toBe(1_000);
    expect(stepUpdateScheduler(afterSuccess, wakeAt(1_000 + UPDATE_CHECK_MIN_INTERVAL_MS - 1)).action).toEqual({
      kind: 'none',
    });
    expect(stepUpdateScheduler(afterSuccess, wakeAt(1_000 + UPDATE_CHECK_MIN_INTERVAL_MS)).action).toEqual({
      kind: 'start',
    });
  });

  it('ignores a wake during a check and makes no follow-up after a success', () => {
    const steps = runEvents(freshState(), [wakeAt(0), wakeAt(100), successAt(200, { ...REMOTE, buildId: CURRENT })]);
    expect(steps.map((step) => step.action.kind)).toEqual(['start', 'none', 'none']);
    expect(steps[2].state.phase).toBe('idle');
    expect(steps[2].state.pendingWake).toBe(false);
  });

  it('merges several wakes during a failed check into exactly one follow-up', () => {
    const steps = runEvents(freshState(), [wakeAt(0), wakeAt(10), wakeAt(20), wakeAt(30), failureAt(40)]);
    expect(steps.map((step) => step.action.kind)).toEqual(['start', 'none', 'none', 'none', 'start']);
    const followUp = steps[4].state;
    expect(followUp.phase).toBe('checking');
    expect(followUp.checkStartMs).toBe(40);
    expect(followUp.pendingWake).toBe(false);
    expect(stepUpdateScheduler(followUp, failureAt(50)).action).toEqual({ kind: 'none' });
  });

  it('does not start the wait after a failure with nothing pending', () => {
    const steps = runEvents(freshState(), [wakeAt(0), failureAt(10), wakeAt(20)]);
    expect(steps.map((step) => step.action.kind)).toEqual(['start', 'none', 'start']);
    expect(steps[1].state.lastSuccessStartMs).toBeNull();
  });

  it('keeps the last success anchor through a failed check', () => {
    const afterFailure = stateAfter(freshState(), [
      wakeAt(0),
      successAt(10),
      wakeAt(UPDATE_CHECK_MIN_INTERVAL_MS),
      failureAt(UPDATE_CHECK_MIN_INTERVAL_MS + 10),
    ]);
    expect(afterFailure.lastSuccessStartMs).toBe(0);
  });

  it('notifies once per build id after it is reported', () => {
    const minute = UPDATE_CHECK_MIN_INTERVAL_MS;
    const steps = runEvents(freshState(), [
      wakeAt(0),
      successAt(10),
      { kind: 'notified', buildId: REMOTE.buildId },
      wakeAt(minute),
      successAt(minute + 10),
      wakeAt(2 * minute),
      successAt(2 * minute + 10, NEWER),
    ]);
    expect(steps[1].action).toEqual({ kind: 'notify', manifest: REMOTE });
    expect(steps[2].state.notifiedBuildIds).toEqual([REMOTE.buildId]);
    expect(steps[4].action).toEqual({ kind: 'none' });
    expect(steps[6].action).toEqual({ kind: 'notify', manifest: NEWER });
  });

  it('notifies again on the next success when the build was never reported', () => {
    const minute = UPDATE_CHECK_MIN_INTERVAL_MS;
    const steps = runEvents(freshState(), [wakeAt(0), successAt(10), wakeAt(minute), successAt(minute + 10)]);
    expect(steps[1].action).toEqual({ kind: 'notify', manifest: REMOTE });
    expect(steps[3].action).toEqual({ kind: 'notify', manifest: REMOTE });
  });

  it('stays quiet for the running build', () => {
    const steps = runEvents(freshState(), [wakeAt(0), successAt(10, { ...REMOTE, buildId: CURRENT })]);
    expect(steps[1].action).toEqual({ kind: 'none' });
  });

  it('stays quiet for a build a reload already tried', () => {
    const steps = runEvents(createUpdateSchedulerState(CURRENT, REMOTE.buildId), [wakeAt(0), successAt(10)]);
    expect(steps[1].action).toEqual({ kind: 'none' });
  });

  it('makes every event after dispose a no-op, including a late settle', () => {
    const disposed = stateAfter(freshState(), [wakeAt(0), { kind: 'dispose' }]);
    expect(disposed.phase).toBe('disposed');
    const lateEvents: UpdateSchedulerEvent[] = [
      successAt(10),
      failureAt(10),
      wakeAt(UPDATE_CHECK_MIN_INTERVAL_MS * 10),
      { kind: 'notified', buildId: REMOTE.buildId },
      { kind: 'dispose' },
    ];
    for (const event of lateEvents) {
      const step = stepUpdateScheduler(disposed, event);
      expect(step.action).toEqual({ kind: 'none' });
      expect(step.state).toBe(disposed);
    }
  });

  it('ignores a stale settle while idle', () => {
    const idle = freshState();
    for (const event of [successAt(10), failureAt(10)]) {
      const step = stepUpdateScheduler(idle, event);
      expect(step.action).toEqual({ kind: 'none' });
      expect(step.state).toBe(idle);
    }
  });

  describe('every phase and event kind', () => {
    const cases: ReadonlyArray<{
      phase: UpdateSchedulerPhase;
      event: UpdateSchedulerEvent;
      action: string;
      nextPhase: UpdateSchedulerPhase;
    }> = [
      { phase: 'idle', event: wakeAt(20), action: 'start', nextPhase: 'checking' },
      { phase: 'idle', event: successAt(20), action: 'none', nextPhase: 'idle' },
      { phase: 'idle', event: failureAt(20), action: 'none', nextPhase: 'idle' },
      { phase: 'idle', event: { kind: 'notified', buildId: 'x' }, action: 'none', nextPhase: 'idle' },
      { phase: 'idle', event: { kind: 'dispose' }, action: 'none', nextPhase: 'disposed' },
      { phase: 'checking', event: wakeAt(20), action: 'none', nextPhase: 'checking' },
      { phase: 'checking', event: successAt(20), action: 'notify', nextPhase: 'idle' },
      { phase: 'checking', event: failureAt(20), action: 'start', nextPhase: 'checking' },
      { phase: 'checking', event: { kind: 'notified', buildId: 'x' }, action: 'none', nextPhase: 'checking' },
      { phase: 'checking', event: { kind: 'dispose' }, action: 'none', nextPhase: 'disposed' },
      { phase: 'disposed', event: wakeAt(20), action: 'none', nextPhase: 'disposed' },
      { phase: 'disposed', event: successAt(20), action: 'none', nextPhase: 'disposed' },
      { phase: 'disposed', event: failureAt(20), action: 'none', nextPhase: 'disposed' },
      { phase: 'disposed', event: { kind: 'notified', buildId: 'x' }, action: 'none', nextPhase: 'disposed' },
      { phase: 'disposed', event: { kind: 'dispose' }, action: 'none', nextPhase: 'disposed' },
    ];

    it.each(cases)('$phase + $event.kind ($action)', ({ phase, event, action, nextPhase }) => {
      const step = stepUpdateScheduler(stateInPhase(phase), event);
      expect(step.action.kind).toBe(action);
      expect(step.state.phase).toBe(nextPhase);
    });

    it.each(cases)('never mutates a deep-frozen $phase state on $event.kind', ({ phase, event }) => {
      const input = deepFreeze(stateInPhase(phase));
      const snapshot = structuredClone(input);
      expect(() => stepUpdateScheduler(input, event)).not.toThrow();
      expect(input).toEqual(snapshot);
    });
  });
});
