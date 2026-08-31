import { describe, expect, it } from "vitest";
import { FULL_DECK, MAJOR_ARCANA_CARDS, MINOR_ARCANA_CARDS, findCardByKey } from "../../src/data/deck.js";

describe("FULL_DECK (§6.1)", () => {
  it("has 78 cards total: 22 major + 56 minor", () => {
    expect(MAJOR_ARCANA_CARDS).toHaveLength(22);
    expect(MINOR_ARCANA_CARDS).toHaveLength(56);
    expect(FULL_DECK).toHaveLength(78);
  });

  it("breaks minor arcana into 36 pips + 16 court + 4 aces", () => {
    const pips = MINOR_ARCANA_CARDS.filter((c) => c.number !== null && c.number >= 2 && c.number <= 10);
    const aces = MINOR_ARCANA_CARDS.filter((c) => c.number === 1);
    const court = MINOR_ARCANA_CARDS.filter((c) => c.courtRank !== null);

    expect(pips).toHaveLength(36);
    expect(aces).toHaveLength(4);
    expect(court).toHaveLength(16);
  });

  it("has unique keys across the whole deck", () => {
    const keys = FULL_DECK.map((c) => c.key);
    expect(new Set(keys).size).toBe(78);
  });

  it("only assigns a decanRuler to the 36 pip cards", () => {
    const withRuler = FULL_DECK.filter((c) => c.decanRuler !== null);
    expect(withRuler).toHaveLength(36);
    expect(withRuler.every((c) => c.type === "minor" && c.number !== null && c.number >= 2)).toBe(true);
  });

  it("resolves a known card by key", () => {
    expect(findCardByKey("seven_of_wands").name).toBe("Seven of Wands");
    expect(findCardByKey("the_star").name).toBe("The Star");
  });

  it("throws for an unknown key", () => {
    expect(() => findCardByKey("nonexistent_card")).toThrow();
  });
});
