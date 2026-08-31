import { constants } from "sweph";
import { describe, expect, it } from "vitest";
import {
  computeAllPlanetPositions,
  computePlanetPosition,
  dateToJulianDayUT,
} from "../../src/astro/ephemeris.js";

// No ephemeris data files are bundled with the repo (see plan §"Open Risks" —
// SWEPH_PATH sourcing is a deployment concern). Tests use the Moshier analytical
// fallback explicitly so they run offline; production always requests
// DEFAULT_CALC_FLAGS (SEFLG_SWIEPH) and errors loudly instead of silently
// downgrading — see the computePlanetPosition guard test below.
const TEST_FLAGS = constants.SEFLG_MOSEPH | constants.SEFLG_SPEED;

describe("dateToJulianDayUT", () => {
  it("matches the known JD for 2000-01-01 12:00 UTC (J2000.0)", () => {
    const jd = dateToJulianDayUT(new Date("2000-01-01T12:00:00Z"));
    expect(jd).toBeCloseTo(2451545.0, 4);
  });
});

describe("computePlanetPosition", () => {
  it("computes the Sun's position on a known date and sign", () => {
    const jd = dateToJulianDayUT(new Date("2026-08-28T12:00:00Z"));
    const sun = computePlanetPosition(jd, "sun", TEST_FLAGS);
    expect(sun.sign).toBe("virgo"); // late Aug = Virgo season
    expect(sun.longitude).toBeGreaterThanOrEqual(0);
    expect(sun.longitude).toBeLessThan(360);
  });

  it("the Sun is never retrograde (geocentric apparent motion is always direct)", () => {
    for (const iso of ["2026-01-15", "2026-04-15", "2026-07-15", "2026-10-15"]) {
      const jd = dateToJulianDayUT(new Date(`${iso}T00:00:00Z`));
      expect(computePlanetPosition(jd, "sun", TEST_FLAGS).isRetrograde).toBe(false);
    }
  });

  it("Mercury goes retrograde at some point in a given year (it does 3-4x/year)", () => {
    let sawRetrograde = false;
    let sawDirect = false;
    const start = dateToJulianDayUT(new Date("2026-01-01T00:00:00Z"));
    for (let day = 0; day < 365; day += 5) {
      const { isRetrograde } = computePlanetPosition(start + day, "mercury", TEST_FLAGS);
      if (isRetrograde) sawRetrograde = true;
      else sawDirect = true;
    }
    expect(sawRetrograde).toBe(true);
    expect(sawDirect).toBe(true);
  });

  it("throws when SEFLG_SWIEPH is requested but data files aren't available (§5.1 guard)", () => {
    const jd = dateToJulianDayUT(new Date("2026-08-28T12:00:00Z"));
    expect(() => computePlanetPosition(jd, "sun")).toThrow(/Swiss Ephemeris data files not available/);
  });
});

describe("computeAllPlanetPositions", () => {
  it("returns all 10 required bodies (§5.1)", () => {
    const positions = computeAllPlanetPositions(new Date("2026-08-28T12:00:00Z"), TEST_FLAGS);
    const planets = Object.keys(positions);
    expect(planets.sort()).toEqual(
      ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"].sort(),
    );
    for (const p of planets) {
      expect(positions[p as keyof typeof positions].sign).toBeDefined();
    }
  });
});
