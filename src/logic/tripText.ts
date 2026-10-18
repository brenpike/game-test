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

const FIND_NAMES: Readonly<Record<string, readonly [singular: string, plural: string]>> = {
  pebble: ['shiny pebble', 'shiny pebbles'],
};

const UNKNOWN_FIND_NAME: readonly [singular: string, plural: string] = ['find', 'finds'];

/** Why the home screen is showing: the player chose to go home, or a bubble carried them. */
export type HomeScreenReason = 'wentHome' | 'carriedHome';

/** Everything the home screen needs to describe how the trip ended. */
export interface HomeScreenInput {
  reason: HomeScreenReason;
  returnedKinds: readonly string[];
  bankedThisTripKinds: readonly string[];
  bankedTotal: number;
}

/** Text for the end-of-trip home screen. */
export interface HomeScreenText {
  title: string;
  body: string;
  bankedLine: string;
  button: string;
}

/** Display name of a find kind, singular when count is 1, plural otherwise. */
export function findName(kind: string, count: number): string {
  const [singular, plural] = FIND_NAMES[kind] ?? UNKNOWN_FIND_NAME;
  return count === 1 ? singular : plural;
}

function countKinds(kinds: readonly string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const kind of kinds) counts.set(kind, (counts.get(kind) ?? 0) + 1);
  return counts;
}

function joinWithAnd(parts: readonly string[]): string {
  if (parts.length <= 1) return parts.join('');
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

/** Describes a list of finds grouped by kind in first-seen order, e.g. "3 shiny pebbles". */
export function describeFinds(kinds: readonly string[]): string {
  if (kinds.length === 0) return 'no finds';
  const parts = [...countKinds(kinds)].map(
    ([kind, count]) => `${count} ${findName(kind, count)}`,
  );
  return joinWithAnd(parts);
}

/** Short Trip Bag status: warns that carried finds are not safe yet. */
export function tripBagStatus(count: number): string {
  return count > 0 ? NOT_SAFE_YET : EMPTY_BAG_STATUS;
}

function bankedTotalLine(total: number): string {
  if (total === 0) return 'No finds at the Home Spot yet.';
  const [singular, plural] = UNKNOWN_FIND_NAME;
  return `You have ${total} ${total === 1 ? singular : plural} safe at the Home Spot.`;
}

/** Body of the banking card: what was just banked and the Home Spot total. */
export function bankedBody(kinds: readonly string[], total: number): string {
  const totalLine = bankedTotalLine(total);
  if (kinds.length === 0) return `Nothing new to bring in. ${totalLine}`;
  const verb = kinds.length === 1 ? 'is' : 'are';
  return `${describeFinds(kinds)} ${verb} safe now! ${totalLine}`;
}

function returnedSentence(returnedKinds: readonly string[]): string {
  if (returnedKinds.length === 0) return 'Nothing was lost.';
  return `${describeFinds(returnedKinds)} went back to where you found them.`;
}

function carriedHomeBody(returnedKinds: readonly string[]): string {
  return (
    `${TRIP_END_BODY} ${returnedSentence(returnedKinds)} ` +
    'Finds at the Home Spot are always safe.'
  );
}

function wentHomeBody(bankedThisTripKinds: readonly string[]): string {
  if (bankedThisTripKinds.length === 0) return 'You swam home safe and sound.';
  return `You swam home safe and sound. This trip you brought home ${describeFinds(bankedThisTripKinds)}.`;
}

/** Builds the end-of-trip home screen text for going home or being carried home. */
export function homeScreenText(input: HomeScreenInput): HomeScreenText {
  const isCarried = input.reason === 'carriedHome';
  return {
    title: isCarried ? TRIP_END_TITLE : WENT_HOME_TITLE,
    body: isCarried
      ? carriedHomeBody(input.returnedKinds)
      : wentHomeBody(input.bankedThisTripKinds),
    bankedLine: bankedTotalLine(input.bankedTotal),
    button: SWIM_AGAIN_LABEL,
  };
}
