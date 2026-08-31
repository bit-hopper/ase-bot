import { describe, expect, it } from "vitest";
import { routeToDecan } from "../../src/tarot/decanRouter.js";

describe("routeToDecan", () => {
  it("routes a sign/degree to the matching decan card", () => {
    const decan = routeToDecan({ sign: "leo", degreeInSign: 25 }); // Leo 3rd decan
    expect(decan.cardKey).toBe("seven_of_wands");
    expect(decan.chaldeanRuler).toBe("mars");
  });

  it("respects the half-open decan boundary", () => {
    expect(routeToDecan({ sign: "leo", degreeInSign: 9.9998 }).decan).toBe(1);
    expect(routeToDecan({ sign: "leo", degreeInSign: 10 }).decan).toBe(2);
  });
});
