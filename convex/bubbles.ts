// [moorawi-bubbles] 9-Patch chat bubbles — admin manages, users render
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireUser } from "./lib/auth";

export const list = query({
  args: { onlyActive: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    if (args.onlyActive) {
      return await ctx.db
        .query("chatBubbles")
        .withIndex("by_active", (q) => q.eq("active", true))
        .collect();
    }
    return await ctx.db.query("chatBubbles").collect();
  },
});

export const getByKey = query({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("chatBubbles")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique();
  },
});

function assertAdmin(me: { adminRole?: string; userNumber?: number }) {
  if (me.adminRole !== "super" && me.userNumber !== 1) {
    throw new Error("غير مصرح");
  }
}

export const set = mutation({
  args: {
    id: v.optional(v.id("chatBubbles")),
    key: v.string(),
    name: v.string(),
    imageUrl: v.string(),
    sliceTop: v.number(),
    sliceRight: v.number(),
    sliceBottom: v.number(),
    sliceLeft: v.number(),
    active: v.optional(v.boolean()),
    tokenOverride: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    assertAdmin(me);
    const trimmed = args.name.trim();
    if (trimmed.length < 1) throw new Error("اسم فارغ");
    const k = args.key.trim();
    if (k.length < 1) throw new Error("مفتاح فارغ");

    const patch = {
      key: k,
      name: trimmed,
      imageUrl: args.imageUrl,
      sliceTop: Math.max(0, Math.floor(args.sliceTop)),
      sliceRight: Math.max(0, Math.floor(args.sliceRight)),
      sliceBottom: Math.max(0, Math.floor(args.sliceBottom)),
      sliceLeft: Math.max(0, Math.floor(args.sliceLeft)),
      active: args.active ?? true,
    };

    if (args.id) {
      const existing = await ctx.db.get("chatBubbles", args.id);
      if (!existing) throw new Error("غير موجود");
      await ctx.db.patch("chatBubbles", args.id, patch);
      return { ok: true, id: args.id };
    }

    // إن وجد بنفس المفتاح → تحديث
    const byKey = await ctx.db
      .query("chatBubbles")
      .withIndex("by_key", (q) => q.eq("key", k))
      .unique();
    if (byKey) {
      await ctx.db.patch("chatBubbles", byKey._id, patch);
      return { ok: true, id: byKey._id, updated: true };
    }

    const id = await ctx.db.insert("chatBubbles", patch);
    return { ok: true, id };
  },
});

export const remove = mutation({
  args: { id: v.id("chatBubbles"), tokenOverride: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    assertAdmin(me);
    await ctx.db.delete("chatBubbles", args.id);
    return { ok: true };
  },
});
