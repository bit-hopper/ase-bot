import type { MoonPhase } from "../data/types.js";
import { normalizeDegrees } from "./coordinates.js";

/** Moon's ecliptic elongation from the Sun, [0, 360). 0 = new, 180 = full. */
export function moonElongation(sunLongitude: number, moonLongitude: number): number {
  return normalizeDegrees(moonLongitude - sunLongitude);
}

/**
 * §6.6 lists 7 of the 9 MoonPhase values in its orientation table (missing
 * first_quarter and last_quarter) and doesn't define phase boundaries at all.
 * This uses the standard 8-phase division (45deg slices, New/Full centered at
 * 0/180deg) and splits the New Moon slice in two: the approach into conjunction
 * (waning crescent bottoming out) is "dark_moon", the moment of and departure
 * from conjunction is "new_moon" — a conventional astrological distinction that
 * accounts for the 9th enum value without contradicting the 8 canonical phases.
 */
const PHASE_BOUNDARIES: Array<{ max: number; phase: MoonPhase }> = [
  { max: 22.5, phase: "new_moon" },
  { max: 67.5, phase: "waxing_crescent" },
  { max: 112.5, phase: "first_quarter" },
  { max: 157.5, phase: "waxing_gibbous" },
  { max: 202.5, phase: "full_moon" },
  { max: 247.5, phase: "waning_gibbous" },
  { max: 292.5, phase: "last_quarter" },
  { max: 337.5, phase: "waning_crescent" },
  { max: 360, phase: "dark_moon" },
];

export function computeMoonPhase(sunLongitude: number, moonLongitude: number): MoonPhase {
  const elongation = moonElongation(sunLongitude, moonLongitude);
  const entry = PHASE_BOUNDARIES.find((b) => elongation < b.max);
  return entry!.phase;
}
