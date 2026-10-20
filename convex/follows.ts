import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { requireUser } from "./lib/auth";

// [ezo-follows] Follows + counters
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

// [ezo-social] List user's followers
export const listFollowers = query({
  args: { userId: v.id("users"), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit ?? 100, 200);
    const rows = await ctx.db
      .query("follows")
      .withIndex("by_following", (q: any) => q.eq("followingId", args.userId))
      .order("desc")
      .take(limit);
    const out = await Promise.all(rows.map(async (r) => {
      const u = await ctx.db.get("users", r.followerId);
      if (!u) return null;
      const avatarUrl = u.avatarUrl ?? (u.avatarId ? await ctx.storage.getUrl(u.avatarId) : null);
      const vip = (u.vipLevel ?? 0) > 0 && (!u.vipExpiresAt || u.vipExpiresAt > Date.now()) ? (u.vipLevel ?? 0) : 0;
      return { _id: u._id, name: u.name ?? "—", userNumber: u.userNumber ?? null, avatarUrl, vip, followedAt: r.createdAt };
    }));
    return out.filter(Boolean);
  },
});

// [ezo-social] List users this user follows
export const listFollowing = query({
  args: { userId: v.id("users"), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit ?? 100, 200);
    const rows = await ctx.db
      .query("follows")
      .withIndex("by_follower", (q: any) => q.eq("followerId", args.userId))
      .order("desc")
      .take(limit);
    const out = await Promise.all(rows.map(async (r) => {
      const u = await ctx.db.get("users", r.followingId);
      if (!u) return null;
      const avatarUrl = u.avatarUrl ?? (u.avatarId ? await ctx.storage.getUrl(u.avatarId) : null);
      const vip = (u.vipLevel ?? 0) > 0 && (!u.vipExpiresAt || u.vipExpiresAt > Date.now()) ? (u.vipLevel ?? 0) : 0;
      return { _id: u._id, name: u.name ?? "—", userNumber: u.userNumber ?? null, avatarUrl, vip, followedAt: r.createdAt };
    }));
    return out.filter(Boolean);
  },
});

// [ezo-social] Fans = users who sent you gifts (approximated by fanCount relations)
export const listFans = query({
  args: { userId: v.id("users"), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit ?? 100, 200);
    // Fans = people who sent gifts to this user
    const gifts = await ctx.db
      .query("giftTransactions")
      .withIndex("by_to", (q: any) => q.eq("toUserId", args.userId))
      .order("desc")
      .take(limit * 2);
    const seen = new Set<string>();
    const out: any[] = [];
    for (const g of gifts) {
      const key = g.fromUserId as string;
      if (seen.has(key)) continue;
      seen.add(key);
      const u = await ctx.db.get("users", g.fromUserId);
      if (!u) continue;
      const avatarUrl = u.avatarUrl ?? (u.avatarId ? await ctx.storage.getUrl(u.avatarId) : null);
      const vip = (u.vipLevel ?? 0) > 0 && (!u.vipExpiresAt || u.vipExpiresAt > Date.now()) ? (u.vipLevel ?? 0) : 0;
      out.push({ _id: u._id, name: u.name ?? "—", userNumber: u.userNumber ?? null, avatarUrl, vip });
      if (out.length >= limit) break;
    }
    return out;
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
      })
      await recordMissionProgress(ctx, me._id, ["daily_1_new_follow", "weekly_5_new_follows"]);;
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

async function recordMissionProgress(ctx: any, userId: any, keys: string[], amount = 1) {
  const dailyCycle = new Date().toISOString().slice(0, 10);
  const onejan = new Date(new Date().getFullYear(), 0, 1);
  const week = Math.ceil(((new Date().getTime() - onejan.getTime()) / 86400000 + onejan.getDay() + 1) / 7);
  const weeklyCycle = `${new Date().getFullYear()}-W${week}`;
  const missions = await ctx.db.query("missions").collect();
  for (const key of keys) {
    const m = missions.find((x: any) => x.key === key);
    if (!m) continue;
    const cycle = m.type === "weekly" ? weeklyCycle : dailyCycle;
    const existing = await ctx.db
      .query("userMissions")
      .withIndex("by_user_and_mission", (q: any) => q.eq("userId", userId).eq("missionId", m._id))
      .filter((q: any) => q.eq(q.field("cycleKey"), cycle))
      .first();
    if (existing) {
      if (existing.claimedAt) continue;
      await ctx.db.patch("userMissions", existing._id, {
        progress: Math.min((existing.progress ?? 0) + amount, m.target),
      });
    } else {
      await ctx.db.insert("userMissions", {
        userId,
        missionId: m._id,
        progress: Math.min(amount, m.target),
        cycleKey: cycle,
      });
    }
  }
}
