import { MOON_PHASE_INTERPRETATION } from "../data/moonPhaseInterpretations.js";
import type { MoonPhase, ZodiacSign } from "../data/types.js";
import type { ReplyThread } from "./replyThread.js";
import { moonPhaseLabel, titleCase } from "./textUtils.js";

/** §10.5 */
export function formatMoon(moonSign: ZodiacSign, moonPhase: MoonPhase): ReplyThread {
  return [`🌙 Moon in ${titleCase(moonSign)} · ${moonPhaseLabel(moonPhase)}\n\n${MOON_PHASE_INTERPRETATION[moonPhase]}`];
}
