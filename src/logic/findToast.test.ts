import { describe, expect, it } from 'vitest';
import {
  FIND_TOAST_FADE_MS,
  FIND_TOAST_HOLD_MS,
  FIND_TOAST_SLIDE_PX,
  createFindToastState,
  describeFindToastFrame,
  pickToastAnnouncement,
  stepFindToast,
  type FindToastEvent,
  type FindToastPhase,
  type FindToastState,
  type FindToastStep,
  type ToastItem,
} from './findToast';
import type { FoundInfo, RescueSnapshot, TripPhase } from './tripEvents';

const SHELL: FoundInfo = { id: 'shell', name: 'Spiral shell', category: 'decoration', rarity: 'common' };
const CROWN: FoundInfo = { id: 'crown', name: 'Tiny crown', category: 'wearable', rarity: 'rare' };
const PAINT: FoundInfo = { id: 'paint', name: 'Sunset orange', category: 'paintShell', rarity: 'epic' };
const SHELL_ITEM: ToastItem = { kind: 'treasure', found: SHELL };
const CROWN_ITEM: ToastItem = { kind: 'treasure', found: CROWN };
const RESCUE_ITEM: ToastItem = { kind: 'axolotl', morph: 'wild' };

const show = (item: ToastItem, ambient = true): FindToastEvent => ({ kind: 'show', item, ambient });
const tick = (dtMs: number, ambient = true): FindToastEvent => ({ kind: 'tick', dtMs, ambient });
const placedAt = (edge: 'top' | 'bottom' | 'panel' = 'top'): FindToastEvent => ({ kind: 'placed', edge });
const NO_ROOM: FindToastEvent = { kind: 'noRoom' };
const PAUSE: FindToastEvent = { kind: 'pause' };
const RESUME: FindToastEvent = { kind: 'resume' };
const CLEAR: FindToastEvent = { kind: 'clear' };

/** Applies events in order from a starting state and returns every step. */
function runEvents(start: FindToastState, events: readonly FindToastEvent[]): FindToastStep[] {
  const steps: FindToastStep[] = [];
  let state = start;
  for (const event of events) {
    const step = stepFindToast(state, event);
    steps.push(step);
    state = step.state;
  }
  return steps;
}

/** Returns the state after applying events in order. */
function stateAfter(start: FindToastState, events: readonly FindToastEvent[]): FindToastState {
  return events.reduce((state, event) => stepFindToast(state, event).state, start);
}

/** Returns a toast showing the shell, placed at the top, in `phase` with motion on. */
function stateInPhase(phase: Exclude<FindToastPhase, 'idle'>): FindToastState {
  const entering = stateAfter(createFindToastState(), [show(SHELL_ITEM), placedAt('top'), tick(100)]);
  if (phase === 'entering') return entering;
  if (phase === 'holding') return stateAfter(entering, [tick(1000)]);
  return stateAfter(entering, [tick(FIND_TOAST_FADE_MS + FIND_TOAST_HOLD_MS - 100)]);
}

/** Returns the ms of toast time until it finishes when ticked in 10 ms frames (motion on). */
function msUntilFinished(start: FindToastState, ambient = true): number {
  let state = start;
  let elapsedMs = 0;
  while (state.item !== null) {
    state = stepFindToast(state, tick(10, ambient)).state;
    elapsedMs += 10;
    if (elapsedMs > 10_000) throw new Error('msUntilFinished: toast never finished');
  }
  return elapsedMs;
}

describe('createFindToastState', () => {
  it('starts idle, empty, placed nowhere and running', () => {
    expect(createFindToastState()).toEqual({
      phase: 'idle',
      item: null,
      remainingMs: 0,
      waiting: false,
      paused: false,
      edge: null,
    });
  });
});

