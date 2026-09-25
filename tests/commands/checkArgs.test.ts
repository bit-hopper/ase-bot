import { describe, expect, it } from "vitest";
import { CHECK_USAGE, parseCheckArgs } from "../../src/commands/checkArgs.js";

describe("parseCheckArgs (§4.3)", () => {
  it("accepts a valid planet name", () => {
    expect(parseCheckArgs("venus")).toEqual({ mode: "single", planet: "venus" });
  });

  it("is case-insensitive", () => {
    expect(parseCheckArgs("Venus")).toEqual({ mode: "single", planet: "venus" });
    expect(parseCheckArgs("VENUS")).toEqual({ mode: "single", planet: "venus" });
  });

  it("trims surrounding whitespace", () => {
    expect(parseCheckArgs("  mars  ")).toEqual({ mode: "single", planet: "mars" });
  });

  it("accepts 'all', case-insensitively and trimmed", () => {
    expect(parseCheckArgs("all")).toEqual({ mode: "all" });
    expect(parseCheckArgs("ALL")).toEqual({ mode: "all" });
    expect(parseCheckArgs("  all  ")).toEqual({ mode: "all" });
  });

  it("accepts 'retrograde', case-insensitively", () => {
    expect(parseCheckArgs("retrograde")).toEqual({ mode: "retrograde" });
    expect(parseCheckArgs("Retrograde")).toEqual({ mode: "retrograde" });
  });

  it("returns the usage error for an unrecognized body", () => {
    expect(parseCheckArgs("pizza")).toEqual({ error: CHECK_USAGE });
  });

  it("returns the usage error for a missing argument", () => {
    expect(parseCheckArgs("")).toEqual({ error: CHECK_USAGE });
  });
});
