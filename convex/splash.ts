import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// 1. دالة جلب الصورة (تستخدم في شاشة البداية)
export const getSplashImage = query({
  args: {},
  handler: async (ctx) => {
    // نبحث في جدول config عن السجل الذي يطابق المفتاح "splashImageUrl"
    const config = await ctx.db
      .query("config")
      .withIndex("by_key", (q) => q.eq("key", "splashImageUrl"))
      .first();
    
    // نعيد الرابط (القيمة) إذا وجد، أو null إذا لم يوجد
    return config?.value || null;
  },
});

// 2. دالة حفظ الصورة الجديدة (تستخدم في لوحة الإدارة)
export const setSplashImageUrl = mutation({
  args: { url: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("config")
      .withIndex("by_key", (q) => q.eq("key", "splashImageUrl"))
      .first();

    if (existing) {
      // إذا كان السجل موجوداً، نقوم بتحديث الرابط
      await ctx.db.patch(existing._id, { value: args.url, updatedAt: Date.now() });
    } else {
      // إذا لم يكن موجوداً، نقوم بإنشاء سجل جديد
      await ctx.db.insert("config", { key: "splashImageUrl", value: args.url, updatedAt: Date.now() });
    }
  },
});
