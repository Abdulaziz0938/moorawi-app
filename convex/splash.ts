import { query } from "./_generated/server";

export const getSplashImage = query({
  args: {},
  handler: async (ctx) => {
    // نبحث عن أول سجل في جدول الإعدادات (config)
    const config = await ctx.db.query("config").first();
    // نعيد رابط الصورة، أو رابط افتراضي إذا لم يوجد
    return config?.splashImageUrl || null;
  },
});
