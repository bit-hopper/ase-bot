import type { MoonPhase } from "../data/types.js";

export function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function moonPhaseLabel(phase: MoonPhase): string {
  return phase.split("_").map(titleCase).join(" ");
}
