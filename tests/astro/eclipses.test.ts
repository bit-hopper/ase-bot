import { constants } from "sweph";
import { describe, expect, it } from "vitest";
import { dateToJulianDayUT } from "../../src/astro/ephemeris.js";
import { findNextLunarEclipse, findNextSolarEclipse } from "../../src/astro/eclipses.js";

// Same offline convention as ephemeris.test.ts — Moshier fallback, no data files needed.
const TEST_FLAGS = constants.SEFLG_MOSEPH | constants.SEFLG_SPEED;

describe("eclipse search", () => {
  it("finds the next solar eclipse from a known date", () => {
    const fromJdUt = dateToJulianDayUT(new Date("2026-08-29T00:00:00Z"));
    const eclipse = findNextSolarEclipse(fromJdUt, TEST_FLAGS);

    expect(eclipse.kind).toBe("solar");
    expect(eclipse.sign).toBe("aquarius");
    expect(eclipse.date.toISOString().slice(0, 10)).toBe("2027-02-06");
  });

  it("finds the next lunar eclipse from a known date", () => {
    const fromJdUt = dateToJulianDayUT(new Date("2026-08-29T00:00:00Z"));
    const eclipse = findNextLunarEclipse(fromJdUt, TEST_FLAGS);

    expect(eclipse.kind).toBe("lunar");
    expect(eclipse.sign).toBe("virgo");
    expect(eclipse.date.toISOString().slice(0, 10)).toBe("2027-02-20");
  });
});
