import { describe, expect, it } from 'vitest';
import { createDash, dashCharge, tryStartDash, updateDash } from './tailDash';
import { SWIM } from './tuning';

describe('tailDash', () => {
  it('starts ready with full charge', () => {
    const dash = createDash();
    expect(dash).toEqual({ phase: 'ready', timer: 0 });
    expect(dashCharge(dash)).toBe(1);
  });

  it('starts a dash from ready', () => {
    const { state, started } = tryStartDash(createDash());
    expect(started).toBe(true);
    expect(state).toEqual({ phase: 'dashing', timer: SWIM.dashDuration });
    expect(dashCharge(state)).toBe(0);
  });

  it('refuses to start while dashing or cooling down', () => {
    const dashing = tryStartDash(createDash()).state;
    const retry = tryStartDash(dashing);
    expect(retry.started).toBe(false);
    expect(retry.state).toBe(dashing);

    const cooling = updateDash(dashing, SWIM.dashDuration);
    expect(cooling.phase).toBe('cooldown');
    expect(tryStartDash(cooling).started).toBe(false);
  });

  it('transitions dashing to cooldown to ready', () => {
    let dash = tryStartDash(createDash()).state;
    dash = updateDash(dash, SWIM.dashDuration / 2);
    expect(dash.phase).toBe('dashing');
    dash = updateDash(dash, SWIM.dashDuration / 2);
    expect(dash).toEqual({ phase: 'cooldown', timer: SWIM.dashCooldown });
    dash = updateDash(dash, SWIM.dashCooldown / 2);
    expect(dash.phase).toBe('cooldown');
    expect(dashCharge(dash)).toBeCloseTo(0.5, 9);
    dash = updateDash(dash, SWIM.dashCooldown / 2);
    expect(dash).toEqual(createDash());
    expect(tryStartDash(dash).started).toBe(true);
  });

  it('carries leftover time across phases', () => {
    const dashing = tryStartDash(createDash()).state;
    const cooling = updateDash(dashing, SWIM.dashDuration + 0.4);
    expect(cooling.phase).toBe('cooldown');
    expect(cooling.timer).toBeCloseTo(SWIM.dashCooldown - 0.4, 9);
    expect(updateDash(dashing, SWIM.dashDuration + SWIM.dashCooldown + 1)).toEqual(createDash());
  });

  it('ignores NaN and negative dt', () => {
    const dashing = tryStartDash(createDash()).state;
    expect(updateDash(dashing, Number.NaN)).toEqual(dashing);
    expect(updateDash(dashing, -1)).toEqual(dashing);
  });
});
