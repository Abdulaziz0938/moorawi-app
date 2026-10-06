import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getMember, requireUser } from "./lib/auth";

const MAX_SEATS = 20;

export const state = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    const seats = await ctx.db
      .query("micSeats")
      .withIndex("by_room_and_seatIndex", (q) => q.eq("roomId", args.roomId))
      .take(MAX_SEATS);
    const enriched = await Promise.all(
      seats.map(async (s) => {
        const user = s.userId ? await ctx.db.get("users", s.userId) : null;
        return { ...s, userName: user?.name ?? null };
      }),
    );
    return enriched.sort((a, b) => a.seatIndex - b.seatIndex);
  },
});

export const myInfo = query({
  args: { roomId: v.id("rooms"), tokenOverride: v.optional(v.string()) },
  handler: async (ctx, args) => {
    try {
      const user = await requireUser(ctx, args.tokenOverride);
      const member = await getMember(ctx, args.roomId, user._id);
      return {
        userId: user._id,
        userName: user.name ?? "ضيف",
        role: member?.role ?? null,
      };
    } catch {
      return null;
    }
  },
});

export const takeSeat = mutation({
  args: { roomId: v.id("rooms"), seatIndex: v.number(), tokenOverride: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.tokenOverride);
    if (args.seatIndex < 0 || args.seatIndex >= MAX_SEATS) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "رقم المايك غير صحيح" });
    }
    const allSeats = await ctx.db
      .query("micSeats")
      .withIndex("by_room_and_seatIndex", (q) => q.eq("roomId", args.roomId))
      .take(MAX_SEATS);
    const currentSeat = allSeats.find((s) => s.userId === user._id);
    if (currentSeat && currentSeat.seatIndex === args.seatIndex) return null;
    if (currentSeat) {
      await ctx.db.patch("micSeats", currentSeat._id, { userId: undefined });
    }
    const seat = allSeats.find((s) => s.seatIndex === args.seatIndex);
    if (!seat) throw new ConvexError({ code: "NOT_FOUND", message: "المايك غير موجود" });
    if (seat.locked || seat.userId) {
      throw new ConvexError({ code: "CONFLICT", message: "المايك محجوز" });
    }
    await ctx.db.patch("micSeats", seat._id, { userId: user._id });
    const member = await getMember(ctx, args.roomId, user._id);
    if (member && member.role === "listener") {
      await ctx.db.patch("roomMembers", member._id, { role: "speaker" });
    }
    return null;
  },
});

export const leaveSeat = mutation({
  args: { roomId: v.id("rooms"), tokenOverride: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.tokenOverride);
    const seats = await ctx.db
      .query("micSeats")
      .withIndex("by_room_and_seatIndex", (q) => q.eq("roomId", args.roomId))
      .take(MAX_SEATS);
    const mine = seats.find((s) => s.userId === user._id);
    if (!mine) return null;
    await ctx.db.patch("micSeats", mine._id, { userId: undefined });
    const member = await getMember(ctx, args.roomId, user._id);
    if (member && member.role === "speaker") {
      await ctx.db.patch("roomMembers", member._id, { role: "listener" });
    }
    return null;
  },
});

// Clean up ALL seats occupied by this user across the room (safety net)
export const clearMySeats = mutation({
  args: { roomId: v.id("rooms"), tokenOverride: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.tokenOverride);
    const seats = await ctx.db
      .query("micSeats")
      .withIndex("by_room_and_seatIndex", (q) => q.eq("roomId", args.roomId))
      .take(MAX_SEATS);
    for (const s of seats) {
      if (s.userId === user._id) {
        await ctx.db.patch("micSeats", s._id, { userId: undefined });
      }
    }
    return null;
  },
});
