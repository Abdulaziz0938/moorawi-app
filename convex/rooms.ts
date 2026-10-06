import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getMember, requireUser } from "./lib/auth";

export const listPublic = query({
  args: {},
  handler: async (ctx) => {
    const rooms = await ctx.db.query("rooms").withIndex("by_isPrivate", (q) => q.eq("isPrivate", false)).order("desc").take(50);
    const enriched = await Promise.all(rooms.map(async (r) => {
      const coverUrl = r.coverImageId ? await ctx.storage.getUrl(r.coverImageId) : null;
      return { ...r, coverUrl };
    }));
    return enriched;
  },
});

export const get = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    const room = await ctx.db.get("rooms", args.roomId);
    if (!room) return null;
    const coverUrl = room.coverImageId ? await ctx.storage.getUrl(room.coverImageId) : null;
    const backgroundUrl = room.backgroundImageId ? await ctx.storage.getUrl(room.backgroundImageId) : null;
    return { ...room, coverUrl, backgroundUrl };
  },
});

export const create = mutation({
  args: { name: v.string(), description: v.optional(v.string()), isPrivate: v.boolean(), tokenOverride: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.tokenOverride);
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
      const avatarUrl = user?.avatarId ? await ctx.storage.getUrl(user.avatarId) : null;
      return { _id: m._id, userId: m.userId, role: m.role, name: user?.name ?? "ضيف", username: user?.username ?? null, userNumber: user?.userNumber ?? null, avatarUrl };
    }));
  },
});

export const updateLayout = mutation({
  args: { roomId: v.id("rooms"), micLayout: v.union(v.literal("4"), v.literal("5"), v.literal("6")), tokenOverride: v.optional(v.string()) },
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

export const generateRoomUploadUrl = mutation({
  args: { tokenOverride: v.optional(v.string()) },
  handler: async (ctx, args) => { await requireUser(ctx, args.tokenOverride); return await ctx.storage.generateUploadUrl(); },
});

export const updateRoomInfo = mutation({
  args: { roomId: v.id("rooms"), name: v.optional(v.string()), welcomeMessage: v.optional(v.string()), coverImageId: v.optional(v.id("_storage")), tokenOverride: v.optional(v.string()) },
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
    if (args.coverImageId) {
      if (room.coverImageId) { try { await ctx.storage.delete(room.coverImageId); } catch {} }
      patch.coverImageId = args.coverImageId;
    }
    await ctx.db.patch("rooms", args.roomId, patch);
    return null;
  },
});

export const updateRoomBackground = mutation({
  args: { roomId: v.id("rooms"), backgroundImageId: v.optional(v.id("_storage")), tokenOverride: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.tokenOverride);
    const room = await ctx.db.get("rooms", args.roomId);
    if (!room) throw new ConvexError({ code: "NOT_FOUND", message: "Room not found" });
    const member = await getMember(ctx, args.roomId, user._id);
    if (!member || (member.role !== "owner" && member.role !== "moderator")) throw new ConvexError({ code: "FORBIDDEN", message: "Only owner" });
    if (room.backgroundImageId) { try { await ctx.storage.delete(room.backgroundImageId); } catch {} }
    await ctx.db.patch("rooms", args.roomId, { backgroundImageId: args.backgroundImageId });
    return null;
  },
});
