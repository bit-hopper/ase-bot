import { describe, expect, it } from "vitest";
import { parseBio } from "../../src/profile/bioParser.js";

describe("parseBio — Sun patterns (§3.2)", () => {
  it.each([
    ["Leo Sun", "leo"],
    ["Leo sun", "leo"],
    ["☀️ Leo", "leo"],
    ["☀ Leo", "leo"],
    ["Sun: Leo", "leo"],
    ["Leo ♌", "leo"],
    ["♌", "leo"],
    ["Leo ☀️", "leo"],
  ] as const)("%s -> sun=%s", (bio, expected) => {
    const result = parseBio(bio);
    expect(result.sun).toEqual({ value: expected, confidence: 1 });
    expect(result.source).toBe("bio");
  });
});

describe("parseBio — Moon patterns (§3.2)", () => {
  it.each([
    ["Pisces Moon", "pisces"],
    ["🌙 Pisces", "pisces"],
    ["Moon: Pisces", "pisces"],
    ["♓ Moon", "pisces"],
  ] as const)("%s -> moon=%s", (bio, expected) => {
    const result = parseBio(bio);
    expect(result.moon).toEqual({ value: expected, confidence: 1 });
  });

  it("resolves the ambiguous name+glyph shape ('Pisces ♓') toward Sun, not Moon", () => {
    // §3.2's Moon list gives "Pisces ♓" with the identical shape as Sun's own "Leo ♌"
    // example, with no distinguishing feature. Documented resolution: name+own-glyph
    // is treated as Sun (consistent with the bare-glyph-alone = Sun convention).
    const result = parseBio("Pisces ♓");
    expect(result.sun).toEqual({ value: "pisces", confidence: 1 });
    expect(result.moon).toEqual({ value: null, confidence: 0 });
  });
});

describe("parseBio — Rising patterns (§3.2)", () => {
  it.each([
    ["Sagittarius Rising", "sagittarius"],
    ["Sag Rising", "sagittarius"],
    ["♐ Rising", "sagittarius"],
    ["Rising: Sagittarius", "sagittarius"],
    ["Sagittarius Asc", "sagittarius"],
    ["Sag ↑", "sagittarius"],
  ] as const)("%s -> rising=%s", (bio, expected) => {
    const result = parseBio(bio);
    expect(result.rising).toEqual({ value: expected, confidence: 1 });
  });
});

describe("parseBio — hedged language (§3.2 confidence threshold)", () => {
  it.each(["maybe Leo Sun", "Sun: Leo-ish"])("%s -> sun null, flagged low confidence", (bio) => {
    const result = parseBio(bio);
    expect(result.sun.value).toBeNull();
    expect(result.sun.confidence).toBeLessThan(0.75);
  });

  it("Moon: Pisces-ish -> moon null, flagged low confidence", () => {
    const result = parseBio("Moon: Pisces-ish");
    expect(result.moon.value).toBeNull();
    expect(result.moon.confidence).toBeLessThan(0.75);
  });

  it("maybe Sagittarius Rising -> rising null, flagged low confidence", () => {
    const result = parseBio("maybe Sagittarius Rising");
    expect(result.rising.value).toBeNull();
    expect(result.rising.confidence).toBeLessThan(0.75);
  });
});

describe("parseBio — no match", () => {
  it("returns null/0 confidence for every placement on an empty bio", () => {
    const result = parseBio("");
    expect(result.sun).toEqual({ value: null, confidence: 0 });
    expect(result.moon).toEqual({ value: null, confidence: 0 });
    expect(result.rising).toEqual({ value: null, confidence: 0 });
  });

  it("returns null/0 confidence for unrelated bio text", () => {
    const result = parseBio("just here for the vibes, no astrology content");
    expect(result.sun.value).toBeNull();
    expect(result.moon.value).toBeNull();
    expect(result.rising.value).toBeNull();
  });
});

describe("parseBio — combined and partial bios", () => {
  it("parses all three placements independently from one bio with no cross-contamination", () => {
    const result = parseBio("Leo Sun · Pisces Moon · Sagittarius Rising");
    expect(result.sun.value).toBe("leo");
    expect(result.moon.value).toBe("pisces");
    expect(result.rising.value).toBe("sagittarius");
  });

  it("parses a partial bio (Sun only), leaving Moon/Rising null", () => {
    const result = parseBio("just a Leo Sun living my best life");
    expect(result.sun.value).toBe("leo");
    expect(result.moon).toEqual({ value: null, confidence: 0 });
    expect(result.rising).toEqual({ value: null, confidence: 0 });
  });

  it("does not let a glyph already consumed by Rising get reused by the bare-glyph Sun fallback", () => {
    const result = parseBio("♐ Rising");
    expect(result.rising.value).toBe("sagittarius");
    expect(result.sun).toEqual({ value: null, confidence: 0 });
  });

  it("still finds a separate bare Sun glyph alongside an unrelated Rising match", () => {
    const result = parseBio("♐ Rising, ♌ Leo");
    expect(result.rising.value).toBe("sagittarius");
    expect(result.sun.value).toBe("leo");
  });

  it("is case-insensitive", () => {
    const result = parseBio("SAGITTARIUS RISING");
    expect(result.rising.value).toBe("sagittarius");
  });
});
