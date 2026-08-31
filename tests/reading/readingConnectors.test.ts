import { describe, expect, it } from "vitest";
import { RELATIONSHIP_TYPES } from "../../src/data/types.js";
import {
  moonConnector,
  sunConnector,
  type MoodConnectorKey,
  type ThemeConnectorKey,
} from "../../src/reading/readingConnectors.js";

const THEME_KEYS: ThemeConnectorKey[] = [...RELATIONSHIP_TYPES, "noNatalSun"];
const MOOD_KEYS: MoodConnectorKey[] = [...RELATIONSHIP_TYPES, "noNatalMoon"];

describe("sunConnector / moonConnector", () => {
  it("has a non-empty connector for every relationship type, plus the no-natal-placement fallback", () => {
    for (const key of THEME_KEYS) expect(sunConnector(key).length).toBeGreaterThan(0);
    for (const key of MOOD_KEYS) expect(moonConnector(key).length).toBeGreaterThan(0);
  });

  it("the no-natal-placement fallbacks never reference a natal sign slot", () => {
    expect(sunConnector("noNatalSun")).not.toContain("{{natalSunSign}}");
    expect(moonConnector("noNatalMoon")).not.toContain("{{natalMoonSign}}");
  });

  it("has no exact-duplicate connector text across the Sun and Moon libraries (both always render together)", () => {
    const sunTexts = THEME_KEYS.map(sunConnector);
    const moonTexts = MOOD_KEYS.map(moonConnector);
    for (const text of sunTexts) expect(moonTexts).not.toContain(text);
  });
});
