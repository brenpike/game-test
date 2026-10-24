import type { Point, SafeArea } from './zone';

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
 * The garter snake fact card, shown the first time the axolotl meets a garter snake (PRD C13).
 * Sources, checked 2026-10-23 (web research only; the game fetches nothing):
 * Manjarrez, Pacheco-Tinoco and Venegas-Barrera, "Intraspecific variation in the diet of the
 * Mexican garter snake Thamnophis eques", PeerJ 5:e4036 (2017), https://doi.org/10.7717/peerj.4036
 * (read as https://www.ebi.ac.uk/europepmc/webservices/rest/PMC5691781/fullTextXML; snakes sampled
 * at 23 sites on the Mexican Plateau; "This snake forages in vegetative cover along the shore";
 * "an attack may include a sudden lunge across the surface toward prey"; prey mostly fish, then
 * leeches, earthworms, frogs and tadpoles);
 * Manjarrez, Rivas-Gonzalez, Venegas-Barrera and Moyaho, "Visual Detection of Speckles in the Fish
 * Xenotoca variata by the Predatory Snake Thamnophis melanogaster in Water of Different Turbidity",
 * PLoS ONE 10(6):e0129429 (2015), https://doi.org/10.1371/journal.pone.0129429 (read as
 * https://www.ebi.ac.uk/europepmc/webservices/rest/PMC4465328/fullTextXML; T. melanogaster is
 * "endemic to the highlands of central Mexico" and "a specialist aquatic species in its diet and
 * foraging technique underwater");
 * The Reptile Database, Thamnophis melanogaster,
 * https://reptile-database.reptarium.cz/species?genus=Thamnophis&species=melanogaster (distribution
 * lists Distrito Federal, now Mexico City).
 * Owner to verify: "good swimmers" (the sources say they forage underwater, not how well they
 * swim); "Axolotls are safer down deep" is the game's rule (the snake strikes from the surface),
 * not checked against a source; garter snakes in Xochimilco itself, not checked.
 */
export const GARTER_SNAKE_FACT: Readonly<FactCard> = Object.freeze({
  id: 'garter-snake',
  name: 'Garter snake',
  title: 'Meet garter snakes',
  body: 'Garter snakes live near water in Mexico and are good swimmers. They hunt small animals near the surface. Axolotls are safer down deep.',
});

/**
 * The water hyacinth fact card, shown the first time the axolotl meets the hyacinth mats (PRD C13).
 * Sources, checked 2026-10-23 (web research only; the game fetches nothing):
 * Carrion, Ponce-de Leon, Cram, Sommer, Hernandez and Vanegas (UNAM), "Aprovechamiento potencial
 * del lirio acuatico (Eichhornia crassipes) en Xochimilco para fitorremediacion de metales",
 * Agrociencia 46(6), 2012,
 * https://www.scielo.org.mx/scielo.php?script=sci_arttext&pid=S1405-31952012000600007 (a pest "in
 * the canals of the Xochimilco Protected Natural Area"; it "se extiende rapidamente y forma tapetes
 * o esteras"; it "disminuye la entrada de luz y merma el oxigeno disuelto en el agua");
 * IUCN SSC Invasive Species Specialist Group, Global Invasive Species Database, Eichhornia crassipes,
 * https://www.iucngisd.org/gisd/species.php?sc=70 (populations "known to double in as little as 12
 * days"; "These mats shade out native submersed plant species");
 * Excelsior, "Arranca limpieza de canales en Xochimilco", 2020-08-31,
 * https://www.excelsior.com.mx/comunidad/arranca-limpieza-de-canales-en-xochimilco/1403028
 * (Xochimilco borough crews clear aquatic weeds from the canals by hand, with harvesters where the
 * water hyacinth is thickest);
 * LOS40 Mexico, "Con hechos, la Alcaldia Xochimilco recupera sus canales y genera empleos temporales
 * para la comunidad", 2025-06-27,
 * https://los40.com.mx/2025/06/27/con-hechos-la-alcaldia-xochimilco-recupera-sus-canales-y-genera-empleos-temporales-para-la-comunidad/
 * (the borough removed more than 200 cubic metres; in the rainy season it grows unchecked, blocks
 * the water and harms its oxygen).
 * Owner to verify: the clearing sources are news reports, not a CONABIO or borough page.
 */
