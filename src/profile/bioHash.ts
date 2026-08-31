import { createHash } from "node:crypto";

/** §3.4 — bio_hash used to detect whether a user's bio changed since it was last parsed. */
export function hashBio(bioRaw: string): string {
  return createHash("sha256").update(bioRaw).digest("hex");
}
