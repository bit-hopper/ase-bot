import { describe, expect, it } from "vitest";
import { rulingPlanetOf } from "../../src/data/rulingPlanet.js";
import { ZODIAC_SIGNS } from "../../src/data/types.js";

describe("rulingPlanetOf", () => {
  it("has an entry for every zodiac sign", () => {
    for (const sign of ZODIAC_SIGNS) {
      expect(rulingPlanetOf(sign)).toBeTruthy();
    }
  });

  it("uses modern rulerships for the outer-planet signs", () => {
    expect(rulingPlanetOf("scorpio")).toBe("pluto");
    expect(rulingPlanetOf("aquarius")).toBe("uranus");
    expect(rulingPlanetOf("pisces")).toBe("neptune");
  });

  it("uses the classical luminaries for Cancer and Leo", () => {
    expect(rulingPlanetOf("cancer")).toBe("moon");
    expect(rulingPlanetOf("leo")).toBe("sun");
  });

  it("gives Mercury both its signs", () => {
    expect(rulingPlanetOf("gemini")).toBe("mercury");
    expect(rulingPlanetOf("virgo")).toBe("mercury");
  });
});
