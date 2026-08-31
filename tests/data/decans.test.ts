import { describe, expect, it } from "vitest";
import { DECAN_MATRIX, findDecan } from "../../src/data/decans.js";
import { ZODIAC_SIGNS } from "../../src/data/types.js";

describe("DECAN_MATRIX", () => {
  it("has exactly 36 entries", () => {
    expect(DECAN_MATRIX).toHaveLength(36);
  });

  it("has exactly 3 decans for every sign", () => {
    for (const sign of ZODIAC_SIGNS) {
      const entries = DECAN_MATRIX.filter((d) => d.sign === sign);
      expect(entries.map((e) => e.decan).sort()).toEqual([1, 2, 3]);
    }
  });

  it("has no duplicate card keys", () => {
    const keys = DECAN_MATRIX.map((d) => d.cardKey);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("covers pips 2-10 exactly once per suit", () => {
    for (const suit of ["wands", "cups", "swords", "pentacles"] as const) {
      const numbers = DECAN_MATRIX.filter((d) => d.suit === suit)
        .map((d) => d.number)
        .sort((a, b) => a - b);
      expect(numbers).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10]);
    }
  });
});

describe("findDecan boundary precision (§5.2)", () => {
  it("resolves 9°59'59\" to the 1st decan", () => {
    const almostTen = 9 + 59 / 60 + 59 / 3600;
    expect(findDecan("aries", almostTen).decan).toBe(1);
  });

  it("resolves exactly 10°00'00\" to the 2nd decan", () => {
    expect(findDecan("aries", 10).decan).toBe(2);
  });

  it("resolves 0° to the 1st decan", () => {
    expect(findDecan("aries", 0).decan).toBe(1);
  });

  it("resolves just under 30° to the 3rd decan", () => {
    expect(findDecan("aries", 29.999).decan).toBe(3);
  });

  it("throws for degrees outside 0-30", () => {
    expect(() => findDecan("aries", 30)).toThrow();
    expect(() => findDecan("aries", -0.001)).toThrow();
  });
});
