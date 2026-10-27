import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireUser } from "./lib/auth";
import { activeVipLevel } from "./lib/vip";

// [ezo-visits] Profile/room visits
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
export const countThisMonth = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const start = new Date();
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    const ts = start.getTime();
    const rows = await ctx.db
      .query("visits")
      .withIndex("by_visited_and_visitedAt", (q) =>
        q.eq("visitedUserId", args.userId).gte("visitedAt", ts),
      )
      .collect();
    return rows.length;
  },
});

// [ezo-visits] My own visits (profiles I visited + rooms I entered)
// [ezo-visits] Record room entry (called from RoomView)
export const recordRoomEntry = mutation({
  args: {
    roomId: v.id("rooms"),
    tokenOverride: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    const room = await ctx.db.get("rooms", args.roomId);
    if (!room) return { ok: true, skipped: true };
    await ctx.db.insert("visits", {
      visitorId: me._id,
      roomId: args.roomId,
      roomName: room.name,
      roomCoverUrl: room.coverUrl ?? undefined,
      source: "room",
      visitedAt: Date.now(),
    });
    return { ok: true };
  },
});

export const myRecent = query({
  args: { userId: v.id("users"), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit ?? 50, 100);

    // Profiles I visited
    const profileRows = await ctx.db
      .query("visits")
      .withIndex("by_visitor", (q: any) => q.eq("visitorId", args.userId))
      .order("desc")
      .take(limit);

    const profiles = await Promise.all(profileRows.map(async (r) => {
      if (r.source === "room" && r.roomId) {
        return {
          kind: "room" as const,
          _id: r._id,
          targetId: r.roomId,
          name: r.roomName ?? "غرفة",
          userNumber: null,
          avatarUrl: r.roomCoverUrl ?? null,
          vip: 0,
          visitedAt: r.visitedAt,
        };
      }
      if (!r.visitedUserId) return null;
      const u = await ctx.db.get("users", r.visitedUserId);
      if (!u) return null;
      const avatarUrl = u.avatarUrl ?? (u.avatarId ? await ctx.storage.getUrl(u.avatarId) : null);
      const vip = (u.vipLevel ?? 0) > 0 && (!u.vipExpiresAt || u.vipExpiresAt > Date.now()) ? (u.vipLevel ?? 0) : 0;
      return {
        kind: "profile" as const,
        _id: r._id,
        targetId: u._id,
        name: u.name ?? "—",
        userNumber: u.userNumber ?? null,
        avatarUrl,
        vip,
        visitedAt: r.visitedAt,
      };
    }));

    const filtered = profiles.filter(Boolean);
    filtered.sort((a: any, b: any) => (b.visitedAt ?? 0) - (a.visitedAt ?? 0));
    return filtered.slice(0, limit);
  },
});

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
        if (!visitor) return null;
        const avatarUrl = visitor.avatarUrl ??
          (visitor.avatarId ? await ctx.storage.getUrl(visitor.avatarId) : null);
        const vip = (visitor.vipLevel ?? 0) > 0 &&
          (!visitor.vipExpiresAt || visitor.vipExpiresAt > Date.now())
          ? (visitor.vipLevel ?? 0)
          : 0;
        return {
          _id: r._id,
          visitorId: r.visitorId,
          visitedUserId: r.visitedUserId,
          source: r.source,
          visitedAt: r.visitedAt,
          // [ezo-visits] Flat visitor fields for frontend
          name: visitor.name ?? "—",
          userNumber: visitor.userNumber ?? null,
          avatarUrl,
          vip,
        };
      }),
    );
    return enriched.filter(Boolean);
  },
});
