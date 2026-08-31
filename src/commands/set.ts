import type { ReplyThread } from "../output/replyThread.js";
import { titleCase } from "../output/textUtils.js";
import { applySetCommand } from "../profile/setCommand.js";
import type { CommandContext } from "./context.js";

const USAGE = "Usage: /set sun [sign] moon [sign] rising [sign]";

/** §3.3 / §4.3 */
export async function handleSet(ctx: CommandContext, args: string): Promise<ReplyThread> {
  const result = await applySetCommand(ctx.pool, ctx.did, args, { writeAseRecord: ctx.writeAseRecord });

  if (!result.stored) {
    return [result.errors.length > 0 ? result.errors.join(" ") : USAGE];
  }

  const confirmedParts = (["sun", "moon", "rising"] as const)
    .filter((field) => result.placements[field])
    .map((field) => `${titleCase(field)}: ${titleCase(result.placements[field]!)}`);

  const confirmation = `✔️ Updated — ${confirmedParts.join(", ")}`;
  if (result.errors.length > 0) {
    return [`${confirmation}\n⚠️ ${result.errors.join(" ")}`];
  }
  return [confirmation];
}
