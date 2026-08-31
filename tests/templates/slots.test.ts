import { describe, expect, it } from "vitest";
import { interpolateSlots } from "../../src/templates/slots.js";

describe("interpolateSlots (§9.2)", () => {
  it("replaces a known slot", () => {
    expect(interpolateSlots("{{sun}} Sun", { sun: "Leo" })).toBe("Leo Sun");
  });

  it("replaces multiple slots", () => {
    expect(interpolateSlots("{{sun}} and {{moon}}", { sun: "Leo", moon: "Pisces" })).toBe("Leo and Pisces");
  });

  it("leaves an unknown slot untouched", () => {
    expect(interpolateSlots("{{mystery}}", {})).toBe("{{mystery}}");
  });

  it("replaces repeated occurrences of the same slot", () => {
    expect(interpolateSlots("{{sun}}, {{sun}}, {{sun}}", { sun: "Leo" })).toBe("Leo, Leo, Leo");
  });

  it("leaves plain text with no slots unchanged", () => {
    expect(interpolateSlots("no slots here", { sun: "Leo" })).toBe("no slots here");
  });
});
