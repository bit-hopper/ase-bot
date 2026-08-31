import type { AtpAgent } from "@atproto/api";

/** DID -> current handle. The firehose only gives us the author's DID; §12.2's job payload needs the handle too. */
export function createHandleResolver(agent: AtpAgent): (did: string) => Promise<string> {
  return async (did: string): Promise<string> => {
    try {
      const { data } = await agent.getProfile({ actor: did });
      return data.handle;
    } catch {
      return did; // still a valid (if less friendly) identifier if resolution fails
    }
  };
}
