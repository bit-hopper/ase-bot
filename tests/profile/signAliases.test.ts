import { describe, expect, it } from "vitest";
import { fuzzyMatchSign } from "../../src/profile/signAliases.js";

describe("fuzzyMatchSign", () => {
  it("matches an exact sign name (any case)", () => {
    expect(fuzzyMatchSign("libra")).toBe("libra");
    expect(fuzzyMatchSign("LIBRA")).toBe("libra");
    expect(fuzzyMatchSign("Libra")).toBe("libra");
  });

  it("corrects a one-character typo", () => {
    expect(fuzzyMatchSign("liber")).toBe("libra");
    expect(fuzzyMatchSign("pices")).toBe("pisces");
    expect(fuzzyMatchSign("virgoe")).toBe("virgo");
  });

  it("corrects a transposition-style two-edit typo within the default distance", () => {
    expect(fuzzyMatchSign("scropio")).toBe("scorpio");
  });

  it("returns null for gibberish with no sign close enough", () => {
    expect(fuzzyMatchSign("xyzzy")).toBeNull();
    expect(fuzzyMatchSign("banana")).toBeNull();
  });

  it("respects a tighter maxDistance", () => {
    // "liber" -> "libra" is 2 substitutions (er -> ra), not 1.
    expect(fuzzyMatchSign("liber", 1)).toBeNull();
    expect(fuzzyMatchSign("liber", 2)).toBe("libra");
  });
});
