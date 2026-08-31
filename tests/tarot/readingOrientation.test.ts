import { describe, expect, it } from "vitest";
import { computeReadingOrientation } from "../../src/tarot/readingOrientation.js";

describe("computeReadingOrientation (§7.1)", () => {
  it("forces reversed on retrograde regardless of aspect category", () => {
    for (const aspectCategory of ["harmonious", "challenging", null] as const) {
      const result = computeReadingOrientation({ isRetrograde: true, aspectCategory, seed: "x" });
      expect(result.orientation).toBe("reversed");
    }
  });

  it("is deterministic for a fixed seed", () => {
    const input = { isRetrograde: false, aspectCategory: "harmonious" as const, seed: "did:2026-08-28:mars:seven_of_wands" };
    expect(computeReadingOrientation(input)).toEqual(computeReadingOrientation(input));
  });

  it("harmonious aspects land upright ~90% of the time across many seeds", () => {
    let upright = 0;
    const n = 3000;
    for (let i = 0; i < n; i++) {
      const r = computeReadingOrientation({ isRetrograde: false, aspectCategory: "harmonious", seed: `seed-${i}` });
      if (r.orientation === "upright") upright++;
    }
    expect(upright / n).toBeGreaterThan(0.85);
    expect(upright / n).toBeLessThan(0.95);
  });

  it("challenging aspects land upright ~25% of the time across many seeds", () => {
    let upright = 0;
    const n = 3000;
    for (let i = 0; i < n; i++) {
      const r = computeReadingOrientation({ isRetrograde: false, aspectCategory: "challenging", seed: `seed-${i}` });
      if (r.orientation === "upright") upright++;
    }
    expect(upright / n).toBeGreaterThan(0.2);
    expect(upright / n).toBeLessThan(0.3);
  });

  it("no aspect lands upright ~50% of the time across many seeds", () => {
    let upright = 0;
    const n = 3000;
    for (let i = 0; i < n; i++) {
      const r = computeReadingOrientation({ isRetrograde: false, aspectCategory: null, seed: `seed-${i}` });
      if (r.orientation === "upright") upright++;
    }
    expect(upright / n).toBeGreaterThan(0.45);
    expect(upright / n).toBeLessThan(0.55);
  });
});
