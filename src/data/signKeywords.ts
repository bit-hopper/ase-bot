import type { ZodiacSign } from "./types.js";

/**
 * §4.1 defines /sign ("Returns the user's stored Sun sign and a brief keyword description")
 * but §10 (Output Format) has no corresponding subsection — every other command gets one
 * (§10.1-§10.6), /sign doesn't. This is v1 authored content filling that gap: short,
 * standard astrological keyword phrases, one per sign, following §9.5's voice constraints
 * (short, warm, no fatalism/predictions) even though /sign's output isn't part of the
 * synthesis-block template system.
 */
export const SIGN_KEYWORDS: Record<ZodiacSign, string> = {
  aries: "Bold, direct, first to move.",
  taurus: "Steady, sensual, built to last.",
  gemini: "Curious, quick, fluent in everything.",
  cancer: "Protective, intuitive, deeply loyal.",
  leo: "Warm, magnetic, born to be seen.",
  virgo: "Precise, devoted, quietly relentless.",
  libra: "Charming, fair-minded, seeks balance.",
  scorpio: "Intense, perceptive, all or nothing.",
  sagittarius: "Restless, honest, chasing the horizon.",
  capricorn: "Disciplined, ambitious, plays the long game.",
  aquarius: "Independent, original, a step ahead.",
  pisces: "Dreamy, empathic, fluent in feeling.",
};
