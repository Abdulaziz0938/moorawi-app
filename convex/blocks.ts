// [ezo-blocks] نظام حظر المستخدمين
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser } from "./lib/auth";

// حظر مستخدم
export const block = mutation({
  args: {
    targetUserId: v.id("users"),
    tokenOverride: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    if (String(me._id) === String(args.targetUserId)) {
      throw new Error("لا يمكنك حظر نفسك");
    }
    const target = await ctx.db.get("users", args.targetUserId);
    if (!target) throw new Error("المستخدم غير موجود");

    const existing = await ctx.db
      .query("blocks")
      .withIndex("by_pair", (q) =>
        q.eq("blockerId", me._id).eq("blockedId", args.targetUserId)
      )
      .first();
    if (existing) return { ok: true, already: true };

    await ctx.db.insert("blocks", {
      blockerId: me._id,
      blockedId: args.targetUserId,
      blockedName: target.name ?? "ضيف",
      blockedUserNumber: target.userNumber,
      createdAt: Date.now(),
    });
    return { ok: true };
  },
});

// إلغاء حظر
export const unblock = mutation({
  args: {
    targetUserId: v.id("users"),
    tokenOverride: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    const existing = await ctx.db
      .query("blocks")
      .withIndex("by_pair", (q) =>
        q.eq("blockerId", me._id).eq("blockedId", args.targetUserId)
      )
      .first();
    if (existing) {
      await ctx.db.delete("blocks", existing._id);
    }
    return { ok: true };
  },
});

// هل حظرت هذا المستخدم؟
export const isBlocked = query({
  args: {
    targetUserId: v.id("users"),
    tokenOverride: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    const row = await ctx.db
      .query("blocks")
      .withIndex("by_pair", (q) =>
        q.eq("blockerId", me._id).eq("blockedId", args.targetUserId)
      )
      .first();
    return !!row;
  },
});

// قائمة الحظر (من حظرتهم)
export const myBlocked = query({
  args: { tokenOverride: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    return await ctx.db
      .query("blocks")
      .withIndex("by_blocker", (q) => q.eq("blockerId", me._id))
      .order("desc")
      .take(100);
  },
});
