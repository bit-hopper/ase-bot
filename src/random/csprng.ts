import { randomInt } from "node:crypto";

/**
 * True (non-seeded) CSPRNG helpers for /pull (§6.4: "uses true randomness (CSPRNG).
 * It is not seeded by date.") — distinct from seededRandom.ts, which /reading and
 * /daily use for their day-stable orientation roll.
 */

const RESOLUTION = 1_000_000;

/** Cryptographically random float in [0, 1). */
export function randomFloat(): number {
  return randomInt(0, RESOLUTION) / RESOLUTION;
}

/** Cryptographically random boolean, true with probability `probabilityTrue`. */
export function randomBool(probabilityTrue = 0.5): boolean {
  return randomFloat() < probabilityTrue;
}

/** Uniformly picks one element from a non-empty array using the CSPRNG. */
export function randomChoice<T>(items: readonly T[]): T {
  if (items.length === 0) {
    throw new Error("randomChoice: items must be non-empty");
  }
  return items[randomInt(0, items.length)]!;
}
