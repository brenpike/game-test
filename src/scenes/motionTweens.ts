import * as Phaser from 'phaser';

/**
 * A one-shot, finite motion tween.
 *
 * `props` holds absolute numeric end values only. Relative strings
 * (`'+=10'`), per-target functions, `delay`, `repeat` and `yoyo` are not
 * supported, so a settled tween can always be snapped straight to its end.
 */
export interface MotionTweenConfig {
  targets: object | readonly object[];
  props: Readonly<Record<string, number>>;
  duration: number;
  ease?: string;
  onComplete?: () => void;
}

interface MotionTweenRecord {
  targets: readonly object[];
  props: Readonly<Record<string, number>>;
  onComplete?: () => void;
}

const motionTweenRecords = new WeakMap<Phaser.Tweens.Tween, MotionTweenRecord>();

/** Returns the tween targets as an array copy. */
function listTargets(targets: object | readonly object[]): readonly object[] {
  return Array.isArray(targets) ? [...(targets as readonly object[])] : [targets];
}

/**
 * Adds a motion tween to `scene` and records its end state so
 * `settleMotionTweens` can finish it early.
 *
 * Any scene that adds motion tweens must call `settleMotionTweens` from its
 * `REDUCED_MOTION` handler, after switching its motion profile, so tweens
 * already running when reduced motion turns on jump to their end state.
 */
export function addMotionTween(scene: Phaser.Scene, config: MotionTweenConfig): Phaser.Tweens.Tween {
  const builderConfig: Phaser.Types.Tweens.TweenBuilderConfig = {
    targets: config.targets,
    props: { ...config.props },
    duration: config.duration,
  };
  if (config.ease !== undefined) {
    builderConfig.ease = config.ease;
  }
  if (config.onComplete !== undefined) {
    builderConfig.onComplete = config.onComplete;
  }
  const tween = scene.tweens.add(builderConfig);
  const tweenRecord: MotionTweenRecord = { targets: listTargets(config.targets), props: config.props };
  if (config.onComplete !== undefined) {
    tweenRecord.onComplete = config.onComplete;
  }
  motionTweenRecords.set(tween, tweenRecord);
  return tween;
}

/** Removes `tween` from its manager (deferred to step end mid-update), then destroys it. */
function discardTween(tween: Phaser.Tweens.Tween): void {
  tween.remove();
  tween.destroy();
}

/** Snaps one recorded tween to its end values and runs its completion callback. */
function settleMotionTween(tween: Phaser.Tweens.Tween, tweenRecord: MotionTweenRecord): void {
  motionTweenRecords.delete(tween);
  discardTween(tween);
  for (const target of tweenRecord.targets) {
    Object.assign(target, tweenRecord.props);
  }
  tweenRecord.onComplete?.();
}

/**
 * Finishes every live motion tween in `scene` at once: each target gets its
 * end values and each `onComplete` runs exactly once. Tweens not added with
 * `addMotionTween` are left alone. Works while the tween manager is paused.
 *
 * This does not use Phaser's own finishing calls, because in Phaser 3.90:
 * - `Tween.complete()` runs `onComplete` without setting the end values.
 * - A `TweenData` end value stays 0 until the tween's first update, so a
 *   tween that has not ticked yet has no end values to jump to.
 * - A silent `seek()` to the end drops `onComplete`.
 *
 * The tween is removed from its manager before it is destroyed. `destroy()`
 * alone (as `killTweensOf` does) leaves it in the manager list until the next
 * unpaused step.
 */
export function settleMotionTweens(scene: Phaser.Scene): void {
  for (const tween of scene.tweens.getTweens()) {
    const tweenRecord = motionTweenRecords.get(tween);
    if (tweenRecord === undefined) {
      continue;
    }
    if (tween.isDestroyed() || tween.isPendingRemove() || tween.isFinished()) {
      continue;
    }
    settleMotionTween(tween, tweenRecord);
  }
}
