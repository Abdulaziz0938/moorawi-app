import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getMember, requireUser } from "./lib/auth";
import { vipLevelFromTotalSent, vipLevelFromTotalReceived } from "./lib/vip";

export const listPublic = query({
  args: {},
  handler: async (ctx) => {
    const rooms = await ctx.db.query("rooms").withIndex("by_isPrivate", (q) => q.eq("isPrivate", false)).order("desc").take(50);
    const enriched = await Promise.all(rooms.map(async (r) => {
      const coverUrl = r.coverUrl ?? (r.coverImageId ? await ctx.storage.getUrl(r.coverImageId) : null);
      return { ...r, coverUrl };
    }));
    return enriched;
  },
});

// [moorawi-rooms] Get current user's own room (max 1)
export const myRoom = query({
  args: { tokenOverride: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (!args.tokenOverride) return null;
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", args.tokenOverride!))
      .unique();
    if (!user) return null;
    const rooms = await ctx.db
      .query("rooms")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .take(1);
    if (rooms.length === 0) return null;
    const r = rooms[0];
    const coverUrl = r.coverUrl ?? (r.coverImageId ? await ctx.storage.getUrl(r.coverImageId) : null);
    return { ...r, coverUrl };
  },
});

export const get = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    const room = await ctx.db.get("rooms", args.roomId);
    if (!room) return null;
    const coverUrl = room.coverUrl ?? (room.coverImageId ? await ctx.storage.getUrl(room.coverImageId) : null);
    const backgroundUrl = room.backgroundUrl ?? (room.backgroundImageId ? await ctx.storage.getUrl(room.backgroundImageId) : null);
    return { ...room, coverUrl, backgroundUrl };
  },
});

export const create = mutation({
  args: { name: v.string(), description: v.optional(v.string()), isPrivate: v.boolean(), tokenOverride: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.tokenOverride);

    // [moorawi-rooms] منع تعدد الغرف: إن كان للمستخدم غرفة → أعدها
    const existing = await ctx.db
      .query("rooms")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .take(1);
    if (existing.length > 0) {
      return existing[0]._id;
    }

    const name = args.name.trim();
    if (name.length < 2 || name.length > 40) throw new ConvexError({ code: "BAD_REQUEST", message: "Room name must be 2-40 chars" });
    const roomId = await ctx.db.insert("rooms", {
      name, description: args.description?.trim() || undefined, ownerId: user._id,
      isPrivate: args.isPrivate, micCount: 20, memberCount: 1,
    });
    await ctx.db.insert("roomMembers", { roomId, userId: user._id, role: "owner" });
    for (let i = 0; i < 20; i++) await ctx.db.insert("micSeats", { roomId, seatIndex: i, locked: false, muted: false });
    return roomId;
  },
});

export const join = mutation({
  args: { roomId: v.id("rooms"), tokenOverride: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.tokenOverride);
    const room = await ctx.db.get("rooms", args.roomId);
    if (!room) throw new ConvexError({ code: "NOT_FOUND", message: "Room not found" });
    const existing = await getMember(ctx, args.roomId, user._id);
    if (existing?.banned) throw new ConvexError({ code: "FORBIDDEN", message: "You are banned" });
    if (existing) return null;
    await ctx.db.insert("roomMembers", { roomId: args.roomId, userId: user._id, role: "listener" });
    await ctx.db.patch("rooms", args.roomId, { memberCount: room.memberCount + 1 });
    return null;
  },
});

