// [ezo-agents] helper — هل هذا المستخدم وكيل شحن؟
import type { QueryCtx, MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

export async function isRechargeAgent(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
): Promise<boolean> {
  const agent = await ctx.db
    .query("agents")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();
  return !!agent && agent.active;
}

export async function getRechargeAgent(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
) {
  return await ctx.db
    .query("agents")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();
}
