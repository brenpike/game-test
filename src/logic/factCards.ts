import { inSafeArea, type Point, type SafeArea } from './zone';

/** A Collection Book fact card. */
export interface FactCard {
  id: string;
  name: string;
  title: string;
  body: string;
  /** Collection Book hint while the card is not found; absent means the habitat rule decides. */
  unfoundHint?: string;
}

/** The tilapia fact card, shown the first time the axolotl meets a tilapia. */
export const TILAPIA_FACT: Readonly<FactCard> = Object.freeze({
  id: 'tilapia',
  name: 'Tilapia',
  title: 'Meet the tilapia',
  body: 'Tilapia are fish that people brought to Xochimilco. They do not belong there. They eat axolotl eggs and food.',
});

/**
 * The boy or girl fact card, always found in the Collection Book (PRD C14).
 * Source: Animal Diversity Web, https://animaldiversity.org/accounts/Ambystoma_mexicanum/
 */
export const BOY_OR_GIRL_FACT: Readonly<FactCard> = Object.freeze({
  id: 'boyOrGirl',
  name: 'Boy or girl?',
  title: 'Boy or girl?',
  body: 'Grown-up boy axolotls are longer and slimmer, with a bigger bump by the back legs. Girls are rounder and plumper.',
});

/**
 * The plastic worm fact card, shown the first time the axolotl meets a plastic worm (PRD C13).
 * Source (owner to review): NOAA Marine Debris Program, https://marinedebris.noaa.gov/why-marine-debris-problem/ingestion
 */
export const PLASTIC_WORM_FACT: Readonly<FactCard> = Object.freeze({
  id: 'plastic-worm',
  name: 'Plastic worm',
  title: 'Plastic is not food',
  body: 'Bits of plastic in the water can look like food. Animals sometimes eat them by mistake, and it makes them feel sick. Keeping rubbish out of the water helps.',
});

/**
 * The heron fact card, shown the first time the axolotl meets a heron (PRD C13).
 * Sources, checked 2026-10-22 (web research only; the game fetches nothing):
 * National Audubon Society, Guide to North American Birds, Great Egret,
 * https://www.audubon.org/field-guide/bird/great-egret ("Forages mostly by standing or walking in
 * shallow water, waiting for fish to come near, then catching them with rapid thrust of bill");
 * National Audubon Society, Guide to North American Birds, Great Blue Heron,
 * https://www.audubon.org/field-guide/bird/great-blue-heron ("Forages mostly by standing still or
 * walking very slowly in shallow water, waiting for fish to swim near, then striking with a rapid
 * thrust of the bill."). Herons around Xochimilco's canals: owner to verify against a Xochimilco
 * bird list (for example CONABIO or the Parque Ecologico de Xochimilco); not checked.
 */
export const HERON_FACT: Readonly<FactCard> = Object.freeze({
  id: 'heron',
  name: 'Heron',
  title: 'Meet the heron',
  body: "Herons are tall birds that live around Xochimilco's canals. They stand very still and watch the water for food. Axolotls are safer down deep, away from the surface.",
});

/**
 * The ghost net fact card, shown the first time the axolotl meets a ghost net (PRD C13).
 * Sources (owner to verify): NOAA Marine Debris Program, "Increasing the Efficiency of Locating and
 * Removing Ghost Nets in the Upper Great Lakes",
 * https://marinedebris.noaa.gov/removal/increasing-efficiency-locating-and-removing-ghost-nets-upper-great-lakes
 * (ghost nets "can continue to entrap fish, other marine life, and even waterfowl"; a ghost net
 * removal program in Lake Superior) ; NOAA Marine Debris Program, "Removing and Preventing Derelict
 * Fishing Gear and Large Debris Nationwide",
 * https://marinedebris.noaa.gov/removal/removing-and-preventing-derelict-fishing-gear-and-large-debris-nationwide
 * (derelict gear "continues to entangle, trap, and kill marine animals after it is lost in the
 * environment"; removal from "our ocean and waterways"). Neither page names canals.
 */
export const GHOST_NET_FACT: Readonly<FactCard> = Object.freeze({
  id: 'ghost-net',
  name: 'Ghost net',
  title: 'Lost fishing nets',
  body: 'Old fishing nets that get lost in the water can tangle up animals. People pull them out of canals and lakes to keep animals safe.',
});

/**
 * The axolotl refuges fact card, found on a visit to the refuge (PRD C14).
 * Sources (owner to verify): Tec Science (Tec de Monterrey), "How to Save the mexican Axolotl? Start
 * by Restoring Their Home", 2025-01-31, https://tecscience.tec.mx/en/biotechnology/how-to-save-the-axolotl ;
 * The Wildlife Society, "Creating refuges for axolotls in Mexico City", 2021-12-06,
 * https://wildlife.org/creating-refuges-for-axolotls-in-mexico-city/ (Zambrano et al., Aquatic
 * Conservation, doi:10.1002/aqc.3520).
 */
