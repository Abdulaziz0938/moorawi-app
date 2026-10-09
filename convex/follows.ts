import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { requireUser } from "./lib/auth";

// [moorawi-follows] Follows + counters
export const stats = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get("users", args.userId);
    if (!user) return { visitors: 0, fans: 0, followers: 0, following: 0 };
    return {
      visitors: user.visitorCount ?? 0,
      fans: user.fanCount ?? 0,
      followers: user.followerCount ?? 0,
      following: user.followingCount ?? 0,
    };
  },
});

export const isFollowing = query({
  args: {
    tokenOverride: v.optional(v.string()),
    targetUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    if (!args.tokenOverride) return false;
    const me = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", args.tokenOverride!))
      .unique();
    if (!me) return false;
    const f = await ctx.db
      .query("follows")
      .withIndex("by_pair", (q) =>
        q.eq("followerId", me._id).eq("followingId", args.targetUserId),
      )
      .unique();
    return !!f;
  },
});

export const toggle = mutation({
  args: {
    tokenOverride: v.optional(v.string()),
    targetUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    if (me._id === args.targetUserId) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "لا يمكنك متابعة نفسك" });
    }
    const target = await ctx.db.get("users", args.targetUserId);
    if (!target) throw new ConvexError({ code: "NOT_FOUND", message: "المستخدم غير موجود" });

    const existing = await ctx.db
      .query("follows")
      .withIndex("by_pair", (q) =>
        q.eq("followerId", me._id).eq("followingId", args.targetUserId),
      )
      .unique();

    if (existing) {
      await ctx.db.delete("follows", existing._id);
      await ctx.db.patch("users", me._id, {
        followingCount: Math.max(0, (me.followingCount ?? 1) - 1),
      });
      await ctx.db.patch("users", args.targetUserId, {
        followerCount: Math.max(0, (target.followerCount ?? 1) - 1),
      });
      return { ok: true, following: false };
    } else {
      await ctx.db.insert("follows", {
        followerId: me._id,
        followingId: args.targetUserId,
        createdAt: Date.now(),
      });
      await ctx.db.patch("users", me._id, {
        followingCount: (me.followingCount ?? 0) + 1,
      });
      await ctx.db.patch("users", args.targetUserId, {
        followerCount: (target.followerCount ?? 0) + 1,
        fanCount: (target.fanCount ?? 0) + 1,
      });
      return { ok: true, following: true };
    }
  },
});
