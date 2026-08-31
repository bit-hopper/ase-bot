import type { MoonPhase } from "./types.js";

/** §10.5 needs a "1-2 sentence interpretation" per moon phase; §9's template library only
 *  covers /reading's decan cards and /pull's card meanings, not this. Small, self-contained
 *  authored content (9 short phrases) — same low-stakes caveat as signKeywords.ts. */
export const MOON_PHASE_INTERPRETATION: Record<MoonPhase, string> = {
  new_moon: "A blank page. Whatever you plant now grows quietly before it shows.",
  waxing_crescent: "Early momentum. Keep going — you don't need proof yet, just motion.",
  first_quarter: "Friction is part of the plan. Push through the resistance, not around it.",
  waxing_gibbous: "Almost there. Refine what you've built instead of starting something new.",
  full_moon: "Everything is visible now. Let what's working shine, let what isn't fall away.",
  waning_gibbous: "Time to share what you've learned — teaching it back locks it in.",
  last_quarter: "Release what's outlived its purpose. Clearing space is its own kind of progress.",
  waning_crescent: "Rest before the reset. Stillness now is preparation, not stalling.",
  dark_moon: "The quiet before the page turns. Let yourself not know yet.",
};
