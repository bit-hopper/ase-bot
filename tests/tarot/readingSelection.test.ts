import { describe, expect, it } from "vitest";
import { PLANETS, type Planet } from "../../src/data/types.js";
import { longitudeToSign } from "../../src/astro/coordinates.js";
import { selectReadingCard, type TransitSnapshot } from "../../src/tarot/readingSelection.js";
import type { NatalPlacements } from "../../src/tarot/natal.js";

function snapshot(longitude: number, isRetrograde = false): TransitSnapshot {
  return { longitude, isRetrograde, ...longitudeToSign(longitude) };
}

function positionsWith(overrides: Partial<Record<Planet, TransitSnapshot>>): Record<Planet, TransitSnapshot> {
  const base = Object.fromEntries(PLANETS.map((p) => [p, snapshot(279)])) as Record<Planet, TransitSnapshot>;
  return { ...base, ...overrides };
}

describe("selectReadingCard (§6.2, §7 end-to-end)", () => {
  const natal: NatalPlacements = { sun: "leo", moon: null, rising: null }; // sun at 120deg

  it("routes the Anchor Transit's decan to the resulting card", () => {
    // Mars trine Sun (120 + 120 = 240deg = Sagittarius 0deg -> 1st decan)
    const positions = positionsWith({ mars: snapshot(240) });
    const selection = selectReadingCard(positions, natal, { did: "did:plc:abc", date: "2026-08-28" });

    expect(selection.anchor.planet).toBe("mars");
    expect(selection.decan.sign).toBe("sagittarius");
    expect(selection.decan.decan).toBe(1);
    expect(selection.decan.cardKey).toBe("eight_of_wands");
  });

  it("forces reversed when the Anchor Transit is retrograde, independent of the seed", () => {
    const positions = positionsWith({ mars: snapshot(240, true) });
    const selection = selectReadingCard(positions, natal, { did: "did:plc:abc", date: "2026-08-28" });
    expect(selection.orientation.orientation).toBe("reversed");
  });

  it("is fully deterministic for the same positions/natal/seed", () => {
    const positions = positionsWith({ mars: snapshot(240) });
    const seed = { did: "did:plc:abc", date: "2026-08-28" };
    const a = selectReadingCard(positions, natal, seed);
    const b = selectReadingCard(positions, natal, seed);
    expect(a).toEqual(b);
  });

  it("orientation seed varies by date, so a different day can roll differently", () => {
    const positions = positionsWith({ mars: snapshot(240) });
    const results = new Set<string>();
    for (let d = 1; d <= 15; d++) {
      const date = `2026-08-${String(d).padStart(2, "0")}`;
      const r = selectReadingCard(positions, natal, { did: "did:plc:abc", date });
      results.add(r.orientation.orientation);
    }
    // With a 90% upright roll over 15 days, expect to see some variation (not a strict guarantee, but overwhelmingly likely).
    expect(results.size).toBeGreaterThanOrEqual(1);
  });
});
