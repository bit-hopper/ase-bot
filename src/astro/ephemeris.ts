import sweph, { constants } from "sweph";
import type { Planet } from "../data/types.js";
import { longitudeToSign, normalizeDegrees, type SignPosition } from "./coordinates.js";

const PLANET_IDS: Record<Planet, number> = {
  sun: constants.SE_SUN,
  moon: constants.SE_MOON,
  mercury: constants.SE_MERCURY,
  venus: constants.SE_VENUS,
  mars: constants.SE_MARS,
  jupiter: constants.SE_JUPITER,
  saturn: constants.SE_SATURN,
  uranus: constants.SE_URANUS,
  neptune: constants.SE_NEPTUNE,
  pluto: constants.SE_PLUTO,
};

/** §5.1 — production default: real Swiss Ephemeris files + daily speed for retrograde detection. */
export const DEFAULT_CALC_FLAGS = constants.SEFLG_SWIEPH | constants.SEFLG_SPEED;

export interface PlanetPosition extends SignPosition {
  planet: Planet;
  /** Absolute ecliptic longitude, [0, 360). */
  longitude: number;
  /** Degrees/day. Negative means the planet is moving backward (retrograde). */
  speedLongitude: number;
  /** §5.4 — derived from the sign of speedLongitude. */
  isRetrograde: boolean;
}

let ephePathInitialized = false;

/** Must be called once at startup before computing positions against real ephemeris files (§5.1, §17.1 SWEPH_PATH). */
export function initEphemeris(swephPath: string): void {
  sweph.set_ephe_path(swephPath);
  ephePathInitialized = true;
}

export function isEphemerisInitialized(): boolean {
  return ephePathInitialized;
}

/** Converts a UTC calendar date/time to the Julian Day (universal time) sweph's calc_ut expects. */
export function dateToJulianDayUT(date: Date): number {
  const result = sweph.utc_to_jd(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate(),
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds() + date.getUTCMilliseconds() / 1000,
    constants.SE_GREG_CAL,
  );
  if (result.error) {
    throw new Error(`utc_to_jd failed: ${result.error}`);
  }
  // data = [julian day ET, julian day UT] — calc_ut wants UT.
  return result.data[1];
}

/**
 * Computes one planet's position at the given Julian Day (UT).
 *
 * Guards against sweph's silent fallback to the Moshier approximation when
 * SEFLG_SWIEPH was requested but the ephemeris data files aren't found —
 * spec §5.1 requires real Swiss Ephemeris data, not approximation tables.
 * Pass `flags` explicitly (e.g. SEFLG_MOSEPH) to opt into the approximation,
 * such as in tests that don't have ephemeris files available.
 */
export function computePlanetPosition(jdUt: number, planet: Planet, flags: number = DEFAULT_CALC_FLAGS): PlanetPosition {
  const result = sweph.calc_ut(jdUt, PLANET_IDS[planet], flags);

  if ((flags & constants.SEFLG_SWIEPH) !== 0 && (result.flag & constants.SEFLG_SWIEPH) === 0) {
    throw new Error(
      `Swiss Ephemeris data files not available for ${planet} (falling back to approximation is disallowed by spec §5.1): ${result.error}`,
    );
  }

  const [longitude, , , speedLongitude] = result.data;

  return {
    planet,
    longitude: normalizeDegrees(longitude),
    ...longitudeToSign(longitude),
    speedLongitude,
    isRetrograde: speedLongitude < 0,
  };
}

export function computeAllPlanetPositions(
  date: Date,
  flags: number = DEFAULT_CALC_FLAGS,
): Record<Planet, PlanetPosition> {
  const jdUt = dateToJulianDayUT(date);
  const planets = Object.keys(PLANET_IDS) as Planet[];
  const entries = planets.map((planet) => [planet, computePlanetPosition(jdUt, planet, flags)] as const);
  return Object.fromEntries(entries) as Record<Planet, PlanetPosition>;
}
