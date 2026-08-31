import { ZODIAC_SIGNS, type ZodiacSign } from "../data/types.js";

/** Wraps any degree value into [0, 360). */
export function normalizeDegrees(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

export interface SignPosition {
  sign: ZodiacSign;
  /** Sign-relative decimal degrees, [0, 30). */
  degreeInSign: number;
}

/** §5.2 — maps an absolute ecliptic longitude to its zodiac sign and sign-relative degree. */
export function longitudeToSign(longitude: number): SignPosition {
  const normalized = normalizeDegrees(longitude);
  const signIndex = Math.floor(normalized / 30);
  const sign = ZODIAC_SIGNS[signIndex]!;
  const degreeInSign = normalized - signIndex * 30;
  return { sign, degreeInSign };
}
