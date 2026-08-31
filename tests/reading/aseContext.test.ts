import { describe, expect, it } from "vitest";
import { longitudeToSign } from "../../src/astro/coordinates.js";
import { PLANETS, type Planet } from "../../src/data/types.js";
import { buildAseContext } from "../../src/reading/aseContext.js";
import type { NatalPlacements } from "../../src/tarot/natal.js";
import { selectReadingCard, type TransitSnapshot } from "../../src/tarot/readingSelection.js";

function snapshot(longitude: number, isRetrograde = false): TransitSnapshot {
  return { longitude, isRetrograde, ...longitudeToSign(longitude) };
}

function positionsWith(overrides: Partial<Record<Planet, TransitSnapshot>>): Record<Planet, TransitSnapshot> {
  const base = Object.fromEntries(PLANETS.map((p) => [p, snapshot(279)])) as Record<Planet, TransitSnapshot>;
  return { ...base, ...overrides };
}

describe("buildAseContext (§8.1 end-to-end)", () => {
  const natal: NatalPlacements = { sun: "leo", moon: "pisces", rising: null }; // sun=120, moon=330
  const positions = positionsWith({ mars: snapshot(240) }); // trine to sun (120+120=240, Sagittarius 0deg, 1st decan)
  const selection = selectReadingCard(positions, natal, { did: "did:plc:abc", date: "2026-08-28" });

  it("wires user, celestial, and tarot blocks from the given inputs", () => {
    const ctx = buildAseContext({
      did: "did:plc:abc",
      handle: "user.bsky.social",
      natal,
      profileSource: "command",
      positions,
      selection,
    });

    expect(ctx.user).toMatchObject({ did: "did:plc:abc", handle: "user.bsky.social", sun: "leo", moon: "pisces", rising: null, profileSource: "command" });
    expect(ctx.user.missingPlacements).toEqual(["rising"]);

    expect(ctx.celestial.anchorPlanet).toBe("mars");
    expect(ctx.celestial.anchorPlanetSign).toBe("sagittarius");
    expect(ctx.celestial.anchorDecan).toBe(1);
    expect(ctx.celestial.currentSunSign).toBe(positions.sun.sign);

    expect(ctx.tarot.card.key).toBe("eight_of_wands");
    expect(ctx.tarot.cardType).toBe("minor");
    expect(ctx.tarot.suit).toBe("wands");
    expect(ctx.tarot.decanRuler).toBe("mercury");
  });

  it("maps profileSource 'cache' to 'bio' and detects an all-null profile as 'none'", () => {
    const withCache = buildAseContext({ did: "d", handle: "h", natal, profileSource: "cache", positions, selection });
    expect(withCache.user.profileSource).toBe("bio");

    const emptyNatal: NatalPlacements = { sun: null, moon: null, rising: null };
    const emptySelection = selectReadingCard(positions, emptyNatal, { did: "d", date: "2026-08-28" });
    const withNone = buildAseContext({ did: "d", handle: "h", natal: emptyNatal, profileSource: "cache", positions, selection: emptySelection });
    expect(withNone.user.profileSource).toBe("none");
    expect(withNone.user.missingPlacements).toEqual(["sun", "moon", "rising"]);
  });

  it("computes the relationships block from natal Sun vs current season", () => {
    const ctx = buildAseContext({ did: "d", handle: "h", natal, profileSource: "command", positions, selection });
    expect(ctx.relationships.sunToCurrentSign).toContain("Leo in");
    expect(ctx.relationships.elementRelationship).toMatch(/^Fire/);
  });

  it("falls back to a placeholder relationship string when Sun isn't set", () => {
    const noSun: NatalPlacements = { sun: null, moon: "pisces", rising: null };
    const sel = selectReadingCard(positions, noSun, { did: "d", date: "2026-08-28" });
    const ctx = buildAseContext({ did: "d", handle: "h", natal: noSun, profileSource: "bio", positions, selection: sel });
    expect(ctx.relationships.sunToCurrentSign).toBe("Sun sign not set");
    expect(ctx.relationships.elementRelationship).toBe("Sun sign not set");
  });

  it("includes a non-empty lifedomainHint derived from the anchor planet", () => {
    const ctx = buildAseContext({ did: "d", handle: "h", natal, profileSource: "command", positions, selection });
    expect(ctx.lifedomainHint.length).toBeGreaterThan(0);
  });
});