describe('stepFindToast lifecycle', () => {
  it('stays idle on ticks with nothing to show', () => {
    const step = stepFindToast(createFindToastState(), tick(500));
    expect(step).toEqual({ state: createFindToastState(), placementRequested: false });
  });

  it('enters on show when idle with motion on and asks for placement', () => {
    const step = stepFindToast(createFindToastState(), show(SHELL_ITEM));
    expect(step.placementRequested).toBe(true);
    expect(step.state).toMatchObject({ phase: 'entering', item: SHELL_ITEM, remainingMs: FIND_TOAST_FADE_MS });
  });

  it('enters, holds, then leaves 250 + 2000 ms after show, then finishes 250 ms later', () => {
    const start = stateAfter(createFindToastState(), [show(SHELL_ITEM), placedAt()]);
    expect(stateAfter(start, [tick(FIND_TOAST_FADE_MS - 1)]).phase).toBe('entering');
    expect(stateAfter(start, [tick(FIND_TOAST_FADE_MS)]).phase).toBe('holding');
    expect(stateAfter(start, [tick(FIND_TOAST_FADE_MS + FIND_TOAST_HOLD_MS - 1)]).phase).toBe('holding');
    const leaving = stateAfter(start, [tick(FIND_TOAST_FADE_MS + FIND_TOAST_HOLD_MS)]);
    expect(leaving).toMatchObject({ phase: 'leaving', remainingMs: FIND_TOAST_FADE_MS });
    const finished = runEvents(leaving, [tick(FIND_TOAST_FADE_MS - 1), tick(1)]);
    expect(finished[0].state.phase).toBe('leaving');
    expect(finished[0].placementRequested).toBe(false);
    expect(finished[1].state).toMatchObject({ phase: 'idle', item: null, waiting: false });
    expect(finished[1].placementRequested).toBe(true);
  });

  it('carries frame time over phase boundaries', () => {
    const start = stateAfter(createFindToastState(), [show(SHELL_ITEM), placedAt()]);
    expect(stateAfter(start, [tick(300)])).toMatchObject({ phase: 'holding', remainingMs: FIND_TOAST_HOLD_MS - 50 });
    expect(msUntilFinished(start)).toBe(2 * FIND_TOAST_FADE_MS + FIND_TOAST_HOLD_MS);
  });

  it('finishes in one long frame and asks for placement once', () => {
    const start = stateAfter(createFindToastState(), [show(SHELL_ITEM), placedAt()]);
    const step = stepFindToast(start, tick(10_000));
    expect(step.state.phase).toBe('idle');
    expect(step.placementRequested).toBe(true);
  });

  it('treats a negative frame time as no time', () => {
    const start = stateInPhase('holding');
    expect(stepFindToast(start, tick(-50)).state).toEqual(start);
  });

  it('shows at once under reduced motion and finishes at once 2000 ms after show', () => {
    const start = stateAfter(createFindToastState(), [show(SHELL_ITEM, false), placedAt()]);
    expect(start).toMatchObject({ phase: 'holding', remainingMs: FIND_TOAST_HOLD_MS });
    expect(describeFindToastFrame(start)).toEqual({ visible: true, alpha: 1, offsetY: 0 });
    expect(stateAfter(start, [tick(FIND_TOAST_HOLD_MS - 1, false)]).phase).toBe('holding');
    const step = stepFindToast(stateAfter(start, [tick(FIND_TOAST_HOLD_MS - 1, false)]), tick(1, false));
    expect(step.state.phase).toBe('idle');
    expect(step.placementRequested).toBe(true);
  });

  it('never mutates its input', () => {
    const start = Object.freeze(stateInPhase('entering'));
    const events: FindToastEvent[] = [show(CROWN_ITEM), placedAt('bottom'), NO_ROOM, tick(20), tick(20, false), PAUSE, RESUME, CLEAR];
    for (const event of events) expect(() => stepFindToast(start, event)).not.toThrow();
  });
});

