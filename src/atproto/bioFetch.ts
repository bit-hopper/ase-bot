import type { AtpAgent } from "@atproto/api";
import type { BioLookup } from "../profile/profileResolver.js";

/** Implements M4's `fetchBio` seam — a public, unauthenticated-scope profile read (no OAuth needed). */
export function createBioFetcher(agent: AtpAgent): (did: string) => Promise<BioLookup | null> {
  return async (did: string): Promise<BioLookup | null> => {
    try {
      const { data } = await agent.getProfile({ actor: did });
      const bioRaw = data.description;
      if (!bioRaw) return null;

      const lookup: BioLookup = { bioRaw, handle: data.handle };
      if (data.displayName) lookup.displayName = data.displayName;
      return lookup;
    } catch {
      return null; // profile not found / not resolvable — treated as "no bio" by the resolver
    }
  };
}
