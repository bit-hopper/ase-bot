import { describe, expect, it } from "vitest";
import { formatCheck, formatCheckAll, formatCheckRetrograde } from "../../src/output/formatCheck.js";
import { fitsInOnePost } from "../../src/output/replyThread.js";
import { PLANET_GLYPH } from "../../src/data/planets.js";
import { PLANETS, type Planet } from "../../src/data/types.js";
import type { TransitSnapshot } from "../../src/tarot/readingSelection.js";

function snapshot(overrides: Partial<TransitSnapshot> = {}): TransitSnapshot {
  return { sign: "gemini", degreeInSign: 14.7, longitude: 74.7, isRetrograde: false, ...overrides };
}

/** A full 10-planet position record, all direct by default, for exercising formatCheckAll/
 *  formatCheckRetrograde. `overrides` lets a test flip specific planets retrograde. */
function allDirect(overrides: Partial<Record<Planet, Partial<TransitSnapshot>>> = {}): Record<Planet, TransitSnapshot> {
  const entries = PLANETS.map((planet) => [planet, snapshot(overrides[planet])] as const);
  return Object.fromEntries(entries) as Record<Planet, TransitSnapshot>;
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

describe("formatCheckAll", () => {
  it("returns a multi-post thread covering all 10 planets", () => {
    const reply = formatCheckAll(allDirect());
    expect(reply.length).toBeGreaterThan(1);
    for (const post of reply) expect(fitsInOnePost(post)).toBe(true);

    const joined = reply.join("\n\n");
    for (const planet of PLANETS) expect(joined).toContain(PLANET_GLYPH[planet]);
  });

  it("preserves PLANETS order across post boundaries", () => {
    const joined = formatCheckAll(allDirect()).join("\n\n");
    const indices = PLANETS.map((planet) => joined.indexOf(PLANET_GLYPH[planet]));
    expect(indices).toEqual([...indices].sort((a, b) => a - b));
  });
});

describe("formatCheckRetrograde", () => {
  it("includes only the planets currently retrograde", () => {
    const positions = allDirect({ saturn: { isRetrograde: true }, venus: { isRetrograde: true } });
    const joined = formatCheckRetrograde(positions).join("\n\n");
    expect(joined).toContain("♄ Saturn");
    expect(joined).toContain("♀ Venus");
    expect(joined).not.toContain("☿ Mercury");
  });

  it("every post fits within the character limit", () => {
    const positions = allDirect({ saturn: { isRetrograde: true }, venus: { isRetrograde: true } });
    for (const post of formatCheckRetrograde(positions)) expect(fitsInOnePost(post)).toBe(true);
  });

  it("returns the all-clear message when nothing is retrograde", () => {
    expect(formatCheckRetrograde(allDirect())).toEqual(["All clear — nothing's retrograde right now."]);
  });

  it("never treats the Sun or Moon as retrograde, even if isRetrograde were set on them", () => {
    const positions = allDirect({ sun: { isRetrograde: true }, moon: { isRetrograde: true } });
    expect(formatCheckRetrograde(positions)).toEqual(["All clear — nothing's retrograde right now."]);
  });
});
