/** Label next to the four leg icons in the legs display. */
export const LEGS_LABEL = 'Legs';

/** Title of the card shown after the axolotl is carried home. */
export const TRIP_END_TITLE = 'Carried home!';

/** Body of the carried-home card: kind, short, and readable by an 8-year-old. */
export const TRIP_END_BODY =
  'A big bubble floated you home. You are safe, and all four legs grew back. ' +
  'You kept every snack you ate.';

/** Button on the tank arrival card that closes it and shows the Home Tank. */
export const ARRIVAL_OK_LABEL = 'OK';

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

/** HUD banner shown once every snack in the pond has been eaten. */
export const ALL_SNACKS_BANNER = 'Yum! You found every snack!';

/** Title of the card shown after choosing to go home. */
export const WENT_HOME_TITLE = 'Welcome home!';

const EMPTY_BAG_STATUS = 'empty';

const MAX_LISTED_NAMES = 3;

/** Why the tank arrival card is showing: the player chose to go home, or a bubble carried them. */
export type ArrivalReason = 'wentHome' | 'carriedHome';

/** Everything the tank arrival card needs to describe how the trip ended. */
export interface ArrivalInput {
  reason: ArrivalReason;
  returnedNames: readonly string[];
  bankedThisTripNames: readonly string[];
  bankedTotal: number;
}

/** Text for the tank arrival card shown in the Home Tank after a trip. */
export interface ArrivalText {
  title: string;
  body: string;
  shortBody: string;
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

/** Short body of the banking card: counts treasures instead of naming them. */
export function bankedBodyShort(count: number, total: number): string {
  const totalLine = bankedTotalLine(total);
  if (count === 0) return `Nothing new to bring in. ${totalLine}`;
  if (count === 1) return `Your treasure is safe now! ${totalLine}`;
  return `${count} treasures are safe now! ${totalLine}`;
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

const CARRIED_HOME_SHORT_OPENING = 'A big bubble floated you home. You are safe!';

const WENT_HOME_SHORT_OPENING = 'You swam home safe and sound.';

function carriedHomeShortBody(returnedCount: number): string {
  if (returnedCount === 0) return `${CARRIED_HOME_SHORT_OPENING} Nothing was lost.`;
  if (returnedCount === 1) {
    return `${CARRIED_HOME_SHORT_OPENING} Your treasure floated off. Look for it next trip!`;
  }
  return `${CARRIED_HOME_SHORT_OPENING} ${returnedCount} treasures floated off. Look for them next trip!`;
}

function wentHomeShortBody(bankedCount: number): string {
  if (bankedCount === 0) return WENT_HOME_SHORT_OPENING;
  if (bankedCount === 1) return `${WENT_HOME_SHORT_OPENING} You brought home 1 treasure.`;
  return `${WENT_HOME_SHORT_OPENING} You brought home ${bankedCount} treasures.`;
}

/** Builds the tank arrival card text for going home or being carried home. */
export function arrivalText(input: ArrivalInput): ArrivalText {
  const isCarried = input.reason === 'carriedHome';
  return {
    title: isCarried ? TRIP_END_TITLE : WENT_HOME_TITLE,
    body: isCarried
      ? carriedHomeBody(input.returnedNames)
      : wentHomeBody(input.bankedThisTripNames),
    shortBody: isCarried
      ? carriedHomeShortBody(input.returnedNames.length)
      : wentHomeShortBody(input.bankedThisTripNames.length),
    bankedLine: bankedTotalLine(input.bankedTotal),
    button: ARRIVAL_OK_LABEL,
  };
}
