import type { ZodiacSign } from "../data/types.js";
import { ZODIAC } from "../data/zodiac.js";

export interface NatalPlacements {
  sun: ZodiacSign | null;
  moon: ZodiacSign | null;
  rising: ZodiacSign | null;
}

/**
 * §5.3 says Rising is "treated as a point at 0° of its sign for aspect calculation
 * when exact birth time is unavailable." v1 never collects birth date/time at
 * all (§16), so Sun and Moon are equally without a known exact degree — the same
 * 0°-of-sign treatment is the only consistent reading for all three natal points
 * until v3 adds real birth data input.
 */
export function natalPointLongitude(sign: ZodiacSign): number {
  return ZODIAC[sign].order * 30;
}
