import { describe, expect, it } from "vitest";
import { randomBool, randomChoice, randomFloat } from "../../src/random/csprng.js";

describe("randomFloat", () => {
  it("stays within [0, 1)", () => {
    for (let i = 0; i < 500; i++) {
      const v = randomFloat();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe("randomBool", () => {
  it("respects probability 0 and 1", () => {
    for (let i = 0; i < 50; i++) {
      expect(randomBool(0)).toBe(false);
      expect(randomBool(1)).toBe(true);
    }
  });

  it("is roughly balanced at 0.5 over many trials", () => {
    let trueCount = 0;
    const n = 4000;
    for (let i = 0; i < n; i++) if (randomBool()) trueCount++;
    expect(trueCount / n).toBeGreaterThan(0.45);
    expect(trueCount / n).toBeLessThan(0.55);
  });
});

describe("randomChoice", () => {
  it("throws on an empty array", () => {
    expect(() => randomChoice([])).toThrow();
  });

  it("only ever returns items from the input array", () => {
    const items = ["a", "b", "c"];
    for (let i = 0; i < 100; i++) {
      expect(items).toContain(randomChoice(items));
    }
  });

  it("covers all items over many trials", () => {
    const items = [1, 2, 3, 4];
    const seen = new Set<number>();
    for (let i = 0; i < 500; i++) seen.add(randomChoice(items));
    expect(seen.size).toBe(4);
  });
});
