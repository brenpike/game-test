/**
 * Pure find toast lifecycle (PRD B8, C3, X10): which find or rescue the toast shows, its enter, hold and
 * leave timing on the HUD clock, and the frame the HUD draws. Time stands still while the HUD is
 * paused or while the toast waits for room; reduced motion skips the slide and both fades.
 */
import type { OverlayEdge } from './hudLayout';
import type { RealMorphId } from './morphs';
import type { FoundInfo, RescueSnapshot, TripSnapshot } from './tripEvents';

/** Fade-in, slide-in and fade-out time in ms. */
export const FIND_TOAST_FADE_MS = 250;
/** Time in ms a toast stays at full opacity before it leaves. */
export const FIND_TOAST_HOLD_MS = 2000;
/** Distance in CSS px an entering toast slides in from its edge. */
export const FIND_TOAST_SLIDE_PX = 16;

/** One toast: a found treasure, or a stranded axolotl now following the player. */
export type ToastItem = { kind: 'treasure'; found: FoundInfo } | { kind: 'axolotl'; morph: RealMorphId };

export type FindToastPhase = 'idle' | 'entering' | 'holding' | 'leaving';

/**
 * Toast state. `remainingMs` is the time left in the current phase (0 when idle). `waiting` is
 * whether the last placement found no room, `paused` whether the HUD clock is frozen, and `edge`
 * where the last placement put the toast (null before one or while waiting).
 */
export interface FindToastState {
  readonly phase: FindToastPhase;
  readonly item: ToastItem | null;
  readonly remainingMs: number;
  readonly waiting: boolean;
  readonly paused: boolean;
  readonly edge: OverlayEdge | null;
}

export type FindToastEvent =
  | { readonly kind: 'show'; readonly item: ToastItem; readonly ambient: boolean }
  | { readonly kind: 'placed'; readonly edge: OverlayEdge | null }
  | { readonly kind: 'noRoom' }
  | { readonly kind: 'tick'; readonly dtMs: number; readonly ambient: boolean }
  | { readonly kind: 'pause' }
  | { readonly kind: 'resume' }
  | { readonly kind: 'clear' };

/** The next state, and whether the HUD should place the overlays again. */
export interface FindToastStep {
  readonly state: FindToastState;
  readonly placementRequested: boolean;
}

/** What the HUD draws: whether the toast shows, its opacity and its content's vertical offset in CSS px. */
export interface FindToastFrame {
  readonly visible: boolean;
  readonly alpha: number;
  readonly offsetY: number;
}

/** The toast to show for one trip snapshot, if any, and the find count announced so far. */
export interface ToastAnnouncement {
  readonly announcedCount: number;
  readonly item: ToastItem | null;
}

/** Idle toast state: nothing shown, not waiting, HUD clock running. */
export function createFindToastState(): FindToastState {
  return { phase: 'idle', item: null, remainingMs: 0, waiting: false, paused: false, edge: null };
}

/** Returns `state` with no placement request. */
function keepPlacement(state: FindToastState): FindToastStep {
  return { state, placementRequested: false };
}

/** Hides the toast and asks for placement. */
function finishToast(state: FindToastState): FindToastStep {
  return {
    state: { ...state, phase: 'idle', item: null, remainingMs: 0, waiting: false },
    placementRequested: true,
  };
}

/**
 * Shows `item`: swaps it in at full opacity and restarts the hold when a toast is current (in any
 * phase or waiting), else enters it, sliding and fading in when `ambient`. Always asks for placement.
 */
function showItem(state: FindToastState, item: ToastItem, ambient: boolean): FindToastStep {
  const enters = state.item === null && ambient;
  return {
    state: {
      ...state,
      item,
      phase: enters ? 'entering' : 'holding',
      remainingMs: enters ? FIND_TOAST_FADE_MS : FIND_TOAST_HOLD_MS,
    },
    placementRequested: true,
  };
}

/** Hides the toast at once; asks for placement only when a toast was current. */
function clearToast(state: FindToastState): FindToastStep {
  const cleared = finishToast(state);
  return { state: cleared.state, placementRequested: state.item !== null };
}

/**
 * Applies reduced motion: an entering toast shows in full at once and holds for the full
 * FIND_TOAST_HOLD_MS (the rest of its entry is skipped), and a leaving toast finishes at once.
 */
function settleReducedMotion(state: FindToastState): FindToastStep {
  if (state.phase === 'entering') {
    return keepPlacement({ ...state, phase: 'holding', remainingMs: FIND_TOAST_HOLD_MS });
  }
  if (state.phase === 'leaving') return finishToast(state);
  return keepPlacement(state);
}

/**
 * Moves a toast whose phase time has run out (`remainingMs` at most 0, the overrun) into its next
 * phase, carrying the overrun: entering to holding, holding to leaving (or finished at once without
 * `ambient`), leaving to finished.
 */
