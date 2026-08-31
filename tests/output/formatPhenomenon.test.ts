import { describe, expect, it } from "vitest";
import { formatEclipseEvent, formatIngressEvent, formatMoonPhaseEvent, formatStationEvent } from "../../src/output/formatPhenomenon.js";

describe("formatPhenomenon", () => {
  it("formats a retrograde station", () => {
    expect(formatStationEvent({ type: "station", planet: "mercury", direction: "retrograde", sign: "virgo" })).toEqual([
      "Mercury turns retrograde in Virgo.",
    ]);
  });

  it("formats a direct station", () => {
    expect(formatStationEvent({ type: "station", planet: "saturn", direction: "direct", sign: "pisces" })).toEqual([
      "Saturn turns direct in Pisces.",
    ]);
  });

  it("formats an ingress using the destination sign", () => {
    expect(formatIngressEvent({ type: "ingress", planet: "sun", fromSign: "virgo", toSign: "libra" })).toEqual([
      "Sun enters Libra.",
    ]);
  });

  it("formats a lunar eclipse", () => {
    expect(
      formatEclipseEvent({ kind: "lunar", jdUt: 0, date: new Date("2027-02-20T00:00:00Z"), sign: "virgo" }),
    ).toEqual(["Lunar eclipse in Virgo on 2027-02-20."]);
  });

  it("formats a solar eclipse", () => {
    expect(
      formatEclipseEvent({ kind: "solar", jdUt: 0, date: new Date("2027-02-06T00:00:00Z"), sign: "aquarius" }),
    ).toEqual(["Solar eclipse in Aquarius on 2027-02-06."]);
  });

  it("formats each of the 4 principal moon phases", () => {
    expect(formatMoonPhaseEvent({ type: "moonPhase", phase: "new_moon" })).toEqual(["New Moon today."]);
    expect(formatMoonPhaseEvent({ type: "moonPhase", phase: "first_quarter" })).toEqual(["First Quarter today."]);
    expect(formatMoonPhaseEvent({ type: "moonPhase", phase: "full_moon" })).toEqual(["Full Moon today."]);
    expect(formatMoonPhaseEvent({ type: "moonPhase", phase: "last_quarter" })).toEqual(["Last Quarter today."]);
  });
});
