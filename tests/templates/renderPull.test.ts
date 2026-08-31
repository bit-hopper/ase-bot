import { describe, expect, it } from "vitest";
import { findCardByKey } from "../../src/data/deck.js";
import type { TarotCardMeta } from "../../src/data/types.js";
import { renderPullOutput } from "../../src/templates/renderPull.js";

describe("renderPullOutput (§9.4)", () => {
  it("assembles a Minor Arcana pip card with its element and verbatim meaning", () => {
    const card = findCardByKey("seven_of_wands");
    const result = renderPullOutput(card, "upright");

    expect(result.cardName).toBe("Seven of Wands");
    expect(result.orientationLine).toBe("Upright · Fire");
    expect(result.meaning).toBe("Defending your position, high ground");
  });

  it("uses the reversed meaning when reversed", () => {
    const card = findCardByKey("seven_of_wands");
    const result = renderPullOutput(card, "reversed");
    expect(result.meaning).toBe("Exhaustion, yielding under pressure");
  });

  it("labels Major Arcana cards with 'Major Arcana' instead of an element", () => {
    const card = findCardByKey("the_star");
    const result = renderPullOutput(card, "upright");
    expect(result.orientationLine).toBe("Upright · Major Arcana");
  });

  it("returns a dev-time placeholder for cards with no authored meaning yet", () => {
    const card: TarotCardMeta = {
      key: "unauthored_card",
      name: "Unauthored Card",
      type: "major",
      suit: null,
      element: null,
      arcanaNumber: 0,
      number: null,
      courtRank: null,
      decanRuler: null,
      uprightMeaning: null,
      reversedMeaning: null,
    };
    const result = renderPullOutput(card, "upright");
    expect(result.meaning).toBe("[Card meaning pending: Unauthored Card · upright]");
  });
});