describe('stepFindToast replace', () => {
  it.each(['entering', 'holding', 'leaving'] as const)('swaps at once at full opacity and restarts the hold while %s', (phase) => {
    const step = stepFindToast(stateInPhase(phase), show(CROWN_ITEM));
    expect(step.placementRequested).toBe(true);
    expect(step.state).toMatchObject({ phase: 'holding', item: CROWN_ITEM, remainingMs: FIND_TOAST_HOLD_MS });
    expect(describeFindToastFrame(step.state)).toEqual({ visible: true, alpha: 1, offsetY: 0 });
    expect(msUntilFinished(step.state)).toBe(FIND_TOAST_HOLD_MS + FIND_TOAST_FADE_MS);
  });

  it('swaps at once while waiting for room and keeps waiting until the next placement', () => {
    const waiting = stateAfter(stateInPhase('entering'), [NO_ROOM]);
    const swapped = stepFindToast(waiting, show(CROWN_ITEM)).state;
    expect(swapped).toMatchObject({ phase: 'holding', item: CROWN_ITEM, waiting: true, remainingMs: FIND_TOAST_HOLD_MS });
    expect(describeFindToastFrame(swapped).visible).toBe(false);
    expect(stateAfter(swapped, [tick(5000)])).toEqual(swapped);
    const placed = stateAfter(swapped, [placedAt('bottom')]);
    expect(describeFindToastFrame(placed)).toEqual({ visible: true, alpha: 1, offsetY: 0 });
  });
});

describe('stepFindToast pause', () => {
  it.each(['entering', 'holding', 'leaving'] as const)('passes no time while paused during %s', (phase) => {
    const start = stateInPhase(phase);
    const paused = stateAfter(start, [PAUSE, tick(5000)]);
    expect(paused).toEqual({ ...start, paused: true });
    const resumed = stateAfter(paused, [RESUME]);
    expect(resumed).toEqual(start);
    expect(msUntilFinished(resumed)).toBe(msUntilFinished(start));
  });

  it('enters from a show made while paused only once resumed', () => {
    const paused = stateAfter(createFindToastState(), [PAUSE, show(SHELL_ITEM), placedAt(), tick(1000)]);
    expect(paused).toMatchObject({ phase: 'entering', remainingMs: FIND_TOAST_FADE_MS });
    expect(stateAfter(paused, [RESUME, tick(FIND_TOAST_FADE_MS)]).phase).toBe('holding');
  });

  it('keeps the pause across a clear', () => {
    const cleared = stateAfter(stateInPhase('holding'), [PAUSE, CLEAR]);
    expect(cleared).toMatchObject({ phase: 'idle', paused: true });
  });
});

describe('stepFindToast waiting for room', () => {
  it.each(['entering', 'holding', 'leaving'] as const)('hides and passes no time while waiting during %s', (phase) => {
    const start = stateInPhase(phase);
    const waiting = stateAfter(start, [NO_ROOM, tick(5000)]);
    expect(waiting).toEqual({ ...start, waiting: true, edge: null });
    expect(describeFindToastFrame(waiting).visible).toBe(false);
  });

  it('shows again from the frozen time once a resize finds room', () => {
    const start = stateInPhase('holding');
    const waiting = stateAfter(start, [NO_ROOM, tick(3000)]);
    const placed = stateAfter(waiting, [placedAt('bottom')]);
    expect(placed).toEqual({ ...start, edge: 'bottom' });
    expect(describeFindToastFrame(placed).visible).toBe(true);
    expect(msUntilFinished(placed)).toBe(msUntilFinished(start));
  });

  it('waits from the first placement of a new show with no room', () => {
    const steps = runEvents(createFindToastState(), [show(SHELL_ITEM), NO_ROOM, tick(4000), placedAt('top')]);
    expect(describeFindToastFrame(steps[2].state).visible).toBe(false);
    expect(steps[2].state).toMatchObject({ phase: 'entering', remainingMs: FIND_TOAST_FADE_MS });
    expect(describeFindToastFrame(steps[3].state)).toMatchObject({ visible: true, alpha: 0, offsetY: -FIND_TOAST_SLIDE_PX });
  });

  it('does not ask for placement on placed or noRoom', () => {
    const steps = runEvents(stateInPhase('holding'), [NO_ROOM, placedAt()]);
    expect(steps.map((step) => step.placementRequested)).toEqual([false, false]);
  });
});

