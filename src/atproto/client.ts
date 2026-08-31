import { AtpAgent } from "@atproto/api";
import { loadEnv } from "../config/env.js";

let agent: AtpAgent | null = null;

/**
 * §11.1 — dedicated app password auth. §11.2: "The bot's DID is resolved once at startup and
 * cached" — `agent.did` after a successful login is exactly that resolved/authoritative DID
 * (not just whatever ASE_DID happens to say in .env, which could be stale or a placeholder).
 */
export async function createAuthenticatedAgent(): Promise<AtpAgent> {
  if (agent) return agent;

  const env = loadEnv();
  const newAgent = new AtpAgent({ service: "https://bsky.social" });
  await newAgent.login({ identifier: env.aseHandle, password: env.aseAppPassword });

  if (!newAgent.did) {
    throw new Error("Login succeeded but no DID was returned");
  }

  agent = newAgent;
  return agent;
}

export function getBotDid(agentInstance: AtpAgent): string {
  if (!agentInstance.did) {
    throw new Error("Agent is not authenticated");
  }
  return agentInstance.did;
}
