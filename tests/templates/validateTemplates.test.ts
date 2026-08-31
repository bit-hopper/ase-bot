import { describe, expect, it } from "vitest";
import { DECAN_MATRIX } from "../../src/data/decans.js";
import { CARD_ORIENTATIONS, RELATIONSHIP_TYPES } from "../../src/data/types.js";
import { loadReadingTemplates } from "../../src/templates/loadTemplates.js";
import { validateTemplates } from "../../src/templates/validateTemplates.js";
import type { ReadingTemplate } from "../../src/templates/types.js";

function makeCompleteReadingLibrary(): ReadingTemplate[] {
  const templates: ReadingTemplate[] = [];
  for (const decan of DECAN_MATRIX) {
    for (const orientation of CARD_ORIENTATIONS) {
      for (const relationshipType of RELATIONSHIP_TYPES) {
        templates.push({ card: decan.cardKey, orientation, relationshipType, synthesis: "x", closing: "x" });
      }
    }
  }
  return templates;
}

describe("validateTemplates (§17.3)", () => {
  it("reports zero missing /reading combos for a complete 432-entry library", () => {
    const result = validateTemplates(makeCompleteReadingLibrary());
    expect(result.missingReadingCombos).toEqual([]);
  });

  it("detects a single missing combo removed from an otherwise-complete library", () => {
    const templates = makeCompleteReadingLibrary().filter((t) => !(t.card === "seven_of_wands" && t.orientation === "upright" && t.relationshipType === "amplification"));
    const result = validateTemplates(templates);
    expect(result.missingReadingCombos).toEqual(["seven_of_wands|upright|amplification"]);
  });

  it("reports every combo missing for an empty library", () => {
    const result = validateTemplates([]);
    expect(result.missingReadingCombos).toHaveLength(432);
  });

  it("reflects the real project's current (incomplete-by-design) /reading library, with /pull content complete", () => {
    // Engine-only M6 scope: a handful of real /reading combos. All 78 cards' /pull
    // meanings are authored (36 decan-covered from §15.4, 42 Majors/Aces/Courts from
    // the content-authoring pass), so that half of the gap is fully closed.
    const result = validateTemplates(loadReadingTemplates());
    expect(result.missingReadingCombos.length).toBe(432 - loadReadingTemplates().length);
    expect(result.missingPullMeanings).toHaveLength(0);
  });
});
