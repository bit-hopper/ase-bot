import type { ZodiacSign } from "../data/types.js";

/** §3.1 profile source priority order. */
export type ProfileSource = "ase_record" | "cache" | "bio" | "command";

export interface PlacementValue {
  value: ZodiacSign | null;
  confidence: number;
}

/** §3.2 — the bio parser's (and, by extension, the Profile Resolver's) output shape. */
export interface ParsedPlacements {
  sun: PlacementValue;
  moon: PlacementValue;
  rising: PlacementValue;
  source: ProfileSource;
}