export const members = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    const members = await ctx.db.query("roomMembers").withIndex("by_room", (q) => q.eq("roomId", args.roomId)).take(100);
    return await Promise.all(members.map(async (m) => {
      const user = await ctx.db.get("users", m.userId);
      const avatarUrl = user?.avatarUrl ?? (user?.avatarId ? await ctx.storage.getUrl(user.avatarId) : null);
      return {
        _id: m._id,
        userId: m.userId,
        role: m.role,
        name: user?.name ?? "ضيف",
        username: user?.username ?? null,
        userNumber: user?.userNumber ?? null,
        avatarUrl,
        vip: vipLevelFromTotalSent(user?.totalSent ?? 0),
        charmLevel: vipLevelFromTotalReceived(user?.totalReceived ?? 0),
        charmValue: user?.charms ?? 0,
        wealthValue: user?.totalSent ?? 0,
        adminRole: user?.adminRole ?? null,
        charms: user?.charms ?? 0,
      };
    }));
  },
});

export const updateLayout = mutation({
  args: { roomId: v.id("rooms"), micLayout: v.string(), tokenOverride: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.tokenOverride);
    const room = await ctx.db.get("rooms", args.roomId);
    if (!room) throw new ConvexError({ code: "NOT_FOUND", message: "Room not found" });
    const member = await getMember(ctx, args.roomId, user._id);
    if (!member || (member.role !== "owner" && member.role !== "moderator")) throw new ConvexError({ code: "FORBIDDEN", message: "Only owner" });
    await ctx.db.patch("rooms", args.roomId, { micLayout: args.micLayout });
    return null;
  },
});

// (تم حذف generateRoomUploadUrl — نستخدم Cloudinary)

export const updateRoomInfo = mutation({
  args: { roomId: v.id("rooms"), name: v.optional(v.string()), welcomeMessage: v.optional(v.string()), coverUrl: v.optional(v.string()), tokenOverride: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.tokenOverride);
    const room = await ctx.db.get("rooms", args.roomId);
    if (!room) throw new ConvexError({ code: "NOT_FOUND", message: "Room not found" });
    const member = await getMember(ctx, args.roomId, user._id);
    if (!member || (member.role !== "owner" && member.role !== "moderator")) throw new ConvexError({ code: "FORBIDDEN", message: "Only owner" });
    const patch: any = {};
    if (args.name !== undefined) {
      const n = args.name.trim();
      if (n.length < 2 || n.length > 40) throw new ConvexError({ code: "BAD_REQUEST", message: "اسم غير صالح" });
      patch.name = n;
    }
    if (args.welcomeMessage !== undefined) patch.welcomeMessage = args.welcomeMessage.trim().slice(0, 200);
    if (args.coverUrl) patch.coverUrl = args.coverUrl;
    await ctx.db.patch("rooms", args.roomId, patch);
    return null;
  },
});

export const updateRoomBackground = mutation({
  args: { roomId: v.id("rooms"), backgroundUrl: v.optional(v.string()), tokenOverride: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.tokenOverride);
    const room = await ctx.db.get("rooms", args.roomId);
    if (!room) throw new ConvexError({ code: "NOT_FOUND", message: "Room not found" });
    const member = await getMember(ctx, args.roomId, user._id);
    if (!member || (member.role !== "owner" && member.role !== "moderator")) throw new ConvexError({ code: "FORBIDDEN", message: "Only owner" });
    await ctx.db.patch("rooms", args.roomId, { backgroundUrl: args.backgroundUrl });
    return null;
  },
});

// [moorawi-trophy] Get room's weekly spent coins (lazy reset)
export const weeklyTotal = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    const room = await ctx.db.get("rooms", args.roomId);
    if (!room) return { total: 0, tier: 0, cycleKey: "" };

    // Lazy reset — if stored cycleKey is old, current week total = 0
    const { weekKey } = await import("./lib/week");
    const current = weekKey();
    if (room.weeklyCycleKey !== current) {
      return { total: 0, tier: 0, cycleKey: current };
    }

    const total = room.weeklyTotal ?? 0;
    // Compute tier: 0, 1, 3, 6 (million)
    const millions = total / 1_000_000;
    let tier = 0;
    if (millions >= 6) tier = 6;
    else if (millions >= 3) tier = 3;
    else if (millions >= 1) tier = 1;

    return { total, tier, cycleKey: current };
  },
});