export const AXOLOTL_REFUGES_FACT: Readonly<FactCard> = Object.freeze({
  id: 'axolotl-refuges',
  name: 'Axolotl refuges',
  title: 'Axolotl refuges',
  body: 'In Xochimilco, people make safe canals for axolotls next to chinampa gardens. Filters of volcanic rock let water in but keep big fish like tilapia out.',
  unfoundHint: 'Visit the refuge to find this card.',
});

/**
 * The canal clean-ups fact card, found on a visit to the refuge once an area is beaten (PRD C14).
 * Sources (owner to verify): EU Delegation to Mexico, "Clean-up activity in Xochimilco, Mexico City,
 * as part of the #EUBeachCleanup campaign", 27.09.2021,
 * https://www.eeas.europa.eu/delegations/mexico/clean-activity-xochimilco-mexico-city-part-eubeachcleanup-campaign_en ;
 * AFP via The Jakarta Post, "Mexican kayaker on mission to clean up floating gardens", 2022-02-04,
 * https://www.thejakartapost.com/culture/2022/02/04/mexican-kayaker-on-mission-to-clean-up-floating-gardens .
 */
export const CANAL_CLEAN_UPS_FACT: Readonly<FactCard> = Object.freeze({
  id: 'canal-clean-ups',
  name: 'Canal clean-ups',
  title: 'Canal clean-ups',
  body: 'People in Xochimilco pull rubbish, like plastic bottles, out of the canals. Keeping the water clean helps keep axolotls safe.',
  unfoundHint: 'Beat an area, then visit the refuge to find this card.',
});

/** The refuge fact cards, in Collection Book order: the axolotl refuges, then the canal clean-ups. */
export const REFUGE_FACT_CARDS: readonly Readonly<FactCard>[] = Object.freeze([AXOLOTL_REFUGES_FACT, CANAL_CLEAN_UPS_FACT]);

/**
 * The refuge fact cards to show now, in REFUGE_FACT_CARDS order: each not yet in `found`, the canal
 * clean-ups card only when `clearedTrashShown` (the refuge shows the trash cleared).
 */
export function refugeFactCardsDue(found: readonly string[], clearedTrashShown: boolean): Readonly<FactCard>[] {
  return REFUGE_FACT_CARDS.filter(
    (card) => !found.includes(card.id) && (clearedTrashShown || card.id !== CANAL_CLEAN_UPS_FACT.id),
  );
}

/** Label of the button that closes a fact card. */
export const FACT_CARD_OK_LABEL = 'OK';

/** Collection Book hint of a fact card not yet found, naming the place to explore. */
export function unfoundFactCardHint(place: string): string {
  return `Explore ${place} to find this card.`;
}

/** Collection Book hint of a fact card not yet found in the canal. */
export const FACT_CARD_UNFOUND_HINT = unfoundFactCardHint('the canal');

/**
 * Centre distance in px within which the axolotl meets a tilapia. Provisional; tune in play.
 * Larger than the tilapia lunge range so the card can show before the first lunge.
 */
export const TILAPIA_MEET_RANGE = 180;

/**
 * Centre distance in px from the heron's position within which the axolotl meets a heron. The heron
 * is always shown (no shadow cycle any more, issue #111). Provisional; tune in play. The same as the
 * tilapia's, and larger than the heron's 110 px reach so the card can show before the first strike.
 */
export const HERON_MEET_RANGE = 180;

/**
 * Whether the axolotl at `pos` meets a tilapia: `pos` is outside the safe area (edges count as
 * inside) and some tilapia centre is within `range` (inclusive).
 */
export function meetsTilapia(
  pos: Point,
  tilapias: readonly { pos: Point }[],
  safeArea: SafeArea,
  range = TILAPIA_MEET_RANGE,
): boolean {
  if (inSafeArea(pos, safeArea)) return false;
  return tilapias.some((tilapia) => Math.hypot(tilapia.pos.x - pos.x, tilapia.pos.y - pos.y) <= range);
}

/**
 * One hazard or predator as the axolotl sees it: its id, its distance in px from the axolotl (as
 * that threat measures it) and the range within which the axolotl meets it.
 */
export interface ThreatSighting {
  id: string;
  distance: number;
  meetRange: number;
}

/**
 * Ids of the threats the axolotl at `pos` meets: none inside the safe area (edges count as inside),
 * else each sighting within its meet range (inclusive), each id once, in sighting order.
 */
export function metThreatIds(pos: Point, safeArea: SafeArea, sightings: readonly ThreatSighting[]): string[] {
  if (inSafeArea(pos, safeArea)) return [];
  const metIds: string[] = [];
  for (const sighting of sightings) {
    if (sighting.distance <= sighting.meetRange && !metIds.includes(sighting.id)) metIds.push(sighting.id);
  }
  return metIds;
}