export const WATER_HYACINTH_FACT: Readonly<FactCard> = Object.freeze({
  id: 'water-hyacinth',
  name: 'Water hyacinth',
  title: 'Water hyacinth',
  body: 'Water hyacinth is a floating plant that grows very fast. In Xochimilco it can cover the canals and block the light. People clear it out to keep the water healthy.',
});

/** The common carp fact card, shown the first time the axolotl meets a carp (PRD C13). */
export const CARP_FACT: Readonly<FactCard> = Object.freeze({
  id: 'carp',
  name: 'Common carp',
  title: 'Meet the carp',
  body: 'Common carp are big fish that people brought to Xochimilco. They dig in the mud for food and make the water cloudy. They also eat axolotl eggs.',
});

/** The punting pole fact card, shown the first time the axolotl meets a punting pole (PRD C13). */
export const PUNTING_POLE_FACT: Readonly<FactCard> = Object.freeze({
  id: 'punting-pole',
  name: 'Punting pole',
  title: 'Trajineras',
  body: 'Trajineras are bright, flat-bottomed boats on the canals of Xochimilco. A boater pushes each one along with a long pole that reaches down to the mud.',
});

/** The tadpole fact card, shown the first time the axolotl meets a tadpole (PRD C13). */
export const TADPOLE_FACT: Readonly<FactCard> = Object.freeze({
  id: 'tadpole',
  name: 'Tadpole',
  title: 'Meet the tadpole',
  body: 'Tadpoles are baby frogs. They swim by wiggling their tails, and they grow legs as they get bigger. Axolotls hunt small water animals like tadpoles.',
});

/** The freshwater shrimp fact card, shown the first time the axolotl meets a shrimp (PRD C13). */
export const SHRIMP_FACT: Readonly<FactCard> = Object.freeze({
  id: 'shrimp',
  name: 'Freshwater shrimp',
  title: 'Freshwater shrimp',
  body: 'Freshwater shrimp are tiny animals with many legs. When something comes near, they flick their tails and zip backward. Axolotls hunt small water animals like these.',
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
 * Centre distance in px from the garter snake's head within which the axolotl meets a garter snake.
 * Provisional; tune in play. The same as the tilapia's and the heron's, and larger than the snake's
 * 110 px lunge range so the card can show before the first dart.
 */
export const GARTER_SNAKE_MEET_RANGE = 180;

/**
 * Centre distance in px within which the axolotl meets a carp (PRD open question 253, ND-6).
 * Provisional; tune in play. The same as the tilapia's, and larger than the carp's 120 px lunge
 * range so the card can show before the first sweep.
 */
export const CARP_MEET_RANGE = 180;

/**
 * Centre distance in px from an uncollected tadpole, where it is drawn, within which the axolotl
 * meets a tadpole (PRD open question 276, ND-29). Provisional; tune in play.
 */
export const TADPOLE_MEET_RANGE = 120;

/**
 * Centre distance in px from an uncollected shrimp, where it is drawn, within which the axolotl
 * meets a shrimp (PRD open question 276, ND-29). Provisional; tune in play.
 */
export const SHRIMP_MEET_RANGE = 120;

/**
 * Whether a point lies inside the safe area (inclusive edges). Mirrors zone.ts `inSafeArea` so
 * factCards stays a leaf module with no runtime import: zone.ts loads movingHazards.ts, which
 * reads PUNTING_POLE_FACT from here while this module would still be loading.
 */
function isInSafeArea(point: Point, safeArea: SafeArea): boolean {
  return (
    point.x >= safeArea.x0 && point.x <= safeArea.x1 && point.y >= safeArea.y0 && point.y <= safeArea.y1
  );
}

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
  if (isInSafeArea(pos, safeArea)) return false;
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
  if (isInSafeArea(pos, safeArea)) return [];
  const metIds: string[] = [];
  for (const sighting of sightings) {
    if (sighting.distance <= sighting.meetRange && !metIds.includes(sighting.id)) metIds.push(sighting.id);
  }
  return metIds;
}
