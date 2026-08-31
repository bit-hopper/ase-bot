import { describe, expect, it } from "vitest";
import { longitudeToSign, normalizeDegrees } from "../../src/astro/coordinates.js";

describe("normalizeDegrees", () => {
  it("passes through values already in [0, 360)", () => {
    expect(normalizeDegrees(155.5)).toBeCloseTo(155.5);
  });

  it("wraps values >= 360", () => {
    expect(normalizeDegrees(370)).toBeCloseTo(10);
  });

  it("wraps negative values", () => {
    expect(normalizeDegrees(-10)).toBeCloseTo(350);
  });
});

describe("longitudeToSign (§5.2)", () => {
  it("maps 0deg to Aries at 0deg", () => {
    expect(longitudeToSign(0)).toEqual({ sign: "aries", degreeInSign: 0 });
  });

  it("maps 155.21deg to Virgo (Aug 28 sun position)", () => {
    const { sign, degreeInSign } = longitudeToSign(155.211336140384);
    expect(sign).toBe("virgo");
    expect(degreeInSign).toBeCloseTo(5.211336140384);
  });

  it("maps exactly 30deg to the start of Taurus, not the end of Aries", () => {
    expect(longitudeToSign(30)).toEqual({ sign: "taurus", degreeInSign: 0 });
  });

  it("maps 359.99deg to late Pisces", () => {
    const { sign, degreeInSign } = longitudeToSign(359.99);
    expect(sign).toBe("pisces");
    expect(degreeInSign).toBeCloseTo(29.99);
  });

  it("normalizes longitudes outside [0, 360) before mapping", () => {
    expect(longitudeToSign(720 + 45)).toEqual(longitudeToSign(45));
  });
});
