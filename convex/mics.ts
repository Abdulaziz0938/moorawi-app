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
        if (!s.userId) return { ...s, userName: null, avatarUrl: null, charms: 0, frame: null };
        const user = await ctx.db.get("users", s.userId);
        const avatarUrl = user?.avatarId ? await ctx.storage.getUrl(user.avatarId) : null;
        return {
          ...s,
          userName: user?.name ?? "ضيف",
          userNumber: user?.userNumber ?? null,
          avatarUrl,
          charms: user?.charms ?? 0,
          frame: null,
        };
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
    } catch { return null; }
  },
});

export const takeSeat = mutation({
  args: { roomId: v.id("rooms"), seatIndex: v.number(), tokenOverride: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.tokenOverride);
    if (args.seatIndex < 0 || args.seatIndex >= MAX_SEATS) throw new ConvexError({ code: "BAD_REQUEST", message: "رقم المايك غير صحيح" });
    const allSeats = await ctx.db.query("micSeats").withIndex("by_room_and_seatIndex", (q) => q.eq("roomId", args.roomId)).take(MAX_SEATS);
    const currentSeat = allSeats.find((s) => s.userId === user._id);
    if (currentSeat && currentSeat.seatIndex === args.seatIndex) return null;
    if (currentSeat) await ctx.db.patch("micSeats", currentSeat._id, { userId: undefined });
    const seat = allSeats.find((s) => s.seatIndex === args.seatIndex);
    if (!seat) throw new ConvexError({ code: "NOT_FOUND", message: "المايك غير موجود" });
    if (seat.locked || seat.userId) throw new ConvexError({ code: "CONFLICT", message: "المايك محجوز" });
    await ctx.db.patch("micSeats", seat._id, { userId: user._id });
    const member = await getMember(ctx, args.roomId, user._id);
    if (member && member.role === "listener") await ctx.db.patch("roomMembers", member._id, { role: "speaker" });
    return null;
  },
});

export const leaveSeat = mutation({
  args: { roomId: v.id("rooms"), tokenOverride: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.tokenOverride);
    const seats = await ctx.db.query("micSeats").withIndex("by_room_and_seatIndex", (q) => q.eq("roomId", args.roomId)).take(MAX_SEATS);
    const mine = seats.find((s) => s.userId === user._id);
    if (!mine) return null;
    await ctx.db.patch("micSeats", mine._id, { userId: undefined, muted: false });
    const member = await getMember(ctx, args.roomId, user._id);
    if (member && member.role === "speaker") await ctx.db.patch("roomMembers", member._id, { role: "listener" });
    return null;
  },
});

export const clearMySeats = mutation({
  args: { roomId: v.id("rooms"), tokenOverride: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.tokenOverride);
    const seats = await ctx.db.query("micSeats").withIndex("by_room_and_seatIndex", (q) => q.eq("roomId", args.roomId)).take(MAX_SEATS);
    for (const s of seats) if (s.userId === user._id) await ctx.db.patch("micSeats", s._id, { userId: undefined, muted: false });
    return null;
  },
});

export const toggleLock = mutation({
  args: { roomId: v.id("rooms"), seatIndex: v.number(), tokenOverride: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireUser(ctx, args.tokenOverride);
    const seat = await ctx.db.query("micSeats").withIndex("by_room_and_seatIndex", (q) => q.eq("roomId", args.roomId).eq("seatIndex", args.seatIndex)).unique();
    if (!seat) throw new ConvexError({ code: "NOT_FOUND", message: "المايك غير موجود" });
    await ctx.db.patch("micSeats", seat._id, { locked: !seat.locked });
    return null;
  },
});

export const toggleMuteSeat = mutation({
  args: { roomId: v.id("rooms"), seatIndex: v.number(), tokenOverride: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireUser(ctx, args.tokenOverride);
    const seat = await ctx.db.query("micSeats").withIndex("by_room_and_seatIndex", (q) => q.eq("roomId", args.roomId).eq("seatIndex", args.seatIndex)).unique();
    if (!seat) throw new ConvexError({ code: "NOT_FOUND", message: "المايك غير موجود" });
    await ctx.db.patch("micSeats", seat._id, { muted: !seat.muted });
    return null;
  },
});

export const listeners = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    const members = await ctx.db.query("roomMembers").withIndex("by_room", (q) => q.eq("roomId", args.roomId)).take(100);
    const seats = await ctx.db.query("micSeats").withIndex("by_room_and_seatIndex", (q) => q.eq("roomId", args.roomId)).take(MAX_SEATS);
    const onMicIds = new Set(seats.map((s) => s.userId).filter(Boolean));
    const listeners = members.filter((m) => !onMicIds.has(m.userId) && m.role !== "owner");
    const enriched = await Promise.all(
      listeners.map(async (m) => {
        const user = await ctx.db.get("users", m.userId);
        const avatarUrl = user?.avatarId ? await ctx.storage.getUrl(user.avatarId) : null;
        return { _id: m._id, userId: m.userId, name: user?.name ?? "ضيف", userNumber: user?.userNumber ?? null, avatarUrl };
      }),
    );
    return enriched;
  },
});

export const inviteToSeat = mutation({
  args: { roomId: v.id("rooms"), toUserId: v.id("users"), seatIndex: v.number(), tokenOverride: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.tokenOverride);
    await ctx.db.insert("micInvites", {
      roomId: args.roomId,
      toUserId: args.toUserId,
      fromUserId: user._id,
      fromName: user.name ?? "مستخدم",
      seatIndex: args.seatIndex,
      status: "pending",
    });
    return null;
  },
});

export const myInvite = query({
  args: { roomId: v.id("rooms"), tokenOverride: v.optional(v.string()) },
  handler: async (ctx, args) => {
    try {
      const user = await requireUser(ctx, args.tokenOverride);
      const invites = await ctx.db.query("micInvites").withIndex("by_to_and_status", (q) => q.eq("toUserId", user._id).eq("status", "pending")).take(10);
      const roomInvite = invites.find((i) => i.roomId === args.roomId);
      if (!roomInvite) return null;
      return { _id: roomInvite._id, fromName: roomInvite.fromName, seatIndex: roomInvite.seatIndex };
    } catch { return null; }
  },
});

export const respondInvite = mutation({
  args: { inviteId: v.id("micInvites"), accept: v.boolean(), tokenOverride: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.tokenOverride);
    const invite = await ctx.db.get("micInvites", args.inviteId);
    if (!invite || invite.toUserId !== user._id) return null;
    await ctx.db.patch("micInvites", args.inviteId, { status: args.accept ? "accepted" : "declined" });
    if (args.accept) {
      const seat = await ctx.db.query("micSeats").withIndex("by_room_and_seatIndex", (q) => q.eq("roomId", invite.roomId).eq("seatIndex", invite.seatIndex)).unique();
      if (seat && !seat.locked && !seat.userId) {
        await ctx.db.patch("micSeats", seat._id, { userId: user._id });
        const member = await getMember(ctx, invite.roomId, user._id);
        if (member && member.role === "listener") await ctx.db.patch("roomMembers", member._id, { role: "speaker" });
      }
    }
    return null;
  },
});

// Send a charm (+1) to a user (for testing gifts; will be replaced by gift system)
export const sendCharm = mutation({
  args: { toUserId: v.id("users"), amount: v.optional(v.number()), tokenOverride: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireUser(ctx, args.tokenOverride);
    const target = await ctx.db.get("users", args.toUserId);
    if (!target) return null;
    const amount = args.amount ?? 1;
    await ctx.db.patch("users", args.toUserId, { charms: (target.charms ?? 0) + amount });
    return null;
  },
});
