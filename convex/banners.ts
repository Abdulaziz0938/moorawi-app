// [moorawi-banners] Promotional banners for Trend tab
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser, isAssetManager } from "./lib/auth";

// Public — frontend reads active banners sorted by order
export const list = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db
      .query("banners")
      .withIndex("by_active_order", (q) => q.eq("active", true))
      .collect();
    return rows.sort((a, b) => a.order - b.order);
  },
});

// Admin — read all (including inactive)
export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("banners").collect();
    return rows.sort((a, b) => a.order - b.order);
  },
});

export const set = mutation({
  args: {
    id: v.optional(v.id("banners")),
    imageUrl: v.string(),
    title: v.optional(v.string()),
    linkRoomId: v.optional(v.id("rooms")),
    order: v.number(),
    active: v.optional(v.boolean()),
    tokenOverride: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    if (!isAssetManager(me)) throw new Error("غير مصرح");
    if (!args.imageUrl) throw new Error("صورة مطلوبة");

    const patch = {
      imageUrl: args.imageUrl,
      title: args.title,
      linkRoomId: args.linkRoomId,
      order: Math.max(0, Math.floor(args.order)),
      active: args.active ?? true,
      updatedAt: Date.now(),
      updatedBy: me._id,
    };

    if (args.id) {
      const existing = await ctx.db.get("banners", args.id);
      if (!existing) throw new Error("غير موجود");
      await ctx.db.patch("banners", args.id, patch);
      return { ok: true, id: args.id };
    }
    const id = await ctx.db.insert("banners", patch);
    return { ok: true, id };
  },
});

export const remove = mutation({
  args: { id: v.id("banners"), tokenOverride: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    if (!isAssetManager(me)) throw new Error("غير مصرح");
    await ctx.db.delete("banners", args.id);
    return { ok: true };
  },
});
