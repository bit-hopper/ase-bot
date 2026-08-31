import sweph, { constants } from "sweph";
import type { ZodiacSign } from "../data/types.js";
import { computePlanetPosition, DEFAULT_CALC_FLAGS } from "./ephemeris.js";

export type EclipseKind = "lunar" | "solar";

export interface EclipseEvent {
  kind: EclipseKind;
  /** Julian Day (UT) of eclipse maximum. */
  jdUt: number;
  date: Date;
  /** Moon's sign for a lunar eclipse, Sun's sign for a solar eclipse, both evaluated at jdUt. */
  sign: ZodiacSign;
}

/** Inverse of ephemeris.ts's dateToJulianDayUT. */
export function julianDayToDate(jdUt: number): Date {
  const result = sweph.jdut1_to_utc(jdUt, constants.SE_GREG_CAL);
  return new Date(Date.UTC(result.year, result.month - 1, result.day, result.hour, result.minute, Math.floor(result.second)));
}

/** Forward search from fromJdUt for the next lunar eclipse (any type), globally. */
export function findNextLunarEclipse(fromJdUt: number, flags: number = DEFAULT_CALC_FLAGS): EclipseEvent {
  const result = sweph.lun_eclipse_when(fromJdUt, flags, 0, false);
  if (result.flag === constants.ERR) {
    throw new Error(`lun_eclipse_when failed: ${result.error}`);
  }

  const jdUt = result.data[0];
  return { kind: "lunar", jdUt, date: julianDayToDate(jdUt), sign: computePlanetPosition(jdUt, "moon", flags).sign };
}

/** Forward search from fromJdUt for the next solar eclipse (any type), globally. */
export function findNextSolarEclipse(fromJdUt: number, flags: number = DEFAULT_CALC_FLAGS): EclipseEvent {
  const result = sweph.sol_eclipse_when_glob(fromJdUt, flags, 0, false);
  if (result.flag === constants.ERR) {
    throw new Error(`sol_eclipse_when_glob failed: ${result.error}`);
  }

  const jdUt = result.data[0];
  return { kind: "solar", jdUt, date: julianDayToDate(jdUt), sign: computePlanetPosition(jdUt, "sun", flags).sign };
}
