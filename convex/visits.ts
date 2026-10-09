import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireUser } from "./lib/auth";

// [moorawi-visits] Profile/room visits
export const record = mutation({
  args: {
    tokenOverride: v.optional(v.string()),
    visitedUserId: v.id("users"),
    source: v.union(v.literal("profile"), v.literal("room")),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    if (me._id === args.visitedUserId) return { ok: true, skipped: true };

    const target = await ctx.db.get("users", args.visitedUserId);
    if (!target) return { ok: true, skipped: true };

    // Record visit (no dedupe for now — will add cooldown later)
    await ctx.db.insert("visits", {
      visitorId: me._id,
      visitedUserId: args.visitedUserId,
      source: args.source,
      visitedAt: Date.now(),
    });

    // Increment counter
    await ctx.db.patch("users", args.visitedUserId, {
      visitorCount: (target.visitorCount ?? 0) + 1,
    });

    return { ok: true };
  },
});

// Recent visitors list
export const recent = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit ?? 20, 50);
    const rows = await ctx.db
      .query("visits")
      .withIndex("by_visited_and_visitedAt", (q) =>
        q.eq("visitedUserId", args.userId),
      )
      .order("desc")
      .take(limit);

    const enriched = await Promise.all(
      rows.map(async (r) => {
        const visitor = await ctx.db.get("users", r.visitorId);
        return visitor ? { ...r, visitor } : null;
      }),
    );
    return enriched.filter(Boolean);
  },
});
