import { describe, expect, it } from "vitest";
import { CHECK_USAGE, parseCheckArgs } from "../../src/commands/checkArgs.js";

describe("parseCheckArgs (§4.3)", () => {
  it("accepts a valid planet name", () => {
    expect(parseCheckArgs("venus")).toEqual({ planet: "venus" });
  });

  it("is case-insensitive", () => {
    expect(parseCheckArgs("Venus")).toEqual({ planet: "venus" });
    expect(parseCheckArgs("VENUS")).toEqual({ planet: "venus" });
  });

  it("trims surrounding whitespace", () => {
    expect(parseCheckArgs("  mars  ")).toEqual({ planet: "mars" });
  });

  it("returns the usage error for an unrecognized body", () => {
    expect(parseCheckArgs("pizza")).toEqual({ error: CHECK_USAGE });
  });

  it("returns the usage error for a missing argument", () => {
    expect(parseCheckArgs("")).toEqual({ error: CHECK_USAGE });
  });
});
