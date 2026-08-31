import { describe, expect, it } from "vitest";
import { PLANETS, type Planet } from "../../src/data/types.js";
import { computeImpactScore, selectAnchorTransit, type TransitPosition } from "../../src/tarot/impactScore.js";
import type { NatalPlacements } from "../../src/tarot/natal.js";

const NO_NATAL: NatalPlacements = { sun: null, moon: null, rising: null };

function direct(longitude: number): TransitPosition {
  return { longitude, isRetrograde: false };
}

function retro(longitude: number): TransitPosition {
  return { longitude, isRetrograde: true };
}

describe("computeImpactScore (§6.3)", () => {
  it("scores 100 for an exact (<=1deg) conjunction to Rising", () => {
    const natal: NatalPlacements = { ...NO_NATAL, rising: "aries" }; // 0deg
    const result = computeImpactScore(direct(0.5), natal);
    expect(result).toMatchObject({ score: 100, natalPoint: "rising" });
  });

  it("scores 80 for a wider (<=8deg) conjunction to Rising", () => {
    const natal: NatalPlacements = { ...NO_NATAL, rising: "aries" };
    const result = computeImpactScore(direct(5), natal);
    expect(result).toMatchObject({ score: 80, natalPoint: "rising" });
  });

  it("does not score a non-conjunction aspect to Rising (table has no entry for it)", () => {
    const natal: NatalPlacements = { ...NO_NATAL, rising: "aries" }; // 0deg
    const result = computeImpactScore(direct(90), natal); // square to Rising
    expect(result).toMatchObject({ score: 0, natalPoint: null });
  });

  it("scores 60 for any aspect to Sun", () => {
    const natal: NatalPlacements = { ...NO_NATAL, sun: "leo" }; // 120deg
    const result = computeImpactScore(direct(210), natal); // square, orb 0
    expect(result).toMatchObject({ score: 60, natalPoint: "sun" });
  });

  it("scores 40 for any aspect to Moon", () => {
    const natal: NatalPlacements = { ...NO_NATAL, moon: "cancer" }; // 90deg
    const result = computeImpactScore(direct(90), natal); // exact conjunction
    expect(result).toMatchObject({ score: 40, natalPoint: "moon" });
  });

  it("scores 0 with no matching aspect to any placement", () => {
    const natal: NatalPlacements = { sun: "leo", moon: "cancer", rising: "aries" };
    const result = computeImpactScore(direct(45), natal); // isolated from all three
    expect(result).toMatchObject({ score: 0, natalPoint: null, aspect: null });
  });

  it("Rising takes precedence over a simultaneous aspect to Sun (§7.2)", () => {
    const natal: NatalPlacements = { ...NO_NATAL, rising: "aries", sun: "cancer" }; // 0deg, 90deg
    // longitude 3: conjunction to Rising (orb 3) AND square to Sun (orb 3)
    const result = computeImpactScore(direct(3), natal);
    expect(result).toMatchObject({ score: 80, natalPoint: "rising" });
  });

  it("applies the 1.25x retrograde multiplier to whichever condition wins", () => {
    const natal: NatalPlacements = { ...NO_NATAL, sun: "leo" };
    const result = computeImpactScore(retro(210), natal);
    expect(result.score).toBeCloseTo(75);
  });
});

function positionsWith(overrides: Partial<Record<Planet, TransitPosition>>): Record<Planet, TransitPosition> {
  const base = Object.fromEntries(PLANETS.map((p) => [p, direct(999)])) as Record<Planet, TransitPosition>;
  return { ...base, ...overrides };
}

describe("selectAnchorTransit (§6.2 step 3, §6.3 tie-break)", () => {
  it("picks the highest-scoring planet", () => {
    const natal: NatalPlacements = { sun: "aries", moon: null, rising: null };
    const positions = positionsWith({
      mercury: direct(5), // conjunction to sun, orb5, score 60
      venus: direct(90), // square to sun, orb0, score 60 too — same score
      mars: direct(200), // isolated, score 0
    });
    const anchor = selectAnchorTransit(positions, natal);
    expect(anchor.score).toBe(60);
  });

  it("breaks same-score ties by smaller orb", () => {
    const natal: NatalPlacements = { sun: "aries", moon: null, rising: null }; // 0deg
    const positions = positionsWith({
      mercury: direct(5), // conjunction, orb 5
      venus: direct(2), // conjunction, orb 2 — more exact, should win
    });
    const anchor = selectAnchorTransit(positions, natal);
    expect(anchor.planet).toBe("venus");
  });

  it("breaks fully-identical ties by stable planet order", () => {
    const natal: NatalPlacements = { sun: "aries", moon: null, rising: null };
    const positions = positionsWith({
      mercury: direct(5),
      venus: direct(5), // identical score, natalPoint, and orb to mercury
    });
    // mercury precedes venus in PLANETS order
    const anchor = selectAnchorTransit(positions, natal);
    expect(anchor.planet).toBe("mercury");
  });

  it("retrograde multiplier can change the winner", () => {
    const natal: NatalPlacements = { sun: "aries", moon: null, rising: "taurus" }; // sun 0, rising 30
    const positions = positionsWith({
      mercury: retro(5), // conjunction to sun, base 60 * 1.25 = 75
      jupiter: direct(35), // conjunction to rising, orb 5, base 80
    });
    const anchor = selectAnchorTransit(positions, natal);
    expect(anchor.planet).toBe("jupiter");
    expect(anchor.score).toBe(80);
  });

  it("defaults to the first planet in stable order when nobody scores", () => {
    const anchor = selectAnchorTransit(positionsWith({}), NO_NATAL);
    expect(anchor.planet).toBe(PLANETS[0]);
    expect(anchor.score).toBe(0);
  });
});
