import type { PlanetPosition } from "../astro/ephemeris.js";
import { PLANETS, type Planet, type ZodiacSign } from "../data/types.js";

export interface PlanetPhenomenaState {
  sign: ZodiacSign;
  isRetrograde: boolean;
}

export type PhenomenaState = Record<Planet, PlanetPhenomenaState>;

/** Sun and Moon never retrograde — station events only apply to the other 8 tracked bodies. */
export const RETROGRADE_CAPABLE_PLANETS: readonly Planet[] = PLANETS.filter((p) => p !== "sun" && p !== "moon");

export interface StationEvent {
  type: "station";
  planet: Planet;
  direction: "retrograde" | "direct";
  sign: ZodiacSign;
}

export interface IngressEvent {
  type: "ingress";
  planet: Planet;
  fromSign: ZodiacSign;
  toSign: ZodiacSign;
}

export type DetectedEvent = StationEvent | IngressEvent;

export function toPhenomenaState(positions: Record<Planet, PlanetPosition>): PhenomenaState {
  const entries = PLANETS.map((planet) => [planet, { sign: positions[planet].sign, isRetrograde: positions[planet].isRetrograde }] as const);
  return Object.fromEntries(entries) as PhenomenaState;
}

const RETROGRADE_CAPABLE = new Set<Planet>(RETROGRADE_CAPABLE_PLANETS);

/**
 * Pure diff: given the last persisted state and freshly computed current positions, returns
 * every station/ingress that occurred in between. `previous === null` means a cold start (no
 * prior row ever written) — returns [] so a fresh deploy doesn't fire a false "event" for every
 * planet's current state.
 */
export function detectStationsAndIngresses(previous: PhenomenaState | null, current: Record<Planet, PlanetPosition>): DetectedEvent[] {
  if (previous === null) return [];

  const events: DetectedEvent[] = [];

  for (const planet of PLANETS) {
    const prev = previous[planet];
    const now = current[planet];

    if (prev.sign !== now.sign) {
      events.push({ type: "ingress", planet, fromSign: prev.sign, toSign: now.sign });
    }

    if (RETROGRADE_CAPABLE.has(planet) && prev.isRetrograde !== now.isRetrograde) {
      events.push({ type: "station", planet, direction: now.isRetrograde ? "retrograde" : "direct", sign: now.sign });
    }
  }

  return events;
}
