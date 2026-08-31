import { describe, expect, it } from "vitest";
import { houseOf, houseOrdinal } from "../../src/reading/houseSystem.js";

describe("houseOf (Whole Sign House placement)", () => {
  it("places the anchor sign itself in the 1st house", () => {
    expect(houseOf("aries", "aries")).toBe(1);
    expect(houseOf("aquarius", "aquarius")).toBe(1);
  });

  it("places the next sign in the 2nd house", () => {
    expect(houseOf("aries", "taurus")).toBe(2);
  });

  it("wraps around the zodiac correctly", () => {
    // aquarius (order 10) anchor, taurus (order 1) target -> 4th house.
    expect(houseOf("aquarius", "taurus")).toBe(4);
  });

  it("places the sign just before the anchor in the 12th house", () => {
    expect(houseOf("aries", "pisces")).toBe(12);
  });
});

describe("houseOrdinal", () => {
  it("formats 1-3 with their special suffixes", () => {
    expect(houseOrdinal(1)).toBe("1st");
    expect(houseOrdinal(2)).toBe("2nd");
    expect(houseOrdinal(3)).toBe("3rd");
  });

  it("formats 4-12 with 'th', including 11 and 12", () => {
    expect(houseOrdinal(4)).toBe("4th");
    expect(houseOrdinal(11)).toBe("11th");
    expect(houseOrdinal(12)).toBe("12th");
  });
});
