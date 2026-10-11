import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireUser } from "./lib/auth";

// ============================================================
// [moorawi-relations] myRelations — علاقاتي النشطة
// ============================================================
export const myRelations = query({
  args: { tokenOverride: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    if (!me) return [];

    // اجمع علاقاتي (userId1 أو userId2)
    const asUser1 = await ctx.db
      .query("relationships")
      .withIndex("by_user1", (q) => q.eq("userId1", me._id))
      .collect();
    const asUser2 = await ctx.db
      .query("relationships")
      .withIndex("by_user2", (q) => q.eq("userId2", me._id))
      .collect();

    const all = [...asUser1, ...asUser2].filter((r) => r.status === "active");

    const enriched = await Promise.all(
      all.map(async (r) => {
        const partnerId = r.userId1 === me._id ? r.userId2 : r.userId1;
        const partner = await ctx.db.get("users", partnerId);
        return {
          _id: r._id,
          type: r.type,
          level: r.level,
          loveScore: r.loveScore,
          since: r.since,
          partner: {
            userId: partnerId,
            name: partner?.name ?? "—",
            userNumber: partner?.userNumber ?? null,
            avatarUrl: partner?.avatarUrl ?? (partner?.avatarId ? await ctx.storage.getUrl(partner.avatarId) : null),
          },
        };
      })
    );
    return enriched;
  },
});
