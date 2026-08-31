import { describe, expect, it } from "vitest";
import { houseDomain } from "../../src/data/houseDomains.js";

describe("houseDomain", () => {
  it("has a distinct name and blurb for all 12 houses", () => {
    const names = new Set<string>();
    for (let house = 1; house <= 12; house++) {
      const domain = houseDomain(house);
      expect(domain.house).toBe(house);
      expect(domain.name.length).toBeGreaterThan(0);
      expect(domain.blurb.length).toBeGreaterThan(0);
      names.add(domain.name);
    }
    expect(names.size).toBe(12);
  });

  it("throws for an out-of-range house number", () => {
    expect(() => houseDomain(0)).toThrow();
    expect(() => houseDomain(13)).toThrow();
  });
});
