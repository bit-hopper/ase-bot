import { findAspect } from "../astro/aspects.js";
import type { CardOrientation, MoonPhase } from "../data/types.js";
import { randomBool } from "../random/csprng.js";
import type { OrientationResult } from "./readingOrientation.js";

/**
 * §6.6 — Major Arcana orientation via current Moon phase. The table only lists 7
 * of the 9 MoonPhase values (first_quarter and last_quarter are missing). Filled
 * by extending the table's own pattern — Upright covers the waxing half through
 * the Full Moon peak, Reversed covers the waning half back down into the dark —
 * so first_quarter (mid-waxing) is Upright and last_quarter (mid-waning) is Reversed.
 */
const MAJOR_ARCANA_ORIENTATION: Record<MoonPhase, CardOrientation> = {
  new_moon: "upright",
  waxing_crescent: "upright",
  first_quarter: "upright",
  waxing_gibbous: "upright",
  full_moon: "upright",
  waning_gibbous: "reversed",
  last_quarter: "reversed",
  waning_crescent: "reversed",
  dark_moon: "reversed",
};

export function majorArcanaPullOrientation(moonPhase: MoonPhase): OrientationResult {
  return {
    orientation: MAJOR_ARCANA_ORIENTATION[moonPhase],
    reason: `Major Arcana /pull — Moon phase is ${moonPhase.replace(/_/g, " ")}`,
  };
}

/** 0deg Aries, 0deg Cancer, 0deg Libra, 0deg Capricorn (§7.3). */
const CARDINAL_POINT_LONGITUDES = [0, 90, 180, 270];

export interface DecanRulerSnapshot {
  longitude: number;
  isRetrograde: boolean;
}

/**
 * §7.3 — Minor Arcana orientation via an instantaneous snapshot of the card's
 * Chaldean decan ruler. `rulerPosition` is null for Aces and Court cards, which
 * have no decan ruler (§15.4 only covers the 36 pip cards) — they fall straight
 * to the 50/50 CSPRNG "Otherwise" case, same as a direct ruler with no harmonious
 * cardinal aspect.
 */
export function minorArcanaPullOrientation(rulerPosition: DecanRulerSnapshot | null): OrientationResult {
  if (!rulerPosition) {
    return { orientation: randomBool() ? "upright" : "reversed", reason: "Minor Arcana /pull — no decan ruler (Ace/Court) — 50/50 roll" };
  }

  if (rulerPosition.isRetrograde) {
    return { orientation: "reversed", reason: "Minor Arcana /pull — decan ruler is retrograde" };
  }

  const harmoniousToCardinal = CARDINAL_POINT_LONGITUDES.some((cardinalLongitude) => {
    const aspect = findAspect(rulerPosition.longitude, cardinalLongitude);
    return aspect?.category === "harmonious";
  });

  if (harmoniousToCardinal) {
    return { orientation: "upright", reason: "Minor Arcana /pull — decan ruler direct, harmonious aspect to a Cardinal point" };
  }

  return { orientation: randomBool() ? "upright" : "reversed", reason: "Minor Arcana /pull — decan ruler direct, no harmonious Cardinal aspect — 50/50 roll" };
}
