import { describe, expect, it } from "vitest";
import { longitudeToSign } from "../../src/astro/coordinates.js";
import { PLANETS, type Planet } from "../../src/data/types.js";
import { buildAseContext } from "../../src/reading/aseContext.js";
import { routeToDecan } from "../../src/tarot/decanRouter.js";
import type { NatalPlacements } from "../../src/tarot/natal.js";
import type { ReadingSelection, TransitSnapshot } from "../../src/tarot/readingSelection.js";
import { getReadingRelationshipType, renderReading } from "../../src/templates/renderReading.js";
import type { ReadingTemplate } from "../../src/templates/types.js";

function snapshot(longitude: number, isRetrograde = false): TransitSnapshot {
  return { longitude, isRetrograde, ...longitudeToSign(longitude) };
}

function positionsWith(overrides: Partial<Record<Planet, TransitSnapshot>>): Record<Planet, TransitSnapshot> {
  const base = Object.fromEntries(PLANETS.map((p) => [p, snapshot(279)])) as Record<Planet, TransitSnapshot>;
  return { ...base, ...overrides };
}

const STUB_TEMPLATES: ReadingTemplate[] = [
  {
    card: "seven_of_wands",
    orientation: "upright",
    relationshipType: "amplification",
    synthesis: "{{currentSeason}} and your {{sun}} Sun agree. The {{cardName}} says hold your ground.",
    closing: "What deserves your protection today?",
  },
];

describe("renderReading (§9 end-to-end)", () => {
  const natal: NatalPlacements = { sun: "leo", moon: "pisces", rising: null };
  const positions = positionsWith({ sun: snapshot(120), mars: snapshot(145) }); // leo 25deg -> Seven of Wands, 3rd decan
  const decan = routeToDecan({ sign: "leo", degreeInSign: 25 });
  const selection: ReadingSelection = {
    anchor: { planet: "mars", score: 60, natalPoint: "sun", aspect: { type: "trine", category: "harmonious", separation: 120, orb: 0 } },
    decan,
    orientation: { orientation: "upright", reason: "test fixture" },
  };

  const ctx = buildAseContext({ did: "did:plc:abc", handle: "user.bsky.social", natal, profileSource: "command", positions, selection });

  it("selects the exact-match template and interpolates every slot", () => {
    const result = renderReading(STUB_TEMPLATES, ctx);
    expect(result.tier).toBe("exact");
    expect(result.synthesis).toBe("Leo season and your Leo Sun agree. The Seven of Wands says hold your ground.");
    expect(result.closing).toBe("What deserves your protection today?");
  });

  it("derives relationshipType from natal Sun vs current season", () => {
    expect(getReadingRelationshipType(ctx)).toBe("amplification"); // sun=leo, currentSunSign=leo
  });

  it("falls back to neutral -> raw meaning -> placeholder when the library has no match", () => {
    const result = renderReading([], ctx);
    expect(result.tier).toBe("raw_meaning_fallback");
    expect(result.synthesis).toBe(decan.uprightMeaning);
  });

  it("falls back to 'neutral' relationshipType when the user has no Sun sign set", () => {
    const noSunNatal: NatalPlacements = { sun: null, moon: "pisces", rising: null };
    const noSunCtx = buildAseContext({ did: "d", handle: "h", natal: noSunNatal, profileSource: "bio", positions, selection });
    expect(getReadingRelationshipType(noSunCtx)).toBe("neutral");
  });
});
