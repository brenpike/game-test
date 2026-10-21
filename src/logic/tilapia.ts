import {
  TILAPIA_SPECIES,
  createPredator,
  stepPredator,
  type PredatorContext,
  type PredatorEvent,
  type PredatorPhase,
  type PredatorState,
  type PredatorStepResult,
} from './predators';
import type { TilapiaRoute } from './zone';

export { bumpImpulse, inLungeRange, lungeConnects, phaseProgress, touching } from './predators';
export { inSafeArea } from './zone';

export type TilapiaPhase = PredatorPhase;

/** Tilapia predator state; see `PredatorState`. */
export type TilapiaState = PredatorState;

/** Phase events emitted by `stepTilapia`; see `PredatorEvent`. */
export type TilapiaEvent = PredatorEvent;

/** World context a tilapia step needs; see `PredatorContext`. */
export type TilapiaContext = PredatorContext;

export type TilapiaStepResult = PredatorStepResult;

/** Creates a patrolling tilapia at the route's first waypoint, heading for the second. */
export function createTilapia(route: TilapiaRoute): TilapiaState {
  return createPredator(route, TILAPIA_SPECIES.id);
}

/** Advances the tilapia by `dt` seconds; see `stepPredator`. */
export const stepTilapia = stepPredator;
