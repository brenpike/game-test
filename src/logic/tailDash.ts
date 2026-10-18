import { SWIM, type SwimTuning } from './tuning';

export type DashPhase = 'ready' | 'dashing' | 'cooldown';

/** Tail-dash state machine; `timer` is seconds remaining in the current phase (0 when ready). */
export interface DashState {
  phase: DashPhase;
  timer: number;
}

type DashTiming = Pick<SwimTuning, 'dashDuration' | 'dashCooldown'>;

/** Returns a fresh dash state that can fire immediately. */
export function createDash(): DashState {
  return { phase: 'ready', timer: 0 };
}

/** Starts a dash only from `ready`; otherwise returns the input state with `started: false`. */
export function tryStartDash(
  dash: DashState,
  timing: DashTiming = SWIM,
): { state: DashState; started: boolean } {
  if (dash.phase !== 'ready') return { state: dash, started: false };
  return { state: { phase: 'dashing', timer: timing.dashDuration }, started: true };
}

/**
 * Advances the dash timer, carrying leftover time across phases
 * (dashing to cooldown to ready). Non-finite or negative dt is treated as 0.
 */
export function updateDash(dash: DashState, dt: number, timing: DashTiming = SWIM): DashState {
  const stepDt = dt > 0 ? dt : 0;
  if (dash.phase === 'ready') return dash;
  const remaining = dash.timer - stepDt;
  if (remaining > 0) return { phase: dash.phase, timer: remaining };
  if (dash.phase === 'dashing') {
    const cooldownLeft = timing.dashCooldown + remaining;
    if (cooldownLeft > 0) return { phase: 'cooldown', timer: cooldownLeft };
  }
  return createDash();
}

/** Returns dash readiness in [0, 1]: 0 while dashing, filling during cooldown, 1 when ready. */
export function dashCharge(dash: DashState, timing: DashTiming = SWIM): number {
  if (dash.phase === 'ready') return 1;
  if (dash.phase === 'dashing') return 0;
  if (timing.dashCooldown <= 0) return 1;
  return Math.min(1, Math.max(0, 1 - dash.timer / timing.dashCooldown));
}
