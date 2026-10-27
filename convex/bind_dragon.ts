import { internalMutation } from "./_generated/server";

export const bindDragon = internalMutation({
  args: {},
  handler: async (ctx) => {
    // ط§ظ„ط¨ط­ط« ط¹ظ† ط§ظ„طھظ†ظٹظ† ظپظٹ ط§ظ„ظ…ط¹ط±ط¶
    const dragon = await ctx.db.query("assets").withIndex("by_key", q => q.eq("key", "asset.custom.dragon-halo")).first();
    if (!dragon) return { error: "Dragon not found in assets table" };

    // ط§ظ„ط¨ط­ط« ط¹ظ† ط²ط®ط±ظپط© VIP 5 ط§ظ„ط­ط§ظ„ظٹط©
    const existing = await ctx.db.query("assets").withIndex("by_key", q => q.eq("key", "vip.top.5")).first();
    
    if (existing) {
      await ctx.db.patch(existing._id, { imageUrl: dragon.imageUrl, updatedAt: Date.now() });
    } else {
      await ctx.db.insert("assets", { key: "vip.top.5", imageUrl: dragon.imageUrl, updatedAt: Date.now() });
    }
    return { ok: true, message: "Dragon bound to vip.top.5" };
  }
});

