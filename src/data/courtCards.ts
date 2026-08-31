import { COURT_RANKS, TAROT_SUITS, type CourtRank, type TarotSuit } from "./types.js";

export interface AceEntry {
  suit: TarotSuit;
  key: string;
  name: string;
  uprightMeaning: string;
  reversedMeaning: string;
}

export interface CourtCardEntry {
  suit: TarotSuit;
  rank: CourtRank;
  key: string;
  name: string;
  uprightMeaning: string;
  reversedMeaning: string;
}

function suitName(suit: TarotSuit): string {
  return suit.charAt(0).toUpperCase() + suit.slice(1);
}

function rankName(rank: CourtRank): string {
  return rank.charAt(0).toUpperCase() + rank.slice(1);
}

/** §9.4 /pull meanings, adapted from Waite's PKT Part III terse "Divinatory Meanings"/"Reversed"
 *  lines (the one section of Waite with ready-to-adapt, per-card reversed text), cross-checked
 *  against learntarot.com's upright keyword themes. Waite's Victorian moralizing register
 *  ("vice," "roguery," "prodigality") was deliberately translated into §9.5's warm/modern voice
 *  rather than kept close to source. */
const ACE_MEANINGS: Record<TarotSuit, { uprightMeaning: string; reversedMeaning: string }> = {
  wands: { uprightMeaning: "Creative spark, new enterprise, a beginning full of promise", reversedMeaning: "A spark that fizzles, joy clouding over" },
  cups: { uprightMeaning: "Overflowing joy, true-hearted abundance, emotional fulfillment", reversedMeaning: "Walls going up around the heart, emotional upheaval" },
  swords: { uprightMeaning: "Triumph, conquest, an excess of force behind a clear idea", reversedMeaning: "A breakthrough that backfires, force without restraint" },
  pentacles: { uprightMeaning: "Material contentment, prosperity, a seed of tangible gain", reversedMeaning: "Wealth's shadow side, prosperity without wisdom" },
};

/** The 4 Aces (§6.1). Not part of the 36-decan matrix — no Chaldean ruler. */
export const ACES: AceEntry[] = TAROT_SUITS.map((suit) => ({
  suit,
  key: `ace_of_${suit}`,
  name: `Ace of ${suitName(suit)}`,
  ...ACE_MEANINGS[suit],
}));

if (ACES.length !== 4) {
  throw new Error(`ACES must have exactly 4 entries, got ${ACES.length}`);
}

const COURT_MEANINGS: Record<CourtRank, Record<TarotSuit, { uprightMeaning: string; reversedMeaning: string }>> = {
  page: {
    wands: { uprightMeaning: "A faithful messenger, eager news, family loyalty", reversedMeaning: "Bad news, indecision, restless instability" },
    cups: { uprightMeaning: "A studious, gentle youth, tender news, reflective service", reversedMeaning: "Charm masking true feelings, mixed signals" },
    swords: { uprightMeaning: "Vigilance, quiet watchfulness, sharp examination", reversedMeaning: "Caught off guard, restless unease, news that surprises" },
    pentacles: { uprightMeaning: "Diligent study, careful management, grounded ambition", reversedMeaning: "Overspending, wasted indulgence, news that disappoints" },
  },
  knight: {
    wands: { uprightMeaning: "Departure, a friendly adventurer, change of residence", reversedMeaning: "A sudden break, discord, an interruption to the journey" },
    cups: { uprightMeaning: "Romantic invitation, graceful approach, an offer extended", reversedMeaning: "Charm without substance, an offer worth a second look" },
    swords: { uprightMeaning: "Bravery, decisive skill, a charge into opposition", reversedMeaning: "Rash moves, overreaching, energy spent carelessly" },
    pentacles: { uprightMeaning: "Steady reliability, dependable service, patient responsibility", reversedMeaning: "Inertia, stagnation, discouraged carelessness" },
  },
  queen: {
    wands: { uprightMeaning: "Warm hospitality, business success, magnetic devotion", reversedMeaning: "Warmth held back, jealousy, wandering attention" },
    cups: { uprightMeaning: "Devoted loving intelligence, visionary happiness, quiet virtue", reversedMeaning: "Trust misplaced, a warmth that isn't quite genuine" },
    swords: { uprightMeaning: "Clear-eyed independence born from hard experience, truths faced alone", reversedMeaning: "Sharp words, judgment turned unkind, guardedness curdling into coldness" },
    pentacles: { uprightMeaning: "Generous opulence, security, magnanimous ease", reversedMeaning: "Suspicion, mistrust, fear eroding generosity" },
  },
  king: {
    wands: { uprightMeaning: "Honest authority, a friendly leader, unexpected fortune", reversedMeaning: "Severity beneath tolerance, sternness overtaking warmth" },
    cups: { uprightMeaning: "Responsible goodwill, creative intelligence, diplomatic equity", reversedMeaning: "Composure slipping into deceit, trust broken at real cost" },
    swords: { uprightMeaning: "Clear authority, decisive judgment, command that others trust", reversedMeaning: "Authority turned harsh, judgment without mercy" },
    pentacles: { uprightMeaning: "Grounded success, practical wisdom, steady achievement", reversedMeaning: "Ambition curdling into excess, success built on shaky ground" },
  },
};

/**
 * The 16 Court cards (§6.1, §15.5). Not part of the 36-decan matrix — no Chaldean
 * ruler. §15.5 only documents a handful of rank/sign examples (full 16-card
 * modality-to-sign mapping is a v2 concern per spec — "Court cards appear
 * in /pull draws only in v1. They are not produced by the decan engine").
 */
export const COURT_CARDS: CourtCardEntry[] = TAROT_SUITS.flatMap((suit) =>
  COURT_RANKS.map((rank) => ({
    suit,
    rank,
    key: `${rank}_of_${suit}`,
    name: `${rankName(rank)} of ${suitName(suit)}`,
    ...COURT_MEANINGS[rank][suit],
  })),
);

if (COURT_CARDS.length !== 16) {
  throw new Error(`COURT_CARDS must have exactly 16 entries, got ${COURT_CARDS.length}`);
}
