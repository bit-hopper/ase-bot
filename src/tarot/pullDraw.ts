import { MAJOR_ARCANA_CARDS, MINOR_ARCANA_CARDS } from "../data/deck.js";
import type { TarotCardMeta } from "../data/types.js";
import { randomChoice, randomFloat } from "../random/csprng.js";

const MAJOR_ARCANA_PROBABILITY = 0.65;

/** §6.4 — /pull: 65% chance of a uniformly-picked Major Arcana card, else a uniformly-picked Minor Arcana card. True CSPRNG, not seeded. */
export function drawPullCard(): TarotCardMeta {
  return randomFloat() < MAJOR_ARCANA_PROBABILITY ? randomChoice(MAJOR_ARCANA_CARDS) : randomChoice(MINOR_ARCANA_CARDS);
}
