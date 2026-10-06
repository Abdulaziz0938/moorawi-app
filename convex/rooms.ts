import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getMember, requireUser } from "./lib/auth";

export const listPublic = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("rooms")
      .withIndex("by_isPrivate", (q) => q.eq("isPrivate", false))
      .order("desc")
      .take(50);
  },
});

export const get = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => await ctx.db.get("rooms", args.roomId),
});

export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    isPrivate: v.boolean(),
    tokenOverride: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.tokenOverride);
    const name = args.name.trim();
    if (name.length < 2 || name.length > 40) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "Room name must be 2-40 chars" });
    }
    const roomId = await ctx.db.insert("rooms", {
      name,
      description: args.description?.trim() || undefined,
      ownerId: user._id,
      isPrivate: args.isPrivate,
      micCount: 20,
      memberCount: 1,
    });
    await ctx.db.insert("roomMembers", {
      roomId,
      userId: user._id,
      role: "owner",
    });
    for (let i = 0; i < 20; i++) {
      await ctx.db.insert("micSeats", {
        roomId,
        seatIndex: i,
        locked: false,
        muted: false,
      });
    }
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
    if (existing?.banned) {
      throw new ConvexError({ code: "FORBIDDEN", message: "You are banned from this room" });
    }
    if (existing) return null;
    await ctx.db.insert("roomMembers", {
      roomId: args.roomId,
      userId: user._id,
      role: "listener",
    });
    await ctx.db.patch("rooms", args.roomId, { memberCount: room.memberCount + 1 });
    return null;
  },
});

export const members = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    const members = await ctx.db
      .query("roomMembers")
      .withIndex("by_room_and_user", (q) => q.eq("roomId", args.roomId))
      .take(100);
    const enriched = await Promise.all(
      members.map(async (m) => {
        const user = await ctx.db.get("users", m.userId);
        const avatarUrl = user?.avatarId
          ? await ctx.storage.getUrl(user.avatarId)
          : null;
        return {
          _id: m._id,
          userId: m.userId,
          role: m.role,
          name: user?.name ?? "ضيف",
          username: user?.username ?? null,
          userNumber: user?.userNumber ?? null,
          avatarUrl,
        };
      }),
    );
    return enriched;
  },
});

export const updateLayout = mutation({
  args: {
    roomId: v.id("rooms"),
    micLayout: v.union(v.literal("4"), v.literal("5"), v.literal("6")),
    tokenOverride: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.tokenOverride);
    const room = await ctx.db.get("rooms", args.roomId);
    if (!room) throw new ConvexError({ code: "NOT_FOUND", message: "Room not found" });
    const member = await getMember(ctx, args.roomId, user._id);
    if (!member || (member.role !== "owner" && member.role !== "moderator")) {
      throw new ConvexError({ code: "FORBIDDEN", message: "Only owner can change layout" });
    }
    await ctx.db.patch("rooms", args.roomId, { micLayout: args.micLayout });
    return null;
  },
});

export const updateTheme = mutation({
  args: {
    roomId: v.id("rooms"),
    theme: v.string(),
    tokenOverride: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.tokenOverride);
    const room = await ctx.db.get("rooms", args.roomId);
    if (!room) throw new ConvexError({ code: "NOT_FOUND", message: "Room not found" });
    const member = await getMember(ctx, args.roomId, user._id);
    if (!member || (member.role !== "owner" && member.role !== "moderator")) {
      throw new ConvexError({ code: "FORBIDDEN", message: "Only owner can change theme" });
    }
    await ctx.db.patch("rooms", args.roomId, { theme: args.theme });
    return null;
  },
});
