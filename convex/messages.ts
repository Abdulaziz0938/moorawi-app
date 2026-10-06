import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser } from "./lib/auth";

const MAX_LEN = 500;

function vipLevelFromTotalSent(t: number): number {
  const T = [1000, 5000, 20000, 50000, 100000, 250000, 500000];
  return T.filter((x) => t >= x).length;
}

export const list = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    const rows = await ctx.db.query("messages").withIndex("by_room", (q) => q.eq("roomId", args.roomId)).order("desc").take(60);
    const enriched = await Promise.all(rows.map(async (m) => {
      const sender = await ctx.db.get("users", m.senderId);
      const avatarUrl = sender?.avatarId ? await ctx.storage.getUrl(sender.avatarId) : null;
      const imageUrl = m.imageId ? await ctx.storage.getUrl(m.imageId) : null;
      const vip = vipLevelFromTotalSent(sender?.totalSent ?? 0);
      return { _id: m._id, senderId: m.senderId, senderName: m.senderName, senderNumber: sender?.userNumber ?? null, senderVip: vip, avatarUrl, text: m.text ?? null, imageUrl, system: m.system ?? false, createdAt: m._creationTime };
    }));
    return enriched.reverse();
  },
});

export const generateUploadUrl = mutation({
  args: { tokenOverride: v.optional(v.string()) },
  handler: async (ctx, args) => { await requireUser(ctx, args.tokenOverride); return await ctx.storage.generateUploadUrl(); },
});

export const send = mutation({
  args: { roomId: v.id("rooms"), text: v.optional(v.string()), imageId: v.optional(v.id("_storage")), tokenOverride: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.tokenOverride);
    const text = args.text?.trim() ?? "";
    if (!text && !args.imageId) throw new ConvexError({ code: "BAD_REQUEST", message: "الرسالة فارغة" });
    if (text.length > MAX_LEN) throw new ConvexError({ code: "BAD_REQUEST", message: "الرسالة طويلة" });
    await ctx.db.insert("messages", { roomId: args.roomId, senderId: user._id, senderName: user.name ?? "ضيف", text: text || undefined, imageId: args.imageId, system: false });
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
