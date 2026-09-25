import { describe, expect, it } from "vitest";
import { formatMoon } from "../../src/output/formatMoon.js";

describe("formatMoon (§10.5)", () => {
  it("shows moon glyph, sign, and phase with an interpretation line", () => {
    const [post] = formatMoon("pisces", "waxing_crescent");
    expect(post).toContain("🌙");
    expect(post).toContain("Pisces");
    expect(post).toContain("Waxing Crescent");
    expect(post!.split("\n\n")[1]!.length).toBeGreaterThan(0);
  });

  it("appends the exact-instant countdown in parens when given one", () => {
    const [post] = formatMoon("pisces", "full_moon", "exact in 1d 11h");
    expect(post).toContain("Full Moon (exact in 1d 11h)");
  });

  it("omits the parens entirely when no countdown is given", () => {
    const [post] = formatMoon("pisces", "full_moon");
    expect(post).not.toContain("(");
  });
});
