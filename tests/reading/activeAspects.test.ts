import { describe, expect, it } from "vitest";
import { PLANETS, type Planet } from "../../src/data/types.js";
import { computeActiveAspects } from "../../src/reading/activeAspects.js";
import type { NatalPlacements } from "../../src/tarot/natal.js";

function positionsWith(overrides: Partial<Record<Planet, number>>): Record<Planet, { longitude: number }> {
  const base = Object.fromEntries(PLANETS.map((p) => [p, { longitude: 279 }])) as Record<Planet, { longitude: number }>;
  for (const [planet, longitude] of Object.entries(overrides)) {
    base[planet as Planet] = { longitude: longitude! };
  }
  return base;
}

describe("computeActiveAspects (§8.1 celestial.activeAspects)", () => {
  it("finds an aspect from a transiting planet to a natal placement", () => {
    const natal: NatalPlacements = { sun: "aries", moon: null, rising: null }; // 0deg
    const positions = positionsWith({ mars: 5 }); // conjunction, orb 5
    const active = computeActiveAspects(positions, natal);

    expect(active).toContainEqual(expect.objectContaining({ planet: "mars", natalPoint: "sun", type: "conjunction" }));
  });

  it("returns nothing for placements that are null", () => {
    const natal: NatalPlacements = { sun: null, moon: null, rising: null };
    const positions = positionsWith({ mars: 0 });
    expect(computeActiveAspects(positions, natal)).toEqual([]);
  });

  it("collects aspects across multiple planets and multiple natal points", () => {
    const natal: NatalPlacements = { sun: "aries", moon: "cancer", rising: null }; // 0, 90
    const positions = positionsWith({ mars: 2, venus: 92 }); // mars conj sun, venus conj moon
    const active = computeActiveAspects(positions, natal);

    expect(active.some((a) => a.planet === "mars" && a.natalPoint === "sun")).toBe(true);
    expect(active.some((a) => a.planet === "venus" && a.natalPoint === "moon")).toBe(true);
  });

  it("can report the same planet aspecting multiple natal points at once", () => {
    const natal: NatalPlacements = { sun: "aries", moon: "cancer", rising: null }; // 0, 90 — square to each other
    const positions = positionsWith({ mars: 0 }); // conjunct sun AND square moon simultaneously
    const active = computeActiveAspects(positions, natal);

    const marsAspects = active.filter((a) => a.planet === "mars");
    expect(marsAspects).toHaveLength(2);
    expect(marsAspects.some((a) => a.natalPoint === "sun" && a.type === "conjunction")).toBe(true);
    expect(marsAspects.some((a) => a.natalPoint === "moon" && a.type === "square")).toBe(true);
  });
});