describe('stepFindToast clear', () => {
  it.each(['entering', 'holding', 'leaving'] as const)('hides at once and asks for placement while %s', (phase) => {
    const step = stepFindToast(stateInPhase(phase), CLEAR);
    expect(step.placementRequested).toBe(true);
    expect(step.state).toMatchObject({ phase: 'idle', item: null, waiting: false });
    expect(describeFindToastFrame(step.state).visible).toBe(false);
  });

  it('asks for placement while waiting with a toast current', () => {
    const step = stepFindToast(stateAfter(stateInPhase('holding'), [NO_ROOM]), CLEAR);
    expect(step.placementRequested).toBe(true);
    expect(step.state.waiting).toBe(false);
  });

  it('does not ask for placement when idle, even if waiting', () => {
    expect(stepFindToast(createFindToastState(), CLEAR).placementRequested).toBe(false);
    expect(stepFindToast(stateAfter(createFindToastState(), [NO_ROOM]), CLEAR).placementRequested).toBe(false);
  });
});

describe('stepFindToast reduced motion', () => {
  it('turning on mid-enter shows in full at once with the leave time unchanged', () => {
    const entering = stateInPhase('entering');
    const settled = stepFindToast(entering, tick(0, false));
    expect(settled.placementRequested).toBe(false);
    expect(settled.state.phase).toBe('holding');
    expect(describeFindToastFrame(settled.state)).toEqual({ visible: true, alpha: 1, offsetY: 0 });
    const motionLeaveMs = FIND_TOAST_FADE_MS - 100 + FIND_TOAST_HOLD_MS;
    expect(stateAfter(settled.state, [tick(motionLeaveMs - 1, false)]).phase).toBe('holding');
    expect(stepFindToast(stateAfter(settled.state, [tick(motionLeaveMs - 1, false)]), tick(1, false)).state.phase).toBe('idle');
  });

  it('turning on mid-hold finishes at once when the hold ends', () => {
    const holding = stateInPhase('holding');
    expect(stepFindToast(holding, tick(0, false)).state).toEqual(holding);
    expect(msUntilFinished(holding, false)).toBe(holding.remainingMs);
  });

  it('turning on mid-leave finishes at once and asks for placement', () => {
    const step = stepFindToast(stateInPhase('leaving'), tick(0, false));
    expect(step.placementRequested).toBe(true);
    expect(step.state).toMatchObject({ phase: 'idle', item: null });
  });

  it('settles even while paused or waiting', () => {
    const pausedEnter = stepFindToast(stateAfter(stateInPhase('entering'), [PAUSE]), tick(16, false));
    expect(pausedEnter.state).toMatchObject({ phase: 'holding', paused: true });
    const waitingLeave = stepFindToast(stateAfter(stateInPhase('leaving'), [NO_ROOM]), tick(16, false));
    expect(waitingLeave.placementRequested).toBe(true);
    expect(waitingLeave.state.phase).toBe('idle');
  });

  it('turning off mid-hold fades the next leave', () => {
    const start = stateAfter(createFindToastState(), [show(SHELL_ITEM, false), placedAt(), tick(500, false)]);
    const leaving = stateAfter(start, [tick(FIND_TOAST_HOLD_MS - 500)]);
    expect(leaving).toMatchObject({ phase: 'leaving', remainingMs: FIND_TOAST_FADE_MS });
  });
});

describe('describeFindToastFrame', () => {
  it('hides when idle', () => {
    expect(describeFindToastFrame(createFindToastState())).toEqual({ visible: false, alpha: 1, offsetY: 0 });
  });

  it.each([
    ['top', -FIND_TOAST_SLIDE_PX],
    ['bottom', FIND_TOAST_SLIDE_PX],
    ['panel', 0],
  ] as const)('slides in from the %s edge offset %d while fading in', (edge, offset) => {
    const start = stateAfter(createFindToastState(), [show(SHELL_ITEM), placedAt(edge)]);
    expect(describeFindToastFrame(start)).toEqual({ visible: true, alpha: 0, offsetY: offset });
    const half = describeFindToastFrame(stateAfter(start, [tick(FIND_TOAST_FADE_MS / 2)]));
    const eased = Math.sin(Math.PI / 4);
    expect(half.alpha).toBeCloseTo(eased);
    expect(half.offsetY).toBeCloseTo(offset * (1 - eased));
    expect(describeFindToastFrame(stateAfter(start, [tick(FIND_TOAST_FADE_MS)]))).toEqual({
      visible: true,
      alpha: 1,
      offsetY: 0,
    });
  });

  it('slides from the current edge when the edge changes mid-enter', () => {
    const moved = stateAfter(createFindToastState(), [show(SHELL_ITEM), placedAt('top'), tick(0), placedAt('bottom')]);
    expect(describeFindToastFrame(moved).offsetY).toBe(FIND_TOAST_SLIDE_PX);
  });

  it('fades out linearly while leaving', () => {
    const leaving = stateInPhase('leaving');
    expect(describeFindToastFrame(leaving)).toEqual({ visible: true, alpha: 1, offsetY: 0 });
    expect(describeFindToastFrame(stateAfter(leaving, [tick(FIND_TOAST_FADE_MS * 0.4)])).alpha).toBeCloseTo(0.6);
  });
});

