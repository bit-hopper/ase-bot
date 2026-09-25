import { constants } from "sweph";
import { describe, expect, it } from "vitest";
import { dateToJulianDayUT } from "../../src/astro/ephemeris.js";
import { findNextExactMoonPhase } from "../../src/astro/moonPhaseExact.js";

// Same offline convention as eclipses.test.ts — Moshier fallback, no data files needed.
const TEST_FLAGS = constants.SEFLG_MOSEPH | constants.SEFLG_SPEED;
const FROM = new Date("2026-08-28T12:00:00Z"); // real elongation here is ~183.8deg, just past full

describe("findNextExactMoonPhase", () => {
  it.each([
    ["new_moon", "2026-09-11T03:27"],
    ["first_quarter", "2026-09-18T20:44"],
    ["full_moon", "2026-09-26T16:49"],
    ["last_quarter", "2026-09-04T07:51"],
  ] as const)("finds the next %s's exact instant to the minute", (phase, expectedIsoPrefix) => {
    const jdUt = dateToJulianDayUT(FROM);
    const event = findNextExactMoonPhase(jdUt, phase, TEST_FLAGS);

    expect(event.phase).toBe(phase);
    expect(event.date.toISOString().slice(0, 16)).toBe(expectedIsoPrefix);
  });

  it("always finds an instant strictly after fromJdUt", () => {
    const jdUt = dateToJulianDayUT(FROM);
    const event = findNextExactMoonPhase(jdUt, "full_moon", TEST_FLAGS);
    expect(event.jdUt).toBeGreaterThan(jdUt);
  });
});
