import { describe, expect, it } from "vitest";
import { computeMoonPhase, moonElongation } from "../../src/astro/moonPhase.js";

describe("moonElongation", () => {
  it("is 0 at conjunction (new moon)", () => {
    expect(moonElongation(100, 100)).toBeCloseTo(0);
  });

  it("is 180 at opposition (full moon)", () => {
    expect(moonElongation(100, 280)).toBeCloseTo(180);
  });

  it("wraps correctly when moon is behind the sun", () => {
    expect(moonElongation(350, 10)).toBeCloseTo(20);
  });
});

describe("computeMoonPhase boundaries", () => {
  it.each([
    [0, "new_moon"],
    [22.4, "new_moon"],
    [22.6, "waxing_crescent"],
    [67.6, "first_quarter"],
    [90, "first_quarter"],
    [112.6, "waxing_gibbous"],
    [157.6, "full_moon"],
    [180, "full_moon"],
    [202.6, "waning_gibbous"],
    [247.6, "last_quarter"],
    [270, "last_quarter"],
    [292.6, "waning_crescent"],
    [337.6, "dark_moon"],
    [359.9, "dark_moon"],
  ] as const)("elongation %s deg -> %s", (elongation, expected) => {
    expect(computeMoonPhase(0, elongation)).toBe(expected);
  });
});
