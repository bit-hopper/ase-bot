import { describe, expect, it } from "vitest";
import { renderBigThree } from "../../src/templates/renderBigThree.js";
import { majorArcanaBySign } from "../../src/data/majorArcana.js";
import { houseDomain } from "../../src/data/houseDomains.js";
import type { BigThreeSelection } from "../../src/reading/bigThreeSelection.js";
import type { NatalPlacements } from "../../src/tarot/natal.js";

describe("renderBigThree", () => {
  const selection: BigThreeSelection = {
    card: majorArcanaBySign("virgo"),
    currentSunSign: "virgo",
    currentMoonSign: "pisces",
    themeRelationship: "harmony",
    moodRelationship: "resonance",
    ground: {
      rulingPlanet: "uranus",
      rulingPlanetSign: "taurus",
      house: 4,
      domain: houseDomain(4),
    },
  };
  const natal: NatalPlacements = { sun: "cancer", moon: "scorpio", rising: "aquarius" };

  it("builds the theme header line from the card name and current Sun season", () => {
    expect(renderBigThree(selection, natal).themeHeaderLine).toBe("The Hermit — Virgo season");
  });

  it("builds theme text as the card's upright meaning plus the interpolated Sun connector", () => {
    const { themeText } = renderBigThree(selection, natal);
    expect(themeText).toBe(
      "Solitary searching for deeper truth, quiet introspection, wisdom that becomes guidance for others. " +
        "Virgo's focus complements your Cancer instincts — different rhythms, easy to move in together.",
    );
  });

  it("builds mood text from the interpolated Moon connector", () => {
    expect(renderBigThree(selection, natal).moodHeaderLine).toBe("Moon in Pisces");
    expect(renderBigThree(selection, natal).moodText).toBe(
      "Transiting Pisces moves with the same current as your natal Scorpio Moon — " +
        "today's feelings arrive undiluted, not at odds with your usual depth.",
    );
  });

  it("builds the ground header line from ruling planet, sign, ordinal house, and domain name", () => {
    const { ground } = renderBigThree(selection, natal);
    expect(ground?.headerLine).toBe("Uranus in Taurus · 4th House — Home & Roots");
    expect(ground?.text).toBe(houseDomain(4).blurb);
  });

  it("omits ground entirely when the selection has none", () => {
    const noGround: BigThreeSelection = { ...selection, ground: null };
    expect(renderBigThree(noGround, natal).ground).toBeNull();
  });

  it("builds a closing line referencing the theme card", () => {
    expect(renderBigThree(selection, natal).closing).toBe("What is The Hermit asking you to notice today?");
  });

  it("never leaves an unfilled {{slot}} in the rendered output when natal placements are set", () => {
    const rendered = renderBigThree(selection, natal);
    const combined = [rendered.themeText, rendered.moodText, rendered.ground?.text ?? ""].join(" ");
    expect(combined).not.toMatch(/\{\{\w+\}\}/);
  });

  it("still renders cleanly (no leftover slots) when there are no natal placements at all", () => {
    const fallbackSelection: BigThreeSelection = { ...selection, themeRelationship: "noNatalSun", moodRelationship: "noNatalMoon", ground: null };
    const rendered = renderBigThree(fallbackSelection, { sun: null, moon: null, rising: null });
    const combined = [rendered.themeText, rendered.moodText].join(" ");
    expect(combined).not.toMatch(/\{\{\w+\}\}/);
  });
});
