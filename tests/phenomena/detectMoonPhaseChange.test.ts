import { describe, expect, it } from "vitest";
import { detectMoonPhaseChange } from "../../src/phenomena/detectMoonPhaseChange.js";

describe("detectMoonPhaseChange", () => {
  it("returns null on a cold start (previous === null), even if current is notable", () => {
    expect(detectMoonPhaseChange(null, "full_moon")).toBeNull();
  });

  it("returns null when the phase hasn't changed", () => {
    expect(detectMoonPhaseChange("waxing_gibbous", "waxing_gibbous")).toBeNull();
  });

  it("fires for a transition into each of the 4 principal phases", () => {
    expect(detectMoonPhaseChange("dark_moon", "new_moon")).toEqual({ type: "moonPhase", phase: "new_moon" });
    expect(detectMoonPhaseChange("waxing_crescent", "first_quarter")).toEqual({ type: "moonPhase", phase: "first_quarter" });
    expect(detectMoonPhaseChange("waxing_gibbous", "full_moon")).toEqual({ type: "moonPhase", phase: "full_moon" });
    expect(detectMoonPhaseChange("waning_gibbous", "last_quarter")).toEqual({ type: "moonPhase", phase: "last_quarter" });
  });

  it("does not fire for a transition into a non-notable phase", () => {
    expect(detectMoonPhaseChange("new_moon", "waxing_crescent")).toBeNull();
    expect(detectMoonPhaseChange("full_moon", "waning_gibbous")).toBeNull();
    expect(detectMoonPhaseChange("waning_crescent", "dark_moon")).toBeNull();
  });
});
