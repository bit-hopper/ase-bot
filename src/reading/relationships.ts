import type { RelationshipType, ZodiacSign } from "../data/types.js";
import { elementsAreComplementary } from "../data/suits.js";
import { oppositeSign, squareSigns, ZODIAC } from "../data/zodiac.js";

/**
 * §8.2 lists its 6 rules in an order that, read as sequential first-match-wins
 * priority (same as the Impact Score / orientation precedence rules elsewhere in
 * the spec), makes "Opposing sign -> Polarity" unreachable: every opposition pair
 * is *also* a complementary-element pair (that's true for all 6 oppositions in the
 * zodiac), so if "Complementary element -> Harmony" is checked first, Polarity can
 * never fire — yet the spec's own worked example (Leo <-> Aquarius) is both an
 * opposition AND fire/air-complementary, and relationship_type's enum requires all
 * 6 values to be reachable (§9.1's 432-template count depends on it). The fix:
 * check the more specific sign-pair relationships (same sign, opposition, square)
 * before the more generic element-level ones (same element, complementary
 * element) — this makes every category reachable and matches both worked examples
 * (Leo<->Aquarius = Polarity, Leo<->Taurus = Tension) without contradiction.
 */
export function classifySignRelationship(userSign: ZodiacSign, currentSign: ZodiacSign): RelationshipType {
  if (userSign === currentSign) return "amplification";
  if (oppositeSign(userSign) === currentSign) return "polarity";
  if (squareSigns(userSign).includes(currentSign)) return "tension";

  const userElement = ZODIAC[userSign].element;
  const currentElement = ZODIAC[currentSign].element;
  if (userElement === currentElement) return "resonance";
  if (elementsAreComplementary(userElement, currentElement)) return "harmony";

  return "neutral";
}

const RELATIONSHIP_LABELS: Record<RelationshipType, string> = {
  amplification: "Amplification",
  resonance: "Resonance",
  harmony: "Harmony",
  polarity: "Polarity",
  tension: "Tension",
  neutral: "Neutral",
};

export function relationshipLabel(type: RelationshipType): string {
  return RELATIONSHIP_LABELS[type];
}

function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** §8.1 example: "Leo in Leo Season → amplification". Used for sunToCurrentSign / moonToCurrentSign / risingToCurrentSign. */
export function describeSignToCurrentSeason(userSign: ZodiacSign, currentSign: ZodiacSign): string {
  const type = classifySignRelationship(userSign, currentSign);
  return `${titleCase(userSign)} in ${titleCase(currentSign)} Season → ${type}`;
}

const ELEMENT_VERB: Record<"same" | "complementary" | "friction", string> = {
  same: "amplifies",
  complementary: "harmonizes with",
  friction: "challenges",
};

/** §8.1 example: "Fire amplifies Fire". Compares the user's Sun element against the current season's element. */
export function describeElementRelationship(userSunSign: ZodiacSign, currentSign: ZodiacSign): string {
  const userElement = ZODIAC[userSunSign].element;
  const currentElement = ZODIAC[currentSign].element;

  const kind = userElement === currentElement ? "same" : elementsAreComplementary(userElement, currentElement) ? "complementary" : "friction";

  return `${titleCase(userElement)} ${ELEMENT_VERB[kind]} ${titleCase(currentElement)}`;
}

/**
 * §8.1 example: "Fixed × Mutable = tension". The spec gives only this one of the 6 unique
 * modality-pair combinations; the rest are filled with a matching thematic word — these are
 * decorative flavor text (no §9.1 interpolation slot actually consumes this field), so exact
 * wording is low-stakes, same caveat as the template library's authored prose.
 */
const MODALITY_PAIR_WORD: Record<string, string> = {
  "cardinal:cardinal": "drive",
  "fixed:fixed": "stability",
  "mutable:mutable": "flux",
  "cardinal:fixed": "momentum",
  "cardinal:mutable": "initiative",
  "fixed:mutable": "tension",
};

export function describeModalityNote(userSunSign: ZodiacSign, currentSign: ZodiacSign): string {
  const a = ZODIAC[userSunSign].modality;
  const b = ZODIAC[currentSign].modality;
  const key = [a, b].sort().join(":");
  return `${titleCase(a)} × ${titleCase(b)} = ${MODALITY_PAIR_WORD[key]}`;
}
