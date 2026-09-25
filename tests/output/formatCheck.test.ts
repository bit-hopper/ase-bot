import { describe, expect, it } from "vitest";
import { formatCheck } from "../../src/output/formatCheck.js";
import type { TransitSnapshot } from "../../src/tarot/readingSelection.js";

function snapshot(overrides: Partial<TransitSnapshot> = {}): TransitSnapshot {
  return { sign: "gemini", degreeInSign: 14.7, longitude: 74.7, isRetrograde: false, ...overrides };
}

describe("formatCheck", () => {
  it("formats a direct-motion planet with glyph, floored degree, and sign", () => {
    const [reply] = formatCheck("mercury", snapshot());
    expect(reply).toContain("☿ Mercury · 14° Gemini");
    expect(reply).not.toContain("℞");
  });

  it("floors the degree rather than rounding", () => {
    const [reply] = formatCheck("venus", snapshot({ degreeInSign: 20.99 }));
    expect(reply).toContain("20° ");
  });

  it("appends the retrograde marker and note for a retrograde-capable planet", () => {
    const [reply] = formatCheck("saturn", snapshot({ sign: "aries", degreeInSign: 13.87, isRetrograde: true }));
    expect(reply).toContain("♄ Saturn · 13° Aries ℞");
    expect(reply).toContain("Retrograde:");
  });

  it("includes the planet's general meaning line", () => {
    const [reply] = formatCheck("venus", snapshot());
    expect(reply).toContain("Love, beauty, what draws you in.");
  });

  it("never appends a retrograde marker or note for the Sun", () => {
    const [reply] = formatCheck("sun", snapshot({ isRetrograde: false }));
    expect(reply).toContain("☉ Sun");
    expect(reply).not.toContain("℞");
    expect(reply).not.toContain("Retrograde:");
  });

  it("never appends a retrograde marker or note for the Moon", () => {
    const [reply] = formatCheck("moon", snapshot({ isRetrograde: false }));
    expect(reply).toContain("☽ Moon");
    expect(reply).not.toContain("℞");
    expect(reply).not.toContain("Retrograde:");
  });

  it("separates the header from the blurb with a blank line", () => {
    const [reply] = formatCheck("mars", snapshot());
    expect(reply!.split("\n\n")).toHaveLength(2);
  });
});
