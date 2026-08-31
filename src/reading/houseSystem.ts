import type { ZodiacSign } from "../data/types.js";
import { ZODIAC } from "../data/zodiac.js";

/**
 * Whole Sign House placement: which of the 12 houses `targetSign` falls in, counting the
 * anchor sign itself as House 1. Needs no birth time — matches natal.ts's existing "Rising
 * treated as a point at 0° of its sign" convention (§5.3), which *is* the whole-sign-house
 * assumption. See spec §6.9's "Ground" axis.
 */
export function houseOf(anchorSign: ZodiacSign, targetSign: ZodiacSign): number {
  return ((ZODIAC[targetSign].order - ZODIAC[anchorSign].order + 12) % 12) + 1;
}

const ORDINAL_SUFFIXES: Record<number, string> = { 1: "st", 2: "nd", 3: "rd" };

/** "1st"/"2nd"/"3rd"/"4th".../"12th" — houses are always 1-12, so no need to handle 11th/12th/13th teens specially. */
export function houseOrdinal(house: number): string {
  return `${house}${ORDINAL_SUFFIXES[house] ?? "th"}`;
}
