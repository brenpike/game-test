/** Animation switches derived from the reduced-motion preference. */
export interface MotionProfile {
  ambient: boolean;
  /** Idle bob amplitude in px. */
  bob: number;
  gillFlutter: boolean;
  bubbles: boolean;
  dashTrail: boolean;
  reedSway: boolean;
  collectBob: boolean;
  /** Camera follow lerp factor per frame. */
  cameraLerp: number;
  turnTween: boolean;
}

const FULL_MOTION: Readonly<MotionProfile> = Object.freeze({
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

const REDUCED_MOTION: Readonly<MotionProfile> = Object.freeze({
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

/** Returns a fresh motion profile for the given reduced-motion preference. */
export function motionProfile(reduced: boolean): MotionProfile {
  return { ...(reduced ? REDUCED_MOTION : FULL_MOTION) };
}
