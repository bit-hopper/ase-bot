import { describe, expect, it } from "vitest";
import { ZODIAC_SIGNS, type ZodiacSign } from "../../src/data/types.js";
import {
  classifySignRelationship,
  describeElementRelationship,
  describeModalityNote,
  describeSignToCurrentSeason,
  relationshipLabel,
} from "../../src/reading/relationships.js";

describe("classifySignRelationship — full 12x12 table (§8.2)", () => {
  it("matches both of the spec's own worked examples", () => {
    expect(classifySignRelationship("leo", "leo")).toBe("amplification");
    expect(classifySignRelationship("leo", "aquarius")).toBe("polarity"); // Leo <-> Aquarius, spec's Polarity example
    expect(classifySignRelationship("leo", "taurus")).toBe("tension"); // Leo <-> Taurus, spec's Tension example
  });

  it("is symmetric for every sign pair", () => {
    for (const a of ZODIAC_SIGNS) {
      for (const b of ZODIAC_SIGNS) {
        expect(classifySignRelationship(a, b)).toBe(classifySignRelationship(b, a));
      }
    }
  });

  it("produces exactly the expected distribution (1/1/2/2/2/4) for every sign, all 6 categories reachable", () => {
    for (const sign of ZODIAC_SIGNS) {
      const counts: Record<string, number> = { amplification: 0, resonance: 0, harmony: 0, polarity: 0, tension: 0, neutral: 0 };
      for (const other of ZODIAC_SIGNS) {
        counts[classifySignRelationship(sign, other)]!++;
      }
      expect(counts).toEqual({ amplification: 1, resonance: 2, harmony: 2, polarity: 1, tension: 2, neutral: 4 });
    }
  });

  it.each([
    ["aries", "libra"],
    ["taurus", "scorpio"],
    ["gemini", "sagittarius"],
    ["cancer", "capricorn"],
    ["leo", "aquarius"],
    ["virgo", "pisces"],
  ] as const)("every opposition pair (%s <-> %s) classifies as polarity, not harmony", (a, b) => {
    expect(classifySignRelationship(a, b)).toBe("polarity");
  });
});

describe("relationshipLabel", () => {
  it("title-cases every relationship type", () => {
    expect(relationshipLabel("amplification")).toBe("Amplification");
    expect(relationshipLabel("neutral")).toBe("Neutral");
  });
});

describe("describeSignToCurrentSeason", () => {
  it('matches the spec example: "Leo in Leo Season → amplification"', () => {
    expect(describeSignToCurrentSeason("leo", "leo")).toBe("Leo in Leo Season → amplification");
  });
});

describe("describeElementRelationship", () => {
  it('matches the spec example: "Fire amplifies Fire"', () => {
    expect(describeElementRelationship("leo", "leo")).toBe("Fire amplifies Fire");
  });

  it("uses the harmonizes verb for complementary elements", () => {
    expect(describeElementRelationship("leo", "gemini")).toBe("Fire harmonizes with Air");
  });

  it("uses the challenges verb for friction elements", () => {
    expect(describeElementRelationship("leo", "taurus")).toBe("Fire challenges Earth");
  });
});

describe("describeModalityNote", () => {
  it('matches the spec example: "Fixed × Mutable = tension"', () => {
    // Leo = fixed, Gemini = mutable
    expect(describeModalityNote("leo", "gemini")).toBe("Fixed × Mutable = tension");
  });

  it("resolves to the same thematic word regardless of argument order (display order still follows the arguments)", () => {
    expect(describeModalityNote("leo", "gemini")).toBe("Fixed × Mutable = tension");
    expect(describeModalityNote("gemini", "leo")).toBe("Mutable × Fixed = tension");
  });
});
