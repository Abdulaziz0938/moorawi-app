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
    // Enrich with user names
    const enriched = await Promise.all(
      seats.map(async (s) => {
        const user = s.userId ? await ctx.db.get("users", s.userId) : null;
        return {
          ...s,
          userName: user?.name ?? null,
        };
      }),
    );
    return enriched;
  },
});

export const myRole = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const member = await getMember(ctx, args.roomId, user._id);
    return member?.role ?? null;
  },
});

export const takeSeat = mutation({
  args: { roomId: v.id("rooms"), seatIndex: v.number() },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (args.seatIndex < 0 || args.seatIndex >= MAX_SEATS) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "Invalid seat index" });
    }
    const seat = await ctx.db
      .query("micSeats")
      .withIndex("by_room_and_seatIndex", (q) =>
        q.eq("roomId", args.roomId).eq("seatIndex", args.seatIndex),
      )
      .unique();
    if (!seat) throw new ConvexError({ code: "NOT_FOUND", message: "Seat not found" });
    if (seat.locked || seat.userId) {
      throw new ConvexError({ code: "CONFLICT", message: "Seat is locked or occupied" });
    }
    await ctx.db.patch("micSeats", seat._id, { userId: user._id });
    // Promote to speaker
    const member = await getMember(ctx, args.roomId, user._id);
    if (member && member.role === "listener") {
      await ctx.db.patch("roomMembers", member._id, { role: "speaker" });
    }
    return null;
  },
});

export const leaveSeat = mutation({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
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
