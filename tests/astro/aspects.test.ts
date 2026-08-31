import { describe, expect, it } from "vitest";
import { angularSeparation, findAspect } from "../../src/astro/aspects.js";

describe("angularSeparation", () => {
  it("is symmetric and takes the shorter arc", () => {
    expect(angularSeparation(10, 350)).toBeCloseTo(20);
    expect(angularSeparation(350, 10)).toBeCloseTo(20);
  });

  it("returns 0 for identical longitudes", () => {
    expect(angularSeparation(123.4, 123.4)).toBeCloseTo(0);
  });

  it("returns 180 for exact opposition", () => {
    expect(angularSeparation(0, 180)).toBeCloseTo(180);
  });
});

describe("findAspect (§5.3 orb table)", () => {
  it("finds an exact conjunction", () => {
    expect(findAspect(10, 10)).toMatchObject({ type: "conjunction", category: "harmonious", orb: 0 });
  });

  it("finds a conjunction at the edge of its 8deg orb", () => {
    expect(findAspect(0, 8)).toMatchObject({ type: "conjunction", orb: 8 });
  });

  it("rejects a conjunction just past its orb", () => {
    expect(findAspect(0, 8.01)).toBeNull();
  });

  it("finds a sextile within its tighter 4deg orb", () => {
    expect(findAspect(0, 63)).toMatchObject({ type: "sextile", category: "harmonious", orb: 3 });
  });

  it("rejects a sextile just past its 4deg orb", () => {
    expect(findAspect(0, 64.5)).toBeNull();
  });

  it("finds a square as challenging", () => {
    expect(findAspect(0, 92)).toMatchObject({ type: "square", category: "challenging", orb: 2 });
  });

  it("finds a trine within orb", () => {
    expect(findAspect(0, 125)).toMatchObject({ type: "trine", category: "harmonious", orb: 5 });
  });

  it("finds an opposition within orb", () => {
    expect(findAspect(10, 185)).toMatchObject({ type: "opposition", category: "challenging", orb: 5 });
  });

  it("returns null in the gap between aspects", () => {
    expect(findAspect(0, 40)).toBeNull();
  });

  it("handles wraparound near 0/360", () => {
    expect(findAspect(355, 3)).toMatchObject({ type: "conjunction", orb: 8 });
  });
});
