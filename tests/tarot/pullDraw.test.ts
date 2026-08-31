import { describe, expect, it } from "vitest";
import { MAJOR_ARCANA_CARDS, MINOR_ARCANA_CARDS } from "../../src/data/deck.js";
import { drawPullCard } from "../../src/tarot/pullDraw.js";

describe("drawPullCard (§6.4)", () => {
  it("always returns a card from the full 78-card deck", () => {
    for (let i = 0; i < 200; i++) {
      const card = drawPullCard();
      expect(card.type === "major" || card.type === "minor").toBe(true);
    }
  });

  it("draws Major Arcana ~65% of the time over many trials", () => {
    let majorCount = 0;
    const n = 4000;
    for (let i = 0; i < n; i++) {
      if (drawPullCard().type === "major") majorCount++;
    }
    expect(majorCount / n).toBeGreaterThan(0.6);
    expect(majorCount / n).toBeLessThan(0.7);
  });

  it("covers the full range of both pools over many trials", () => {
    const seenMajor = new Set<string>();
    const seenMinor = new Set<string>();
    for (let i = 0; i < 6000; i++) {
      const card = drawPullCard();
      if (card.type === "major") seenMajor.add(card.key);
      else seenMinor.add(card.key);
    }
    expect(seenMajor.size).toBe(MAJOR_ARCANA_CARDS.length);
    expect(seenMinor.size).toBe(MINOR_ARCANA_CARDS.length);
  });
});
