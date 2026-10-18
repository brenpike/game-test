/** Label next to the four leg icons in the legs display. */
export const LEGS_LABEL = 'Legs';

/** Title of the card shown after the axolotl is carried home. */
export const TRIP_END_TITLE = 'Carried home!';

/** Body of the carried-home card: kind, short, and readable by an 8-year-old. */
export const TRIP_END_BODY =
  'A big bubble floated you home. You are safe, and all four legs grew back. ' +
  'You kept every snack you ate.';

/** Button on the carried-home card that starts a new trip. */
export const SWIM_AGAIN_LABEL = 'Swim again';

/** Label on the HUD Trip Bag display. */
export const TRIP_BAG_LABEL = 'Trip Bag';

/** Status shown next to a Trip Bag that holds finds. */
export const NOT_SAFE_YET = 'not safe yet';

/** Title of the celebration card shown after banking finds at the Home Spot. */
export const BANKED_TITLE = 'Safe at the Home Spot!';

/** Button on the banking card that goes back to swimming. */
export const KEEP_EXPLORING_LABEL = 'Keep exploring';

/** Button on the banking card that ends the trip at the Home Spot. */
export const GO_HOME_LABEL = 'Go home';

/** Hint that teaches how banking works. */
export const BANKING_HINT = 'Bring finds to the Home Spot to keep them safe.';

/** Title of the card shown after choosing to go home. */
export const WENT_HOME_TITLE = 'Welcome home!';

const EMPTY_BAG_STATUS = 'empty';

const MAX_LISTED_NAMES = 3;

/** Why the home screen is showing: the player chose to go home, or a bubble carried them. */
export type HomeScreenReason = 'wentHome' | 'carriedHome';

/** Everything the home screen needs to describe how the trip ended. */
export interface HomeScreenInput {
  reason: HomeScreenReason;
  returnedNames: readonly string[];
  bankedThisTripNames: readonly string[];
  bankedTotal: number;
}

/** Text for the end-of-trip home screen. */
export interface HomeScreenText {
  title: string;
  body: string;
  bankedLine: string;
  button: string;
}

function joinWithAnd(parts: readonly string[]): string {
  if (parts.length <= 1) return parts.join('');
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

/** Lists treasure names, e.g. "Sun hat and Pond plant"; past three it ends "and 2 more". */
export function describeTreasures(names: readonly string[]): string {
  if (names.length === 0) return 'no treasures';
  if (names.length <= MAX_LISTED_NAMES) return joinWithAnd(names);
  const listed = names.slice(0, MAX_LISTED_NAMES).join(', ');
  return `${listed} and ${names.length - MAX_LISTED_NAMES} more`;
}

/** Short Trip Bag status: warns that carried finds are not safe yet. */
export function tripBagStatus(count: number): string {
  return count > 0 ? NOT_SAFE_YET : EMPTY_BAG_STATUS;
}

function bankedTotalLine(total: number): string {
  if (total === 0) return 'No treasures at the Home Spot yet.';
  return `You have ${total} ${total === 1 ? 'treasure' : 'treasures'} safe at the Home Spot.`;
}

/** Body of the banking card: which treasures were just banked and the Home Spot total. */
export function bankedBody(names: readonly string[], total: number): string {
  const totalLine = bankedTotalLine(total);
  if (names.length === 0) return `Nothing new to bring in. ${totalLine}`;
  const verb = names.length === 1 ? 'is' : 'are';
  return `${describeTreasures(names)} ${verb} safe now! ${totalLine}`;
}

function returnedSentence(returnedNames: readonly string[]): string {
  if (returnedNames.length === 0) return 'Nothing was lost.';
  if (returnedNames.length === 1) {
    return `${returnedNames[0]} floated off to a new hiding spot. Look for it next trip!`;
  }
  return `${describeTreasures(returnedNames)} floated off to new hiding spots. Look for them next trip!`;
}

function carriedHomeBody(returnedNames: readonly string[]): string {
  return (
    `${TRIP_END_BODY} ${returnedSentence(returnedNames)} ` +
    'Treasures at the Home Spot are always safe.'
  );
}

function wentHomeBody(bankedThisTripNames: readonly string[]): string {
  if (bankedThisTripNames.length === 0) return 'You swam home safe and sound.';
  return `You swam home safe and sound. This trip you brought home ${describeTreasures(bankedThisTripNames)}.`;
}

/** Builds the end-of-trip home screen text for going home or being carried home. */
export function homeScreenText(input: HomeScreenInput): HomeScreenText {
  const isCarried = input.reason === 'carriedHome';
  return {
    title: isCarried ? TRIP_END_TITLE : WENT_HOME_TITLE,
    body: isCarried
      ? carriedHomeBody(input.returnedNames)
      : wentHomeBody(input.bankedThisTripNames),
    bankedLine: bankedTotalLine(input.bankedTotal),
    button: SWIM_AGAIN_LABEL,
  };
}
