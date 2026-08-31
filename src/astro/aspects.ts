import { normalizeDegrees } from "./coordinates.js";

export const ASPECT_TYPES = ["conjunction", "sextile", "square", "trine", "opposition"] as const;
export type AspectType = (typeof ASPECT_TYPES)[number];

export type AspectCategory = "harmonious" | "challenging";

export interface AspectDefinition {
  type: AspectType;
  angle: number;
  orb: number;
  category: AspectCategory;
}

/** §5.3 — orb table. Ranges don't overlap (max span per aspect is angle ± orb), so a given
 *  separation matches at most one aspect. */
export const ASPECT_DEFS: Record<AspectType, AspectDefinition> = {
  conjunction: { type: "conjunction", angle: 0, orb: 8, category: "harmonious" },
  sextile: { type: "sextile", angle: 60, orb: 4, category: "harmonious" },
  square: { type: "square", angle: 90, orb: 7, category: "challenging" },
  trine: { type: "trine", angle: 120, orb: 8, category: "harmonious" },
  opposition: { type: "opposition", angle: 180, orb: 8, category: "challenging" },
};

export interface Aspect {
  type: AspectType;
  category: AspectCategory;
  /** Absolute angular separation between the two longitudes, [0, 180]. */
  separation: number;
  /** |separation - aspect.angle|; how exact the aspect is. */
  orb: number;
}

/** Shortest angular distance between two longitudes, always in [0, 180]. */
export function angularSeparation(a: number, b: number): number {
  const diff = Math.abs(normalizeDegrees(a) - normalizeDegrees(b));
  return diff > 180 ? 360 - diff : diff;
}

/**
 * §5.3 — finds the aspect (if any) formed between two ecliptic longitudes.
 * Returns null if the separation falls outside every aspect's orb.
 */
export function findAspect(longitudeA: number, longitudeB: number): Aspect | null {
  const separation = angularSeparation(longitudeA, longitudeB);

  for (const def of Object.values(ASPECT_DEFS)) {
    const orb = Math.abs(separation - def.angle);
    if (orb <= def.orb) {
      return { type: def.type, category: def.category, separation, orb };
    }
  }

  return null;
}
