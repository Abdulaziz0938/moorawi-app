import { v } from "convex/values";
import { internalQuery } from "./_generated/server";
import { requireUser } from "./lib/auth";

export const check = internalQuery({
  args: { roomId: v.id("rooms"), tokenOverride: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.tokenOverride);
    const seats = await ctx.db
      .query("micSeats")
      .withIndex("by_room_and_seatIndex", (q) => q.eq("roomId", args.roomId))
      .take(40);
    const mine = seats.find((s) => s.userId === user._id);
    return { account: user._id, onMic: mine !== undefined };
  },
});
