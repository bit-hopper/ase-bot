import { describe, expect, it } from "vitest";
import { seededFloat, seededRoll } from "../../src/random/seededRandom.js";

describe("seededFloat", () => {
  it("is deterministic for the same seed", () => {
    const seed = "did:plc:abc123:2026-08-28:mars:seven_of_wands";
    expect(seededFloat(seed)).toBe(seededFloat(seed));
  });

  it("varies across different seeds", () => {
    const a = seededFloat("did:plc:abc:2026-08-28:mars:seven_of_wands");
    const b = seededFloat("did:plc:abc:2026-08-29:mars:seven_of_wands");
    expect(a).not.toBe(b);
  });

  it("stays within [0, 1)", () => {
    for (let i = 0; i < 200; i++) {
      const v = seededFloat(`seed-${i}`);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("is roughly uniform across many seeds", () => {
    let sum = 0;
    const n = 5000;
    for (let i = 0; i < n; i++) sum += seededFloat(`bucket-${i}`);
    expect(sum / n).toBeGreaterThan(0.45);
    expect(sum / n).toBeLessThan(0.55);
  });
});

describe("seededRoll", () => {
  it("is deterministic", () => {
    const seed = "some-stable-seed";
    expect(seededRoll(seed, 0.9)).toBe(seededRoll(seed, 0.9));
  });

  it("probability 0 never rolls true, probability 1 always rolls true", () => {
    for (let i = 0; i < 50; i++) {
      expect(seededRoll(`seed-${i}`, 0)).toBe(false);
      expect(seededRoll(`seed-${i}`, 1)).toBe(true);
    }
  });
});
