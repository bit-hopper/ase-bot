import { ACES, COURT_CARDS } from "./courtCards.js";
import { DECAN_MATRIX } from "./decans.js";
import { MAJOR_ARCANA } from "./majorArcana.js";
import { SUIT_ELEMENT } from "./suits.js";
import type { TarotCardMeta } from "./types.js";

const majorCards: TarotCardMeta[] = MAJOR_ARCANA.map((m) => ({
  key: m.key,
  name: m.name,
  type: "major",
  suit: null,
  element: null,
  arcanaNumber: m.arcanaNumber,
  number: null,
  courtRank: null,
  decanRuler: null,
  uprightMeaning: m.uprightMeaning,
  reversedMeaning: m.reversedMeaning,
}));

// Dedup pip cards: the 36 decan rows each map 1:1 to a distinct card (2-10 x 4 suits = 36).
const pipCards: TarotCardMeta[] = DECAN_MATRIX.map((d) => ({
  key: d.cardKey,
  name: d.cardName,
  type: "minor",
  suit: d.suit,
  element: SUIT_ELEMENT[d.suit],
  arcanaNumber: null,
  number: d.number,
  courtRank: null,
  decanRuler: d.chaldeanRuler,
  uprightMeaning: d.uprightMeaning,
  reversedMeaning: d.reversedMeaning,
}));

const aceCards: TarotCardMeta[] = ACES.map((a) => ({
  key: a.key,
  name: a.name,
  type: "minor",
  suit: a.suit,
  element: SUIT_ELEMENT[a.suit],
  arcanaNumber: null,
  number: 1,
  courtRank: null,
  decanRuler: null,
  uprightMeaning: a.uprightMeaning,
  reversedMeaning: a.reversedMeaning,
}));

const courtCards: TarotCardMeta[] = COURT_CARDS.map((c) => ({
  key: c.key,
  name: c.name,
  type: "minor",
  suit: c.suit,
  element: SUIT_ELEMENT[c.suit],
  arcanaNumber: null,
  number: null,
  courtRank: c.rank,
  decanRuler: null,
  uprightMeaning: c.uprightMeaning,
  reversedMeaning: c.reversedMeaning,
}));

export const MAJOR_ARCANA_CARDS: TarotCardMeta[] = majorCards;
export const MINOR_ARCANA_CARDS: TarotCardMeta[] = [...pipCards, ...aceCards, ...courtCards];
export const FULL_DECK: TarotCardMeta[] = [...MAJOR_ARCANA_CARDS, ...MINOR_ARCANA_CARDS];

if (MAJOR_ARCANA_CARDS.length !== 22) {
  throw new Error(`Expected 22 Major Arcana cards, got ${MAJOR_ARCANA_CARDS.length}`);
}
if (MINOR_ARCANA_CARDS.length !== 56) {
  throw new Error(`Expected 56 Minor Arcana cards, got ${MINOR_ARCANA_CARDS.length}`);
}
if (FULL_DECK.length !== 78) {
  throw new Error(`Expected 78 cards in the full deck, got ${FULL_DECK.length}`);
}

const byKey = new Map(FULL_DECK.map((c) => [c.key, c]));

export function findCardByKey(key: string): TarotCardMeta {
  const card = byKey.get(key);
  if (!card) throw new Error(`Unknown card key: ${key}`);
  return card;
}
