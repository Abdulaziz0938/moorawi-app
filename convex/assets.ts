// [ezo-assets] Admin-managed static asset overrides
//
// Every static image in the app (VIP badges, admin badges, ...) has a
// canonical key. If a row exists in this table, the app uses imageUrl;
// otherwise it falls back to the bundled /vip/*.png or /badges/*.png.
//
// Keys use dot notation:  vip.pvip.3   vip.banner.7   admin.super

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser, isAssetManager } from "./lib/auth";

// Public — frontend reads all overrides at once (small table).
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("assets").collect();
  },
});



export const set = mutation({
  args: {
    key: v.string(),
    imageUrl: v.string(),
    frameScale: v.optional(v.number()),
    frameOffsetX: v.optional(v.number()),
    frameOffsetY: v.optional(v.number()),
    canvasSize: v.optional(v.number()),
    holeSize: v.optional(v.number()),
    offsetX: v.optional(v.number()),
    offsetY: v.optional(v.number()),
    topOffsetX: v.optional(v.number()),
    topOffsetY: v.optional(v.number()),
    topWidthPercent: v.optional(v.number()),
    topScale: v.optional(v.number()),
    assetType: v.optional(v.string()),
    tokenOverride: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    if (!isAssetManager(me)) throw new Error("غير مصرح");
    const existing = await ctx.db
      .query("assets")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique();
    if (existing) {
      const patch: any = {
        imageUrl: args.imageUrl,
        updatedAt: Date.now(),
        updatedBy: me._id,
      };
      if (args.frameScale !== undefined) patch.frameScale = args.frameScale;
      if (args.frameOffsetX !== undefined) patch.frameOffsetX = args.frameOffsetX;
      if (args.frameOffsetY !== undefined) patch.frameOffsetY = args.frameOffsetY;
      if (args.canvasSize !== undefined) patch.canvasSize = args.canvasSize;
      if (args.holeSize !== undefined) patch.holeSize = args.holeSize;
      if (args.offsetX !== undefined) patch.offsetX = args.offsetX;
      if (args.offsetY !== undefined) patch.offsetY = args.offsetY;
      if (args.assetType !== undefined) patch.assetType = args.assetType;
      await ctx.db.patch("assets", existing._id, patch);
      return existing._id;
    }
    return await ctx.db.insert("assets", {
      key: args.key,
      imageUrl: args.imageUrl,
      frameScale: args.frameScale,
      frameOffsetX: args.frameOffsetX,
      frameOffsetY: args.frameOffsetY,
      canvasSize: args.canvasSize,
      holeSize: args.holeSize,
      offsetX: args.offsetX,
      offsetY: args.offsetY,
      assetType: args.assetType as any,
      updatedAt: Date.now(),
      updatedBy: me._id,
    });
  },
});

export const clear = mutation({
  args: {
    key: v.string(),
    tokenOverride: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    if (!isAssetManager(me)) throw new Error("غير مصرح");
    const existing = await ctx.db
      .query("assets")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique();
    if (existing) await ctx.db.delete("assets", existing._id);
    return { ok: true };
  },
});
