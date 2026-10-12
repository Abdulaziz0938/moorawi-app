// [ezo-music] إدارة مكتبة موسيقى المستخدم
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser } from "./lib/auth";

// رفع أغنية جديدة
export const upload = mutation({
  args: {
    name: v.string(),
    url: v.string(),
    durationSec: v.optional(v.number()),
    tokenOverride: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    if (!me) throw new Error("غير مصرح");

    const name = args.name.trim();
    if (name.length < 1) throw new Error("اسم الأغنية فارغ");
    if (name.length > 100) throw new Error("اسم طويل جداً");

    const id = await ctx.db.insert("userMusic", {
      userId: me._id,
      name,
      url: args.url,
      durationSec: args.durationSec,
      uploadedAt: Date.now(),
    });
    return { ok: true, id };
  },
});

// قائمتي
export const myMusic = query({
  args: { tokenOverride: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    if (!me) return [];
    const rows = await ctx.db
      .query("userMusic")
      .withIndex("by_user", (q) => q.eq("userId", me._id))
      .order("desc")
      .collect();
    return rows;
  },
});

// حذف أغنية
export const remove = mutation({
  args: { musicId: v.id("userMusic"), tokenOverride: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    const m = await ctx.db.get("userMusic", args.musicId);
    if (!m) throw new Error("غير موجود");
    if (m.userId !== me._id) throw new Error("غير مصرح");
    await ctx.db.delete("userMusic", args.musicId);
    return { ok: true };
  },
});
