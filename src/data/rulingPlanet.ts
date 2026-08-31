import type { Planet, ZodiacSign } from "./types.js";

/**
 * Modern-rulership Sun/Rising-sign -> ruling-planet table for the /reading command's
 * "Ground" axis (spec §6.9, §15.6). Chosen for consistency with how
 * majorArcana.ts already uses the outer planets elsewhere (Pluto->Judgement, Uranus->Fool,
 * Neptune->Hanged Man) rather than the traditional 7-visible-planet system.
 */
const RULING_PLANET: Record<ZodiacSign, Planet> = {
  aries: "mars",
  taurus: "venus",
  gemini: "mercury",
  cancer: "moon",
  leo: "sun",
  virgo: "mercury",
  libra: "venus",
  scorpio: "pluto",
  sagittarius: "jupiter",
  capricorn: "saturn",
  aquarius: "uranus",
  pisces: "neptune",
};

export function rulingPlanetOf(sign: ZodiacSign): Planet {
  return RULING_PLANET[sign];
}
