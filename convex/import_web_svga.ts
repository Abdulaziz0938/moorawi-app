import { mutation } from "./_generated/server";

export const importWebSvga = mutation({
  args: {},
  handler: async (ctx) => {
    const items: [string, string][] = [
      ["asset.gifts.rocket", "https://cdn.jsdelivr.net/gh/svga/SVGA-Samples@master/Rocket.svga"],
      ["asset.gifts.rose", "https://cdn.jsdelivr.net/gh/svga/SVGA-Samples@master/rose.svga"],
      ["asset.gifts.twitter_heart", "https://cdn.jsdelivr.net/gh/svga/SVGA-Samples@master/TwitterHeart.svga"],
      ["asset.gifts.heartbeat", "https://cdn.jsdelivr.net/gh/svga/SVGA-Samples@master/heartbeat.svga"],
      ["asset.gifts.kingset", "https://cdn.jsdelivr.net/gh/svga/SVGA-Samples@master/kingset.svga"],
      ["asset.vehicles.posche", "https://cdn.jsdelivr.net/gh/svga/SVGA-Samples@master/posche.svga"],
      ["asset.gifts.angel", "https://cdn.jsdelivr.net/gh/svga/SVGA-Samples@master/angel.svga"],
      ["asset.gifts.lion", "https://cdn.jsdelivr.net/gh/svga/SVGA-Samples@master/lion.svga"],
      ["asset.gifts.halloween", "https://cdn.jsdelivr.net/gh/svga/SVGA-Samples@master/halloween.svga"],
    ];
    let updated = 0, inserted = 0;
    for (const [key, url] of items) {
      const existing = await ctx.db.query("assets").withIndex("by_key", q => q.eq("key", key)).first();
      if (existing) {
        await ctx.db.patch(existing._id, { imageUrl: url, updatedAt: Date.now() });
        updated++;
      } else {
        await ctx.db.insert("assets", { key, imageUrl: url, updatedAt: Date.now() });
        inserted++;
      }
    }
    return { ok: true, updated, inserted };
  },
});