describe('pickToastAnnouncement', () => {
  const following: RescueSnapshot = { id: 'axolotl:wild', morph: 'wild', status: 'following' };
  const waitingRescue: RescueSnapshot = { ...following, status: 'waiting' };

  /** Builds the snapshot fields the announcement reads. */
  function snapshotOf(found: FoundInfo[], phase: TripPhase = 'swimming', rescue: RescueSnapshot | null = null) {
    return { phase, found, rescue };
  }

  it('announces only the last of several new finds', () => {
    expect(pickToastAnnouncement(1, null, snapshotOf([SHELL, CROWN, PAINT]))).toEqual({
      announcedCount: 3,
      item: { kind: 'treasure', found: PAINT },
    });
  });

  it('announces nothing when no find is new', () => {
    expect(pickToastAnnouncement(2, null, snapshotOf([SHELL, CROWN]))).toEqual({ announcedCount: 2, item: null });
  });

  it('starts counting again when the found list gets shorter (a new trip)', () => {
    expect(pickToastAnnouncement(3, null, snapshotOf([CROWN]))).toEqual({ announcedCount: 1, item: CROWN_ITEM });
    expect(pickToastAnnouncement(3, null, snapshotOf([]))).toEqual({ announcedCount: 0, item: null });
  });

  it.each(['banked', 'carrying', 'ended'] as const)('announces nothing while %s but still advances the count', (phase) => {
    expect(pickToastAnnouncement(0, waitingRescue, snapshotOf([SHELL, CROWN], phase, following))).toEqual({
      announcedCount: 2,
      item: null,
    });
  });

  it('announces a rescue when it starts following', () => {
    expect(pickToastAnnouncement(0, waitingRescue, snapshotOf([], 'swimming', following))).toEqual({
      announcedCount: 0,
      item: RESCUE_ITEM,
    });
    expect(pickToastAnnouncement(0, null, snapshotOf([], 'swimming', following)).item).toEqual(RESCUE_ITEM);
  });

  it('does not announce a rescue that was already following', () => {
    expect(pickToastAnnouncement(0, following, snapshotOf([], 'swimming', following)).item).toBeNull();
  });

  it('does not announce a rescue that is waiting or safe', () => {
    expect(pickToastAnnouncement(0, null, snapshotOf([], 'swimming', waitingRescue)).item).toBeNull();
    const safe: RescueSnapshot = { ...following, status: 'safe' };
    expect(pickToastAnnouncement(0, following, snapshotOf([], 'swimming', safe)).item).toBeNull();
  });

  it('announces only the rescue when a find and a rescue arrive in one snapshot, and it enters normally', () => {
    const announcement = pickToastAnnouncement(0, waitingRescue, snapshotOf([SHELL], 'swimming', following));
    expect(announcement).toEqual({ announcedCount: 1, item: RESCUE_ITEM });
    const step = stepFindToast(createFindToastState(), show(RESCUE_ITEM));
    expect(step.state.phase).toBe('entering');
  });

  it('announces a later find after a rescue that is still following', () => {
    expect(pickToastAnnouncement(0, following, snapshotOf([SHELL], 'swimming', following)).item).toEqual(SHELL_ITEM);
  });
});
