import { describe, expect, it } from "vitest";
import type { PlanetPosition } from "../../src/astro/ephemeris.js";
import { detectStationsAndIngresses, type PhenomenaState } from "../../src/phenomena/detectStationsAndIngresses.js";
import { PLANETS, type Planet } from "../../src/data/types.js";

function baseState(): PhenomenaState {
  const entries = PLANETS.map((p) => [p, { sign: "aries", isRetrograde: false }] as const);
  return Object.fromEntries(entries) as PhenomenaState;
}

function basePositions(): Record<Planet, PlanetPosition> {
  const entries = PLANETS.map(
    (p) =>
      [
        p,
        { planet: p, sign: "aries", degreeInSign: 10, longitude: 10, speedLongitude: 1, isRetrograde: false } as PlanetPosition,
      ] as const,
  );
  return Object.fromEntries(entries) as Record<Planet, PlanetPosition>;
}

describe("detectStationsAndIngresses", () => {
  it("returns [] on a cold start (previous === null)", () => {
    expect(detectStationsAndIngresses(null, basePositions())).toEqual([]);
  });

  it("detects a sign ingress on any of the 10 tracked planets, Sun and Moon included", () => {
    for (const planet of PLANETS) {
      const previous = baseState();
      const current = basePositions();
      current[planet] = { ...current[planet], sign: "taurus" };

      const events = detectStationsAndIngresses(previous, current);
      expect(events).toEqual([{ type: "ingress", planet, fromSign: "aries", toSign: "taurus" }]);
    }
  });

  it("detects a retrograde station on a retrograde-capable planet", () => {
    const previous = baseState();
    const current = basePositions();
    current.mercury = { ...current.mercury, isRetrograde: true };

    const events = detectStationsAndIngresses(previous, current);
    expect(events).toEqual([{ type: "station", planet: "mercury", direction: "retrograde", sign: "aries" }]);
  });

  it("detects a station-direct event when isRetrograde flips back to false", () => {
    const previous: PhenomenaState = { ...baseState(), saturn: { sign: "aries", isRetrograde: true } };
    const current = basePositions();

    const events = detectStationsAndIngresses(previous, current);
    expect(events).toEqual([{ type: "station", planet: "saturn", direction: "direct", sign: "aries" }]);
  });

  it("never produces a station event for Sun or Moon even if isRetrograde flips in the input", () => {
    const previous = baseState();
    const current = basePositions();
    current.sun = { ...current.sun, isRetrograde: true };
    current.moon = { ...current.moon, isRetrograde: true };

    expect(detectStationsAndIngresses(previous, current)).toEqual([]);
  });

  it("produces both a station and an ingress event when a planet changes both in one tick", () => {
    const previous = baseState();
    const current = basePositions();
    current.mars = { ...current.mars, sign: "taurus", isRetrograde: true };

    const events = detectStationsAndIngresses(previous, current);
    expect(events).toHaveLength(2);
    expect(events).toContainEqual({ type: "ingress", planet: "mars", fromSign: "aries", toSign: "taurus" });
    expect(events).toContainEqual({ type: "station", planet: "mars", direction: "retrograde", sign: "taurus" });
  });

  it("produces no events when nothing changed", () => {
    expect(detectStationsAndIngresses(baseState(), basePositions())).toEqual([]);
  });
});
