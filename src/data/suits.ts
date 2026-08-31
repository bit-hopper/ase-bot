import type { Element, TarotSuit, ZodiacSign } from "./types.js";

/** §15.3 — Minor Arcana suit-to-element correspondences. */
export const SUIT_ELEMENT: Record<TarotSuit, Element> = {
  wands: "fire",
  swords: "air",
  cups: "water",
  pentacles: "earth",
};

/** §15.3 — signs belonging to each suit's element. */
export const SUIT_SIGNS: Record<TarotSuit, ZodiacSign[]> = {
  wands: ["aries", "leo", "sagittarius"],
  swords: ["gemini", "libra", "aquarius"],
  cups: ["cancer", "scorpio", "pisces"],
  pentacles: ["taurus", "virgo", "capricorn"],
};

/** §8.2 — element complementarity for the Reading Composer relationship matrix. */
export const ELEMENT_COMPLEMENTS: Record<Element, Element> = {
  fire: "air",
  air: "fire",
  earth: "water",
  water: "earth",
};

export function elementsAreComplementary(a: Element, b: Element): boolean {
  return ELEMENT_COMPLEMENTS[a] === b;
}
