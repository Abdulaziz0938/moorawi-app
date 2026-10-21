import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireUser } from "./lib/auth";

export const toggleLike = mutation({
  args: { targetUserId: v.id("users"), tokenOverride: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    if (me._id === args.targetUserId) return { liked: false };
    const existing = await ctx.db
      .query("userLikes")
      .withIndex("by_pair", (q) => q.eq("fromUserId", me._id).eq("toUserId", args.targetUserId))
      .unique();
    if (existing) {
      await ctx.db.delete("userLikes", existing._id);
      return { liked: false };
    }
    await ctx.db.insert("userLikes", {
      fromUserId: me._id,
      toUserId: args.targetUserId,
      createdAt: Date.now(),
    });
    return { liked: true };
  },
});

export const isLiked = query({
  args: { targetUserId: v.id("users"), tokenOverride: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    const existing = await ctx.db
      .query("userLikes")
      .withIndex("by_pair", (q) => q.eq("fromUserId", me._id).eq("toUserId", args.targetUserId))
      .unique();
    return !!existing;
  },
});

export const count = query({
  args: { targetUserId: v.id("users") },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("userLikes")
      .withIndex("by_to", (q) => q.eq("toUserId", args.targetUserId))
      .take(1000);
    return rows.length;
  },
});
