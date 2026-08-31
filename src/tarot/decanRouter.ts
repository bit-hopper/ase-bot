import { findDecan } from "../data/decans.js";
import type { DecanEntry, ZodiacSign } from "../data/types.js";

/** §2.1 "Decan Matrix Router" layer — maps a transiting position to its decan/card. */
export function routeToDecan(position: { sign: ZodiacSign; degreeInSign: number }): DecanEntry {
  return findDecan(position.sign, position.degreeInSign);
}
