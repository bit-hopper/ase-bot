import { describe, expect, it } from "vitest";
import { longitudeToSign } from "../../src/astro/coordinates.js";
import { PLANETS, type Planet } from "../../src/data/types.js";
import { formatReading } from "../../src/output/formatReading.js";
import { fitsInOnePost } from "../../src/output/replyThread.js";
import { buildAseContext } from "../../src/reading/aseContext.js";
import { routeToDecan } from "../../src/tarot/decanRouter.js";
import type { NatalPlacements } from "../../src/tarot/natal.js";
import type { ReadingSelection, TransitSnapshot } from "../../src/tarot/readingSelection.js";
import type { RenderedReading } from "../../src/templates/types.js";

function snapshot(longitude: number, isRetrograde = false): TransitSnapshot {
  return { longitude, isRetrograde, ...longitudeToSign(longitude) };
}

function positionsWith(overrides: Partial<Record<Planet, TransitSnapshot>>): Record<Planet, TransitSnapshot> {
  const base = Object.fromEntries(PLANETS.map((p) => [p, snapshot(279)])) as Record<Planet, TransitSnapshot>;
  return { ...base, ...overrides };
}

const natal: NatalPlacements = { sun: "leo", moon: "pisces", rising: "sagittarius" };
const positions = positionsWith({ sun: snapshot(120), mars: snapshot(145) }); // Leo 25deg -> Seven of Wands
const decan = routeToDecan({ sign: "leo", degreeInSign: 25 });
const selection: ReadingSelection = {
  anchor: { planet: "mars", score: 60, natalPoint: "sun", aspect: { type: "trine", category: "harmonious", separation: 120, orb: 0 } },
  decan,
  orientation: { orientation: "upright", reason: "test fixture" },
};

function buildCtx() {
  return buildAseContext({ did: "did:plc:abc", handle: "user.bsky.social", natal, profileSource: "command", positions, selection });
}

describe("formatReading (§10.1)", () => {
  it("uses TODAY'S CARD header", () => {
    const ctx = buildCtx();
    const rendered: RenderedReading = { synthesis: "Short synthesis.", closing: "A short closing?", tier: "exact" };
    const thread = formatReading(ctx, rendered);
    expect(thread.join("\n")).toContain("TODAY'S CARD");
  });

  it("includes the natal line, card name/orientation, and anchor/decan line", () => {
    const ctx = buildCtx();
    const rendered: RenderedReading = { synthesis: "Short synthesis.", closing: "Closing?", tier: "exact" };
    const full = formatReading(ctx, rendered).join("\n");
    expect(full).toContain("Leo Sun");
    expect(full).toContain("Pisces Moon");
    expect(full).toContain("Sagittarius Rising");
    expect(full).toContain("Seven of Wands · Upright");
    expect(full).toContain("Mars in Leo · 3rd Decan");
  });

  it("fits everything in one post when short enough", () => {
    const ctx = buildCtx();
    const rendered: RenderedReading = { synthesis: "Short.", closing: "Closing?", tier: "exact" };
    const thread = formatReading(ctx, rendered);
    expect(thread).toHaveLength(1);
    expect(fitsInOnePost(thread[0]!)).toBe(true);
  });

  it("splits into a 3-post thread when the full reading exceeds 300 chars", () => {
    const ctx = buildCtx();
    const rendered: RenderedReading = { synthesis: "x".repeat(250), closing: "y".repeat(80), tier: "exact" };
    const thread = formatReading(ctx, rendered);
    expect(thread).toHaveLength(3);
    for (const post of thread) expect(fitsInOnePost(post)).toBe(true);
    expect(thread[1]).toBe("x".repeat(250));
    expect(thread[2]).toBe("y".repeat(80));
  });
});
