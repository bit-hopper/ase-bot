import { describe, expect, it } from "vitest";
import { selectBigThree } from "../../src/reading/bigThreeSelection.js";
import { PLANETS, type Planet, type ZodiacSign } from "../../src/data/types.js";
import type { TransitSnapshot } from "../../src/tarot/readingSelection.js";
import type { NatalPlacements } from "../../src/tarot/natal.js";

function snapshot(sign: ZodiacSign): TransitSnapshot {
  return { sign, degreeInSign: 5, longitude: 5, isRetrograde: false };
}

/** All 10 planets default to `defaultSign`, with per-planet overrides. */
function makePositions(defaultSign: ZodiacSign, overrides: Partial<Record<Planet, ZodiacSign>> = {}): Record<Planet, TransitSnapshot> {
  const entries = PLANETS.map((planet) => [planet, snapshot(overrides[planet] ?? defaultSign)] as const);
  return Object.fromEntries(entries) as Record<Planet, TransitSnapshot>;
}

const EMPTY_NATAL: NatalPlacements = { sun: null, moon: null, rising: null };

describe("selectBigThree", () => {
  it("picks the theme card from the live transiting Sun sign, not the natal Sun", () => {
    const positions = makePositions("virgo");
    const natal: NatalPlacements = { sun: "cancer", moon: null, rising: null };
    const selection = selectBigThree(positions, natal);
    expect(selection.card.name).toBe("The Hermit"); // virgo's Golden Dawn correspondence
    expect(selection.currentSunSign).toBe("virgo");
  });

  it("personalizes the theme via classifySignRelationship(natal.sun, currentSunSign)", () => {
    const positions = makePositions("virgo");
    const natal: NatalPlacements = { sun: "cancer", moon: null, rising: null }; // water/earth complementary -> harmony
    expect(selectBigThree(positions, natal).themeRelationship).toBe("harmony");
  });

  it("falls back to noNatalSun when the user has no natal Sun set", () => {
    const positions = makePositions("virgo");
    expect(selectBigThree(positions, EMPTY_NATAL).themeRelationship).toBe("noNatalSun");
  });

  it("personalizes the mood via classifySignRelationship(natal.moon, currentMoonSign)", () => {
    const positions = makePositions("aries", { moon: "pisces" });
    const natal: NatalPlacements = { sun: null, moon: "scorpio", rising: null }; // both water -> resonance
    expect(selectBigThree(positions, natal).moodRelationship).toBe("resonance");
  });

  it("falls back to noNatalMoon when the user has no natal Moon set", () => {
    const positions = makePositions("aries");
    expect(selectBigThree(positions, EMPTY_NATAL).moodRelationship).toBe("noNatalMoon");
  });

  it("Ground axis: uses Rising (not Sun) as the house anchor when Rising is set", () => {
    // Aquarius Rising -> ruler Uranus; Uranus currently in Taurus -> houseOf(aquarius, taurus)
    // = 4th house = Home & Roots.
    const positions = makePositions("aries", { uranus: "taurus" });
    const natal: NatalPlacements = { sun: "cancer", moon: null, rising: "aquarius" };
    const selection = selectBigThree(positions, natal);
    expect(selection.ground).not.toBeNull();
    expect(selection.ground!.rulingPlanet).toBe("uranus");
    expect(selection.ground!.rulingPlanetSign).toBe("taurus");
    expect(selection.ground!.house).toBe(4);
    expect(selection.ground!.domain.name).toBe("Home & Roots");
  });

  it("Ground axis: falls back to Sun as the house anchor when Rising is unset", () => {
    const positions = makePositions("aries", { venus: "gemini" });
    const natal: NatalPlacements = { sun: "libra", moon: null, rising: null }; // libra's ruler is venus
    const selection = selectBigThree(positions, natal);
    expect(selection.ground).not.toBeNull();
    expect(selection.ground!.rulingPlanet).toBe("venus");
    expect(selection.ground!.rulingPlanetSign).toBe("gemini");
  });

  it("Ground axis: omitted entirely when neither Rising nor Sun is set", () => {
    const positions = makePositions("aries");
    const natal: NatalPlacements = { sun: null, moon: "cancer", rising: null };
    expect(selectBigThree(positions, natal).ground).toBeNull();
  });
});
