import { formatSign } from "../output/formatSign.js";
import type { ReplyThread } from "../output/replyThread.js";
import { resolveProfile } from "../profile/profileResolver.js";
import type { CommandContext } from "./context.js";

/** §4.1 */
export async function handleSign(ctx: CommandContext): Promise<ReplyThread> {
  const placements = await resolveProfile(ctx.pool, ctx.did, ctx.resolverDeps);
  return formatSign(placements.sun.value);
}
