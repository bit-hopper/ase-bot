import { computePlanetPosition, DEFAULT_CALC_FLAGS } from "./ephemeris.js";
import { julianDayToDate } from "./eclipses.js";
import { moonElongation } from "./moonPhase.js";

/** The 4 phases with a precise culminating instant — see moonPhase.ts's PHASE_BOUNDARIES
 *  comment for why the other 5 MoonPhase values (crescent/gibbous/dark) don't have one. */
export type NotableMoonPhase = "new_moon" | "first_quarter" | "full_moon" | "last_quarter";

export const NOTABLE_MOON_PHASES: readonly NotableMoonPhase[] = ["new_moon", "first_quarter", "full_moon", "last_quarter"];

/** Target Sun-Moon elongation, in degrees, at each phase's exact instant. */
const TARGET_ELONGATION: Record<NotableMoonPhase, number> = {
  new_moon: 0,
  first_quarter: 90,
  full_moon: 180,
  last_quarter: 270,
};

export interface MoonPhaseExactEvent {
  phase: NotableMoonPhase;
  /** Julian Day (UT) of the exact elongation crossing. */
  jdUt: number;
  date: Date;
}

function elongationAtJd(jdUt: number, flags: number): number {
  const sun = computePlanetPosition(jdUt, "sun", flags);
  const moon = computePlanetPosition(jdUt, "moon", flags);
  return moonElongation(sun.longitude, moon.longitude);
}

/** Signed distance of `elongation` from `target`, wrapped to (-180, 180]. */
function signedDiff(elongation: number, target: number): number {
  return (((elongation - target + 180) % 360) + 360) % 360 - 180;
}

/**
 * Forward search from fromJdUt for the exact instant Sun-Moon elongation next crosses the given
 * phase's target degree — unlike eclipses.ts's sol_eclipse_when_glob/lun_eclipse_when, sweph has
 * no built-in search for this, so it's a coarse daily step followed by a bisection root-find.
 * Elongation increases monotonically over time (the Moon always outpaces the Sun in ecliptic
 * longitude — neither body goes retrograde against the ecliptic), so within any 40-day window
 * (more than one full 29.53-day cycle) a single sign change unambiguously brackets the crossing.
 */
export function findNextExactMoonPhase(
  fromJdUt: number,
  phase: NotableMoonPhase,
  flags: number = DEFAULT_CALC_FLAGS,
): MoonPhaseExactEvent {
  const target = TARGET_ELONGATION[phase];
  const STEP_DAYS = 1;
  const ONE_MINUTE_IN_DAYS = 1 / (24 * 60);

  let prevJd = fromJdUt;
  let prevDiff = signedDiff(elongationAtJd(prevJd, flags), target);
  let bracket: { lo: number; hi: number } | null = null;

  for (let i = 1; i <= 40; i++) {
    const jd = fromJdUt + i * STEP_DAYS;
    const diff = signedDiff(elongationAtJd(jd, flags), target);
    if (prevDiff < 0 && diff >= 0) {
      bracket = { lo: prevJd, hi: jd };
      break;
    }
    prevJd = jd;
    prevDiff = diff;
  }

  if (!bracket) {
    throw new Error(`findNextExactMoonPhase: no ${phase} found within 40 days of JD ${fromJdUt}`);
  }

  let { lo, hi } = bracket;
  while (hi - lo > ONE_MINUTE_IN_DAYS) {
    const mid = (lo + hi) / 2;
    if (signedDiff(elongationAtJd(mid, flags), target) < 0) lo = mid;
    else hi = mid;
  }

  return { phase, jdUt: hi, date: julianDayToDate(hi) };
}
