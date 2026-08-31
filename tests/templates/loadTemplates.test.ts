import { describe, expect, it } from "vitest";
import { CARD_ORIENTATIONS, RELATIONSHIP_TYPES } from "../../src/data/types.js";
import { loadReadingTemplates } from "../../src/templates/loadTemplates.js";

describe("loadReadingTemplates", () => {
  it("loads the real templates/readings.json as a well-formed array", () => {
    const templates = loadReadingTemplates();
    expect(Array.isArray(templates)).toBe(true);
    expect(templates.length).toBeGreaterThan(0);

    for (const t of templates) {
      expect(typeof t.card).toBe("string");
      expect(CARD_ORIENTATIONS).toContain(t.orientation);
      expect(RELATIONSHIP_TYPES).toContain(t.relationshipType);
      expect(typeof t.synthesis).toBe("string");
      expect(typeof t.closing).toBe("string");
      expect(t.synthesis.length).toBeGreaterThan(0);
    }
  });
});
