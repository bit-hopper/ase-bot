export const ZODIAC_SIGNS = [
  "aries",
  "taurus",
  "gemini",
  "cancer",
  "leo",
  "virgo",
  "libra",
  "scorpio",
  "sagittarius",
  "capricorn",
  "aquarius",
  "pisces",
] as const;

export type ZodiacSign = (typeof ZODIAC_SIGNS)[number];

export const ELEMENTS = ["fire", "earth", "air", "water"] as const;
export type Element = (typeof ELEMENTS)[number];

export const MODALITIES = ["cardinal", "fixed", "mutable"] as const;
export type Modality = (typeof MODALITIES)[number];

export const PLANETS = [
  "sun",
  "moon",
  "mercury",
  "venus",
  "mars",
  "jupiter",
  "saturn",
  "uranus",
  "neptune",
  "pluto",
] as const;

export type Planet = (typeof PLANETS)[number];

export const TAROT_SUITS = ["wands", "cups", "swords", "pentacles"] as const;
export type TarotSuit = (typeof TAROT_SUITS)[number];

export const COURT_RANKS = ["page", "knight", "queen", "king"] as const;
export type CourtRank = (typeof COURT_RANKS)[number];

export type Decan = 1 | 2 | 3;

export const CARD_ORIENTATIONS = ["upright", "reversed"] as const;
export type CardOrientation = (typeof CARD_ORIENTATIONS)[number];

/** §8.2 / §9.1 — the 6 relationship-type values used both by the Reading Composer's
 *  relationship matrix and as one of the Template Renderer's 3 selection axes. */
export const RELATIONSHIP_TYPES = ["amplification", "resonance", "harmony", "polarity", "tension", "neutral"] as const;
export type RelationshipType = (typeof RELATIONSHIP_TYPES)[number];

export type MoonPhase =
  | "new_moon"
  | "waxing_crescent"
  | "first_quarter"
  | "waxing_gibbous"
  | "full_moon"
  | "waning_gibbous"
  | "last_quarter"
  | "waning_crescent"
  | "dark_moon";

/** A single entry in the 36-decan matrix (§15.4). Degrees are sign-relative decimal degrees. */
export interface DecanEntry {
  sign: ZodiacSign;
  decan: Decan;
  /** Inclusive lower bound, sign-relative decimal degrees (0-30). */
  degreeStart: number;
  /** Exclusive upper bound, sign-relative decimal degrees (0-30). Half-open interval so that
   *  9°59'59" belongs to decan 1 and 10°00'00" belongs to decan 2, per spec §5.2. */
  degreeEnd: number;
  chaldeanRuler: Planet;
  cardKey: string;
  cardName: string;
  suit: TarotSuit;
  number: number; // 2-10
  uprightMeaning: string;
  reversedMeaning: string;
}

export interface TarotCardMeta {
  key: string;
  name: string;
  type: "major" | "minor";
  suit: TarotSuit | null;
  element: Element | null;
  /** Roman-numeral rank 0-21 for Major Arcana, else null. */
  arcanaNumber: number | null;
  /** 1 (Ace) - 10 for pip cards, else null for court cards and Major Arcana. */
  number: number | null;
  courtRank: CourtRank | null;
  /** Chaldean decan ruler — populated for the 36 pip cards only (§15.4).
   *  Aces, Court cards, and Major Arcana have no decan ruler; orientation logic
   *  for those falls through to the 50/50 CSPRNG case in §7.3. */
  decanRuler: Planet | null;
  /** Verbatim reading text for /pull (§9.4). Filled in by the content-authoring track;
   *  null until authored. */
  uprightMeaning: string | null;
  reversedMeaning: string | null;
}
