import type { DecanEntry, Planet, ZodiacSign } from "../data/types.js";
import { routeToDecan } from "./decanRouter.js";
import { selectAnchorTransit, type AnchorTransit } from "./impactScore.js";
import type { NatalPlacements } from "./natal.js";
import { computeReadingOrientation, type OrientationResult } from "./readingOrientation.js";

export interface TransitSnapshot {
  sign: ZodiacSign;
  degreeInSign: number;
  longitude: number;
  isRetrograde: boolean;
}

export interface ReadingSelectionSeed {
  did: string;
  /** YYYY-MM-DD (UTC) — the day this selection must stay stable within. */
  date: string;
}

export interface ReadingSelection {
  anchor: AnchorTransit;
  decan: DecanEntry;
  orientation: OrientationResult;
}

/**
 * §6.2/§6.3/§7 — the shared decan-based selection pipeline for both /reading and
 * /daily. The two commands differ only in which `positions` snapshot they pass in:
 * /reading uses live "now" positions, /daily uses positions pinned to 00:00 UTC of
 * the target day so repeated calls the same day return the same card and
 * orientation (see plan decision on the §6.2/§6.5 spec contradiction).
 */
export function selectReadingCard(
  positions: Record<Planet, TransitSnapshot>,
  natal: NatalPlacements,
  seed: ReadingSelectionSeed,
): ReadingSelection {
  const anchor = selectAnchorTransit(positions, natal);
  const anchorPosition = positions[anchor.planet];
  const decan = routeToDecan(anchorPosition);

  const orientation = computeReadingOrientation({
    isRetrograde: anchorPosition.isRetrograde,
    aspectCategory: anchor.aspect?.category ?? null,
    seed: `${seed.did}:${seed.date}:${anchor.planet}:${decan.cardKey}`,
  });

  return { anchor, decan, orientation };
}
