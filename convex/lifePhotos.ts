// [ezo-life-photos] صور الحياة — 9 صور كحد أقصى
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser } from "./lib/auth";

const MAX_PHOTOS = 9;

// صور حياة مستخدم
export const listByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("lifePhotos")
      .withIndex("by_user_and_order", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

// إضافة صورة (للمستخدم نفسه فقط)
export const add = mutation({
  args: {
    imageUrl: v.string(),
    tokenOverride: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    if (!args.imageUrl.trim()) throw new Error("صورة مطلوبة");

    const existing = await ctx.db
      .query("lifePhotos")
      .withIndex("by_user_and_order", (q) => q.eq("userId", me._id))
      .collect();

    if (existing.length >= MAX_PHOTOS) {
      throw new Error(`الحد الأقصى ${MAX_PHOTOS} صور`);
    }

    const id = await ctx.db.insert("lifePhotos", {
      userId: me._id,
      imageUrl: args.imageUrl.trim(),
      order: existing.length,
      createdAt: Date.now(),
    });
    return { ok: true, photoId: id };
  },
});

// حذف صورة (للمالك فقط)
export const remove = mutation({
  args: {
    photoId: v.id("lifePhotos"),
    tokenOverride: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    const photo = await ctx.db.get("lifePhotos", args.photoId);
    if (!photo) throw new Error("الصورة غير موجودة");
    if (String(photo.userId) !== String(me._id)) {
      throw new Error("لا يمكنك حذف صورة ليست لك");
    }
    await ctx.db.delete("lifePhotos", args.photoId);
    return { ok: true };
  },
});
