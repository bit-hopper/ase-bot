import { findAspect, type Aspect } from "../astro/aspects.js";
import { PLANETS, type Planet } from "../data/types.js";
import { natalPointLongitude, type NatalPlacements } from "./natal.js";

export type NatalPoint = "rising" | "sun" | "moon";

export interface TransitPosition {
  longitude: number;
  isRetrograde: boolean;
}

export interface ImpactScoreResult {
  /** Final composite score, retrograde multiplier already applied. */
  score: number;
  /** Which natal point produced the score, per the §7.2 precedence (Rising > Sun > Moon). Null if no scoring aspect. */
  natalPoint: NatalPoint | null;
  /** The aspect that produced the score, if any. */
  aspect: Aspect | null;
}

/**
 * §6.3 — a transiting planet's Impact Score against one user's natal placements.
 * Only a conjunction to Rising scores (the table has no entry for other aspect
 * types to Rising); any aspect type scores for Sun/Moon. Only the single
 * highest-precedence condition applies (§7.2) — scores are not summed.
 */
export function computeImpactScore(position: TransitPosition, natal: NatalPlacements): ImpactScoreResult {
  let base = 0;
  let natalPoint: NatalPoint | null = null;
  let aspect: Aspect | null = null;

  const risingAspect = natal.rising ? findAspect(position.longitude, natalPointLongitude(natal.rising)) : null;
  const sunAspect = natal.sun ? findAspect(position.longitude, natalPointLongitude(natal.sun)) : null;
  const moonAspect = natal.moon ? findAspect(position.longitude, natalPointLongitude(natal.moon)) : null;

  if (risingAspect && risingAspect.type === "conjunction") {
    base = risingAspect.orb <= 1 ? 100 : 80;
    natalPoint = "rising";
    aspect = risingAspect;
  } else if (sunAspect) {
    base = 60;
    natalPoint = "sun";
    aspect = sunAspect;
  } else if (moonAspect) {
    base = 40;
    natalPoint = "moon";
    aspect = moonAspect;
  }

  const score = position.isRetrograde ? base * 1.25 : base;
  return { score, natalPoint, aspect };
}

const NATAL_POINT_PRECEDENCE: Record<NatalPoint, number> = { rising: 0, sun: 1, moon: 2 };

export interface AnchorTransit extends ImpactScoreResult {
  planet: Planet;
}

/**
 * §6.2 step 3 / §6.3 — selects the Anchor Transit: the planet with the highest
 * Impact Score. Ties are under-specified by the spec beyond "Rising > Sun > Moon";
 * this breaks remaining ties by smaller orb (a more exact aspect is more
 * impactful), then by a stable planet order, so selection stays fully
 * deterministic given one ephemeris snapshot — required for /daily and for the
 * day-stable orientation seed in §7.1.
 */
export function selectAnchorTransit(
  positions: Record<Planet, TransitPosition>,
  natal: NatalPlacements,
): AnchorTransit {
  let best: AnchorTransit | null = null;

  for (const planet of PLANETS) {
    const result = computeImpactScore(positions[planet], natal);
    const candidate: AnchorTransit = { planet, ...result };

    if (!best || isBetterAnchor(candidate, best)) {
      best = candidate;
    }
  }

  return best!;
}

function isBetterAnchor(a: AnchorTransit, b: AnchorTransit): boolean {
  if (a.score !== b.score) return a.score > b.score;

  const aPrecedence = a.natalPoint ? NATAL_POINT_PRECEDENCE[a.natalPoint] : Infinity;
  const bPrecedence = b.natalPoint ? NATAL_POINT_PRECEDENCE[b.natalPoint] : Infinity;
  if (aPrecedence !== bPrecedence) return aPrecedence < bPrecedence;

  const aOrb = a.aspect?.orb ?? Infinity;
  const bOrb = b.aspect?.orb ?? Infinity;
  if (aOrb !== bOrb) return aOrb < bOrb;

  return false; // keep the earlier (stable-order) candidate
}
