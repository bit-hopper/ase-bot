import { describe, expect, it } from "vitest";
import { oppositeSign, squareSigns, ZODIAC } from "../../src/data/zodiac.js";

describe("ZODIAC", () => {
  it("has all 12 signs with element and modality", () => {
    expect(Object.keys(ZODIAC)).toHaveLength(12);
  });

  it("opposite of Leo is Aquarius", () => {
    expect(oppositeSign("leo")).toBe("aquarius");
  });

  it("opposition is symmetric", () => {
    expect(oppositeSign(oppositeSign("gemini"))).toBe("gemini");
  });

  it("square signs of Leo are Taurus and Scorpio", () => {
    expect(squareSigns("leo").sort()).toEqual(["scorpio", "taurus"]);
  });

  it("square signs share the same modality as the source sign", () => {
    for (const sign of Object.keys(ZODIAC) as Array<keyof typeof ZODIAC>) {
      const [a, b] = squareSigns(sign);
      expect(ZODIAC[a].modality).toBe(ZODIAC[sign].modality);
      expect(ZODIAC[b].modality).toBe(ZODIAC[sign].modality);
    }
  });
});
