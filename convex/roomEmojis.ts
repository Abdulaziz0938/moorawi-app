// [ezo-room-emoji] بث إيموجي متحرك فوق كرسي المايك — يظهر للجميع
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser } from "./lib/auth";

const EMOJI_TTL_MS = 3000;

// Public — إرسال إيموجي (يُبث لكل من في الغرفة)
export const sendEmoji = mutation({
  args: {
    roomId: v.id("rooms"),
    emojiUrl: v.string(),
    tokenOverride: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    if (!me) return { ok: false };

    // احذف أي إيموجي سابق من نفس المستخدم في نفس الغرفة
    const old = await ctx.db
      .query("roomEmojis")
      .withIndex("by_user_room", (q) =>
        q.eq("userId", me._id).eq("roomId", args.roomId)
      )
      .collect();
    for (const r of old) await ctx.db.delete(r._id);

    // أدخل الجديد
    await ctx.db.insert("roomEmojis", {
      roomId: args.roomId,
      userId: me._id,
      emojiUrl: args.emojiUrl,
      expiresAt: Date.now() + EMOJI_TTL_MS,
    });

    return { ok: true };
  },
});

// Public — الإيموجيات النشطة في الغرفة (تُحدّث تلقائياً للجميع)
export const listActive = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    const now = Date.now();
    const rows = await ctx.db
      .query("roomEmojis")
      .withIndex("by_room_expires", (q) =>
        q.eq("roomId", args.roomId).gt("expiresAt", now)
      )
      .take(20);
    return rows.map((r) => ({
      _id: r._id,
      userId: r.userId,
      emojiUrl: r.emojiUrl,
      expiresAt: r.expiresAt,
    }));
  },
});
