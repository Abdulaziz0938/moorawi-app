import { internalMutation } from "./_generated/server";

export const bindDragon = internalMutation({
  args: {},
  handler: async (ctx) => {
    // البحث عن التنين في المعرض
    const dragon = await ctx.db.query("assets").withIndex("by_key", q => q.eq("key", "asset.custom.dragon-halo")).first();
    if (!dragon) return { error: "Dragon not found in assets table" };

    // البحث عن زخرفة VIP 5 الحالية
    const existing = await ctx.db.query("assets").withIndex("by_key", q => q.eq("key", "vip.top.5")).first();
    
    if (existing) {
      await ctx.db.patch(existing._id, { imageUrl: dragon.imageUrl, updatedAt: Date.now() });
    } else {
      await ctx.db.insert("assets", { key: "vip.top.5", imageUrl: dragon.imageUrl, updatedAt: Date.now() });
    }
    return { ok: true, message: "Dragon bound to vip.top.5" };
  }
});

