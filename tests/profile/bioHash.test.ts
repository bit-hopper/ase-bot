import { describe, expect, it } from "vitest";
import { hashBio } from "../../src/profile/bioHash.js";

describe("hashBio", () => {
  it("is deterministic", () => {
    expect(hashBio("Leo Sun")).toBe(hashBio("Leo Sun"));
  });

  it("differs for different input", () => {
    expect(hashBio("Leo Sun")).not.toBe(hashBio("Aries Sun"));
  });

  it("produces a 64-char hex string (SHA-256)", () => {
    expect(hashBio("anything")).toMatch(/^[0-9a-f]{64}$/);
  });
});
