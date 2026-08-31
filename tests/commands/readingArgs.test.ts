import { describe, expect, it } from "vitest";
import { parseReadingArgs } from "../../src/commands/readingArgs.js";

describe("parseReadingArgs", () => {
  it("returns no overrides and no errors for empty input", () => {
    expect(parseReadingArgs("")).toEqual({ overrides: {}, errors: [] });
    expect(parseReadingArgs("   ")).toEqual({ overrides: {}, errors: [] });
  });

  it("parses a single field/sign pair", () => {
    expect(parseReadingArgs("sun libra")).toEqual({ overrides: { sun: "libra" }, errors: [] });
  });

  it("parses multiple pairs in any order", () => {
    expect(parseReadingArgs("moon pisces sun libra rising aquarius")).toEqual({
      overrides: { moon: "pisces", sun: "libra", rising: "aquarius" },
      errors: [],
    });
  });

  it("is case-insensitive on both field and sign", () => {
    expect(parseReadingArgs("SUN Libra")).toEqual({ overrides: { sun: "libra" }, errors: [] });
  });

  it("aliases 'ascendant' to 'rising'", () => {
    expect(parseReadingArgs("ascendant aquarius")).toEqual({ overrides: { rising: "aquarius" }, errors: [] });
  });

  it("corrects a typo'd sign via fuzzy matching", () => {
    expect(parseReadingArgs("sun liber")).toEqual({ overrides: { sun: "libra" }, errors: [] });
    expect(parseReadingArgs("moon pices")).toEqual({ overrides: { moon: "pisces" }, errors: [] });
  });

  it("reports an error for an unknown field keyword", () => {
    const result = parseReadingArgs("mars aries");
    expect(result.overrides).toEqual({});
    expect(result.errors[0]).toMatch(/Unknown field/);
  });

  it("reports an error for a sign too far from any valid sign to guess", () => {
    const result = parseReadingArgs("sun banana");
    expect(result.overrides).toEqual({});
    expect(result.errors[0]).toMatch(/Unrecognized sign/);
  });

  it("reports an error for a dangling field with no sign after it", () => {
    const result = parseReadingArgs("sun libra moon");
    expect(result.overrides).toEqual({ sun: "libra" });
    expect(result.errors[0]).toMatch(/Missing sign value/);
  });
});
