import type { MoonPhase } from "../data/types.js";

/** The 4 phases people actually post about — the other 5 MoonPhase values (waxing/waning
 *  crescent/gibbous, dark_moon) are gradual descriptive states with no one precise culminating
 *  moment, unlike a sign ingress or these 4 phases' exact conjunction/quadrature instants. */
export type NotableMoonPhase = "new_moon" | "first_quarter" | "full_moon" | "last_quarter";

const NOTABLE_PHASES = new Set<MoonPhase>(["new_moon", "first_quarter", "full_moon", "last_quarter"]);

export interface MoonPhaseEvent {
  type: "moonPhase";
  phase: NotableMoonPhase;
}

/**
 * Pure diff, mirroring detectStationsAndIngresses.ts's cold-start convention: previous === null
 * (no prior row ever written) never fires an event, even if current happens to be a notable
 * phase. A transition into any of the 5 non-notable phases is silently ignored (still updates
 * persisted state — see phenomenaState.ts — just never posts).
 */
export function detectMoonPhaseChange(previous: MoonPhase | null, current: MoonPhase): MoonPhaseEvent | null {
  if (previous === null || previous === current) return null;
  if (!NOTABLE_PHASES.has(current)) return null;
  return { type: "moonPhase", phase: current as NotableMoonPhase };
}
