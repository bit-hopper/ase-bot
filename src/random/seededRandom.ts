import { createHash } from "node:crypto";

/**
 * Deterministic float in [0, 1) derived from a string seed via SHA-256 (§7.1).
 * Same seed always produces the same value — used for the /reading and /daily
 * orientation roll, which must be stable within a UTC day but vary across days.
 */
export function seededFloat(seed: string): number {
  const hash = createHash("sha256").update(seed).digest();
  let value = 0n;
  for (let i = 0; i < 6; i++) {
    value = (value << 8n) | BigInt(hash[i]!);
  }
  return Number(value) / Number(1n << 48n);
}

/** Deterministic weighted coin flip: true with probability `probabilityTrue`. */
export function seededRoll(seed: string, probabilityTrue: number): boolean {
  return seededFloat(seed) < probabilityTrue;
}
