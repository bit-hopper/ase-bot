import { describe, expect, it } from "vitest";
import { selectReadingTemplate } from "../../src/templates/templateSelector.js";
import type { ReadingTemplate } from "../../src/templates/types.js";

const TEMPLATES: ReadingTemplate[] = [
  { card: "seven_of_wands", orientation: "upright", relationshipType: "amplification", synthesis: "exact match text", closing: "exact closing" },
  { card: "seven_of_wands", orientation: "upright", relationshipType: "neutral", synthesis: "neutral fallback text", closing: "neutral closing" },
];

const CARD_MEANING = { cardName: "Seven of Wands", uprightMeaning: "Defending your position, high ground", reversedMeaning: "Exhaustion, yielding under pressure" };

describe("selectReadingTemplate fallback chain (§9.3)", () => {
  it("tier exact: returns the exact card x orientation x relationshipType match", () => {
    const result = selectReadingTemplate(TEMPLATES, { card: "seven_of_wands", orientation: "upright", relationshipType: "amplification" }, CARD_MEANING);
    expect(result).toEqual({ synthesis: "exact match text", closing: "exact closing", tier: "exact" });
  });

  it("tier 1: falls back to the neutral template for the same card/orientation", () => {
    const result = selectReadingTemplate(TEMPLATES, { card: "seven_of_wands", orientation: "upright", relationshipType: "tension" }, CARD_MEANING);
    expect(result).toEqual({ synthesis: "neutral fallback text", closing: "neutral closing", tier: "neutral_fallback" });
  });

  it("tier 2: falls back to the card's raw meaning when even neutral is missing", () => {
    const result = selectReadingTemplate(TEMPLATES, { card: "seven_of_wands", orientation: "reversed", relationshipType: "tension" }, CARD_MEANING);
    expect(result).toEqual({ synthesis: "Exhaustion, yielding under pressure", closing: "", tier: "raw_meaning_fallback" });
  });

  it("tier 3: falls back to the dev-only placeholder when nothing at all is available", () => {
    const noMeaning = { cardName: "Two of Cups", uprightMeaning: null, reversedMeaning: null };
    const result = selectReadingTemplate([], { card: "two_of_cups", orientation: "upright", relationshipType: "harmony" }, noMeaning);
    expect(result.tier).toBe("placeholder");
    expect(result.synthesis).toBe("[Template pending: Two of Cups · upright · harmony]");
    expect(result.closing).toBe("");
  });

  it("does not neutral-fallback into itself when the request already is neutral and missing", () => {
    const result = selectReadingTemplate(TEMPLATES, { card: "seven_of_wands", orientation: "reversed", relationshipType: "neutral" }, CARD_MEANING);
    expect(result.tier).toBe("raw_meaning_fallback"); // not an infinite neutral loop
  });
});
