import { describe, expect, it } from 'vitest';
import { motionProfile } from './motion';

describe('motionProfile', () => {
  it('enables all ambient motion in the full profile', () => {
    expect(motionProfile(false)).toEqual({
      ambient: true,
      bob: 15,
      gillFlutter: true,
      bubbles: true,
      dashTrail: true,
      reedSway: true,
      collectBob: true,
      cameraLerp: 0.1,
      turnTween: true,
    });
  });

  it('disables decorative motion and snaps the camera faster when reduced', () => {
    expect(motionProfile(true)).toEqual({
      ambient: false,
      bob: 0,
      gillFlutter: false,
      bubbles: false,
      dashTrail: false,
      reedSway: false,
      collectBob: false,
      cameraLerp: 0.25,
      turnTween: false,
    });
  });

  it('returns an independent copy each call', () => {
    const profile = motionProfile(false);
    profile.bob = 99;
    expect(motionProfile(false).bob).toBe(15);
  });
});
