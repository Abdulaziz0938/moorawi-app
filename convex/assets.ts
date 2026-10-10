// [moorawi-assets] Admin-managed static asset overrides
//
// Every static image in the app (VIP badges, admin badges, ...) has a
// canonical key. If a row exists in this table, the app uses imageUrl;
// otherwise it falls back to the bundled /vip/*.png or /badges/*.png.
//
// Keys use dot notation:  vip.pvip.3   vip.banner.7   admin.super

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser } from "./lib/auth";

// Public — frontend reads all overrides at once (small table).
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("assets").collect();
  },
});

function assertAdmin(me: { adminRole?: string; userNumber?: number }) {
  if (me.adminRole !== "super" && me.userNumber !== 1) {
    throw new Error("غير مصرح");
  }
}

export const set = mutation({
  args: {
    key: v.string(),
    imageUrl: v.string(),
    tokenOverride: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    assertAdmin(me);
    const existing = await ctx.db
      .query("assets")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique();
    if (existing) {
      await ctx.db.patch("assets", existing._id, {
        imageUrl: args.imageUrl,
        updatedAt: Date.now(),
        updatedBy: me._id,
      });
      return existing._id;
    }
    return await ctx.db.insert("assets", {
      key: args.key,
      imageUrl: args.imageUrl,
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
    assertAdmin(me);
    const existing = await ctx.db
      .query("assets")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique();
    if (existing) await ctx.db.delete("assets", existing._id);
    return { ok: true };
  },
});
