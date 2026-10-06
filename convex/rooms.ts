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
  handler: async (ctx, args) => {
    return await ctx.db.get("rooms", args.roomId);
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    isPrivate: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
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
    // Create 20 empty mic seats
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
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
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
