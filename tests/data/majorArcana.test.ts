import { describe, expect, it } from "vitest";
import { MAJOR_ARCANA, majorArcanaByPlanet, majorArcanaBySign } from "../../src/data/majorArcana.js";

describe("MAJOR_ARCANA (§15.1, §15.2)", () => {
  it("has 22 entries numbered 0-21", () => {
    expect(MAJOR_ARCANA).toHaveLength(22);
    expect(MAJOR_ARCANA.map((m) => m.arcanaNumber).sort((a, b) => a - b)).toEqual(
      Array.from({ length: 22 }, (_, i) => i),
    );
  });

  it("every card has exactly one correspondence (sign xor planet)", () => {
    for (const card of MAJOR_ARCANA) {
      const hasSign = card.correspondingSign !== null;
      const hasPlanet = card.correspondingPlanet !== null;
      expect(hasSign !== hasPlanet).toBe(true);
    }
  });

  it("maps Leo to Strength", () => {
    expect(majorArcanaBySign("leo").name).toBe("Strength");
  });

  it("maps Mars to The Tower", () => {
    expect(majorArcanaByPlanet("mars").name).toBe("The Tower");
  });

  it("maps Uranus to The Fool", () => {
    expect(majorArcanaByPlanet("uranus").name).toBe("The Fool");
  });
});