function endPhase(state: FindToastState, ambient: boolean): FindToastStep {
  if (state.phase === 'entering') {
    return keepPlacement({ ...state, phase: 'holding', remainingMs: state.remainingMs + FIND_TOAST_HOLD_MS });
  }
  if (state.phase === 'holding' && ambient) {
    return keepPlacement({ ...state, phase: 'leaving', remainingMs: state.remainingMs + FIND_TOAST_FADE_MS });
  }
  return finishToast(state);
}

/** Runs the toast clock forward by `dtMs`, through as many phases as that time covers. */
function advanceTime(state: FindToastState, dtMs: number, ambient: boolean): FindToastStep {
  if (state.phase === 'idle') return keepPlacement(state);
  const remainingMs = state.remainingMs - dtMs;
  if (remainingMs > 0) return keepPlacement({ ...state, remainingMs });
  const ended = endPhase({ ...state, remainingMs }, ambient);
  if (ended.placementRequested) return ended;
  return advanceTime(ended.state, 0, ambient);
}

/**
 * Advances one frame of `dtMs` (negative counts as 0). Reduced motion settles the toast even while
 * paused or waiting; time itself passes only while neither.
 */
function tickToast(state: FindToastState, dtMs: number, ambient: boolean): FindToastStep {
  const settled = ambient ? keepPlacement(state) : settleReducedMotion(state);
  if (settled.placementRequested || state.paused || state.waiting) return settled;
  return advanceTime(settled.state, Math.max(0, dtMs), ambient);
}

/** Applies one event to the toast. Total over every phase and event; never mutates its input. */
export function stepFindToast(state: FindToastState, event: FindToastEvent): FindToastStep {
  switch (event.kind) {
    case 'show':
      return showItem(state, event.item, event.ambient);
    case 'placed':
      return keepPlacement({ ...state, waiting: false, edge: event.edge });
    case 'noRoom':
      return keepPlacement({ ...state, waiting: true, edge: null });
    case 'tick':
      return tickToast(state, event.dtMs, event.ambient);
    case 'pause':
      return keepPlacement({ ...state, paused: true });
    case 'resume':
      return keepPlacement({ ...state, paused: false });
    case 'clear':
      return clearToast(state);
  }
}

/** Returns the content offset a toast slides in from at `edge`: down from above at the top, up from below at the bottom. */
function computeSlideOffset(edge: OverlayEdge | null): number {
  if (edge === 'top') return -FIND_TOAST_SLIDE_PX;
  if (edge === 'bottom') return FIND_TOAST_SLIDE_PX;
  return 0;
}

/**
 * Returns the frame to draw for `state`: shown only while a toast is current and not waiting.
 * Entering eases opacity and slide by sin(p·π/2) over the fade time; leaving fades linearly.
 */
export function describeFindToastFrame(state: FindToastState): FindToastFrame {
  const visible = state.item !== null && !state.waiting;
  if (state.phase === 'entering') {
    const progress = Math.min(Math.max(1 - state.remainingMs / FIND_TOAST_FADE_MS, 0), 1);
    const eased = Math.sin((progress * Math.PI) / 2);
    return { visible, alpha: eased, offsetY: computeSlideOffset(state.edge) * (1 - eased) };
  }
  if (state.phase === 'leaving') {
    return { visible, alpha: Math.min(Math.max(state.remainingMs / FIND_TOAST_FADE_MS, 0), 1), offsetY: 0 };
  }
  return { visible, alpha: 1, offsetY: 0 };
}

/**
 * Picks the toast for a trip snapshot, given the finds announced so far and the rescue in the
 * previous snapshot. Only while 'swimming': a rescue that just started following wins, else the
 * last find picked up since the last snapshot (earlier ones in the same batch are not shown). A
 * shorter found list means a new trip, so counting starts again; every snapshot advances the count.
 */
export function pickToastAnnouncement(
  announcedCount: number,
  previousRescue: RescueSnapshot | null,
  snapshot: Pick<TripSnapshot, 'phase' | 'found' | 'rescue'>,
): ToastAnnouncement {
  const startCount = snapshot.found.length < announcedCount ? 0 : announcedCount;
  const nextCount = snapshot.found.length;
  if (snapshot.phase !== 'swimming') return { announcedCount: nextCount, item: null };
  const rescue = snapshot.rescue;
  if (rescue !== null && rescue.status === 'following' && previousRescue?.status !== 'following') {
    return { announcedCount: nextCount, item: { kind: 'axolotl', morph: rescue.morph } };
  }
  const last = snapshot.found.slice(startCount).at(-1);
  return { announcedCount: nextCount, item: last === undefined ? null : { kind: 'treasure', found: last } };
}
