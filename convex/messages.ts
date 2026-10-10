import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser } from "./lib/auth";
import { levelFromValue } from "./lib/levels";
import { activeVipLevel } from "./lib/vip";

const MAX_LEN = 500;

export const list = query({
  args: { roomId: v.id("rooms"), since: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const sinceTs = args.since ?? 0;
    const raw = await ctx.db.query("messages").withIndex("by_room", (q) => q.eq("roomId", args.roomId)).order("desc").take(60);
    const rows = sinceTs > 0 ? raw.filter((m) => m._creationTime >= sinceTs) : raw;

    // [moorawi] Prefetch room members for role lookup
    const members = await ctx.db.query("roomMembers")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .take(100);
    const roleByUser = new Map<string, string>();
    for (const mem of members) roleByUser.set(mem.userId as string, mem.role);

    // [moorawi] Prefetch mic seats for mute lookup
    const seats = await ctx.db.query("micSeats")
      .withIndex("by_room_and_seatIndex", (q) => q.eq("roomId", args.roomId))
      .take(24);
    const mutedByUser = new Map<string, boolean>();
    for (const s of seats) {
      if (s.userId) mutedByUser.set(s.userId as string, !!s.muted);
    }

    const enriched = await Promise.all(rows.map(async (m) => {
      const sender = await ctx.db.get("users", m.senderId);
      const avatarUrl = sender?.avatarUrl ?? (sender?.avatarId ? await ctx.storage.getUrl(sender.avatarId) : null);
      const imageUrl = m.imageUrl ?? (m.imageId ? await ctx.storage.getUrl(m.imageId) : null);
      const vip = activeVipLevel(sender);
      return {
        _id: m._id,
        senderId: m.senderId,
        senderName: m.senderName,
        senderNumber: sender?.userNumber ?? null,
        senderVip: vip,
        senderCharmLevel: levelFromValue(sender?.totalReceived ?? 0),
        senderCharmValue: sender?.charms ?? 0,
        senderWealthValue: sender?.totalSent ?? 0,
        senderAdminRole: sender?.adminRole ?? null,
        senderCharms: sender?.charms ?? 0,
        senderRoomRole: roleByUser.get(m.senderId as string) ?? null,
        senderMuted: mutedByUser.get(m.senderId as string) ?? null,
        avatarUrl,
        text: m.text ?? null,
        imageUrl,
        system: m.system ?? false,
        createdAt: m._creationTime,
      };
    }));
    return enriched.reverse();
  },
});

// (تم حذف generateUploadUrl — نستخدم Cloudinary)

export const send = mutation({
  args: { roomId: v.id("rooms"), text: v.optional(v.string()), imageUrl: v.optional(v.string()), tokenOverride: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.tokenOverride);
    const text = args.text?.trim() ?? "";
    if (!text && !args.imageUrl) throw new ConvexError({ code: "BAD_REQUEST", message: "الرسالة فارغة" });
    if (text.length > MAX_LEN) throw new ConvexError({ code: "BAD_REQUEST", message: "الرسالة طويلة" });
    await ctx.db.insert("messages", { roomId: args.roomId, senderId: user._id, senderName: user.name ?? "ضيف", text: text || undefined, imageUrl: args.imageUrl, system: false });
    return null;
  },
});

export const remove = mutation({
  args: { messageId: v.id("messages"), tokenOverride: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.tokenOverride);
    const msg = await ctx.db.get("messages", args.messageId);
    if (!msg) return null;
    if (msg.senderId !== user._id) throw new ConvexError({ code: "FORBIDDEN", message: "لا يمكنك حذف" });
    await ctx.db.delete(msg._id);
    return null;
  },
});
