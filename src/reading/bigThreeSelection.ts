import { houseDomain, type HouseDomain } from "../data/houseDomains.js";
import { majorArcanaBySign, type MajorArcanaEntry } from "../data/majorArcana.js";
import { rulingPlanetOf } from "../data/rulingPlanet.js";
import type { Planet, ZodiacSign } from "../data/types.js";
import type { NatalPlacements } from "../tarot/natal.js";
import type { TransitSnapshot } from "../tarot/readingSelection.js";
import { houseOf } from "./houseSystem.js";
import type { MoodConnectorKey, ThemeConnectorKey } from "./readingConnectors.js";
import { classifySignRelationship } from "./relationships.js";

export interface GroundSelection {
  rulingPlanet: Planet;
  rulingPlanetSign: ZodiacSign;
  house: number;
  domain: HouseDomain;
}

export interface BigThreeSelection {
  card: MajorArcanaEntry;
  currentSunSign: ZodiacSign;
  currentMoonSign: ZodiacSign;
  themeRelationship: ThemeConnectorKey;
  moodRelationship: MoodConnectorKey;
  /** null when the user has set neither Rising nor Sun — no anchor sign to build a house
   *  system from (spec §6.9's "Ground" axis). */
  ground: GroundSelection | null;
}

/**
 * The /reading's "Big Three" formula (spec §6.7-6.9): Sun -> theme card,
 * personalized by comparing the live transiting Sun to the natal Sun; Moon -> mood, same
 * mechanism; ruling planet (from Rising, falling back to Sun) -> live Whole Sign House placement
 * -> life domain. Pure function — no I/O, easy to test against fixed positions/natal input.
 */
export function selectBigThree(positions: Record<Planet, TransitSnapshot>, natal: NatalPlacements): BigThreeSelection {
  const currentSunSign = positions.sun.sign;
  const currentMoonSign = positions.moon.sign;

  const card = majorArcanaBySign(currentSunSign);

  const themeRelationship: ThemeConnectorKey = natal.sun ? classifySignRelationship(natal.sun, currentSunSign) : "noNatalSun";
  const moodRelationship: MoodConnectorKey = natal.moon ? classifySignRelationship(natal.moon, currentMoonSign) : "noNatalMoon";

  const anchorSign = natal.rising ?? natal.sun;
  let ground: GroundSelection | null = null;
  if (anchorSign) {
    const rulingPlanet = rulingPlanetOf(anchorSign);
    const rulingPlanetSign = positions[rulingPlanet].sign;
    const house = houseOf(anchorSign, rulingPlanetSign);
    ground = { rulingPlanet, rulingPlanetSign, house, domain: houseDomain(house) };
  }

  return { card, currentSunSign, currentMoonSign, themeRelationship, moodRelationship, ground };
}
