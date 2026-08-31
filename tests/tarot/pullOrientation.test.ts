import { describe, expect, it } from "vitest";
import { majorArcanaPullOrientation, minorArcanaPullOrientation } from "../../src/tarot/pullOrientation.js";

describe("majorArcanaPullOrientation (§6.6)", () => {
  it("matches the spec table for its 7 explicit phases", () => {
    expect(majorArcanaPullOrientation("new_moon").orientation).toBe("upright");
    expect(majorArcanaPullOrientation("waxing_crescent").orientation).toBe("upright");
    expect(majorArcanaPullOrientation("waxing_gibbous").orientation).toBe("upright");
    expect(majorArcanaPullOrientation("full_moon").orientation).toBe("upright");
    expect(majorArcanaPullOrientation("waning_gibbous").orientation).toBe("reversed");
    expect(majorArcanaPullOrientation("waning_crescent").orientation).toBe("reversed");
    expect(majorArcanaPullOrientation("dark_moon").orientation).toBe("reversed");
  });

  it("fills the two gap phases per the waxing/waning pattern", () => {
    expect(majorArcanaPullOrientation("first_quarter").orientation).toBe("upright");
    expect(majorArcanaPullOrientation("last_quarter").orientation).toBe("reversed");
  });
});

describe("minorArcanaPullOrientation (§7.3)", () => {
  it("is reversed when the decan ruler is retrograde", () => {
    const result = minorArcanaPullOrientation({ longitude: 0, isRetrograde: true });
    expect(result.orientation).toBe("reversed");
  });

  it("is upright when the decan ruler is direct and harmonious to a Cardinal point", () => {
    // longitude 3: conjunction (harmonious) to 0deg Aries
    const result = minorArcanaPullOrientation({ longitude: 3, isRetrograde: false });
    expect(result.orientation).toBe("upright");
  });

  it("rolls 50/50 when the decan ruler is direct with no harmonious Cardinal aspect", () => {
    let upright = 0;
    const n = 2000;
    for (let i = 0; i < n; i++) {
      // longitude 45: isolated from every Cardinal point (0/90/180/270) and every aspect orb
      const r = minorArcanaPullOrientation({ longitude: 45, isRetrograde: false });
      if (r.orientation === "upright") upright++;
    }
    expect(upright / n).toBeGreaterThan(0.4);
    expect(upright / n).toBeLessThan(0.6);
  });

  it("rolls 50/50 when there is no decan ruler at all (Ace/Court)", () => {
    let upright = 0;
    const n = 2000;
    for (let i = 0; i < n; i++) {
      if (minorArcanaPullOrientation(null).orientation === "upright") upright++;
    }
    expect(upright / n).toBeGreaterThan(0.4);
    expect(upright / n).toBeLessThan(0.6);
  });
});
