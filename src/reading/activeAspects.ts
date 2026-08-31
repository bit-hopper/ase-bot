import { findAspect, type Aspect } from "../astro/aspects.js";
import { PLANETS, type Planet } from "../data/types.js";
import { natalPointLongitude, type NatalPlacements } from "../tarot/natal.js";

export interface ActiveAspect extends Aspect {
  planet: Planet;
  natalPoint: "sun" | "moon" | "rising";
}

export interface TransitLongitude {
  longitude: number;
}

/** §8.1 `celestial.activeAspects` — every aspect (across all 10 transiting planets) to any of the user's natal placements. */
export function computeActiveAspects(positions: Record<Planet, TransitLongitude>, natal: NatalPlacements): ActiveAspect[] {
  const active: ActiveAspect[] = [];

  for (const planet of PLANETS) {
    const longitude = positions[planet].longitude;

    for (const [natalPoint, sign] of [
      ["sun", natal.sun],
      ["moon", natal.moon],
      ["rising", natal.rising],
    ] as const) {
      if (!sign) continue;
      const aspect = findAspect(longitude, natalPointLongitude(sign));
      if (aspect) active.push({ ...aspect, planet, natalPoint });
    }
  }

  return active;
}
