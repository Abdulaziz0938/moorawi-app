import { query } from "./_generated/server";

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
