import { internalMutation } from "./_generated/server";
export const seedVipAnimations = internalMutation({
  args: {},
  handler: async (ctx) => {
    let count = 0;
    const items: [string, string][] = [
      ["vip.entry.1", "https://res.cloudinary.com/wdicx984/raw/upload/v1792755686/cdk7pcwudxhqa8yycyib.pag"],
      ["vip.frame.1", "https://res.cloudinary.com/wdicx984/raw/upload/v1792755686/cdk7pcwudxhqa8yycyib.pag"],
      ["vip.entry.2", "https://res.cloudinary.com/wdicx984/raw/upload/v1792755688/yupm1pkfnsyvtkshuk1c.pag"],
      ["vip.frame.2", "https://res.cloudinary.com/wdicx984/raw/upload/v1792755688/yupm1pkfnsyvtkshuk1c.pag"],
      ["vip.entry.3", "https://res.cloudinary.com/wdicx984/raw/upload/v1792755690/xf7oke6i5sba02myqfpi.pag"],
      ["vip.frame.3", "https://res.cloudinary.com/wdicx984/raw/upload/v1792755690/xf7oke6i5sba02myqfpi.pag"],
      ["vip.entry.4", "https://res.cloudinary.com/wdicx984/raw/upload/v1792755693/dmxasve1xrafhtge02cq.pag"],
      ["vip.frame.4", "https://res.cloudinary.com/wdicx984/raw/upload/v1792755693/dmxasve1xrafhtge02cq.pag"],
      ["vip.entry.5", "https://res.cloudinary.com/wdicx984/raw/upload/v1792755695/uplws5ascye0gdb2wm1f.pag"],
      ["vip.frame.5", "https://res.cloudinary.com/wdicx984/raw/upload/v1792755695/uplws5ascye0gdb2wm1f.pag"],
      ["vip.entry.6", "https://res.cloudinary.com/wdicx984/raw/upload/v1792755697/atckys1f4rxj5ai7kmbx.pag"],
      ["vip.frame.6", "https://res.cloudinary.com/wdicx984/raw/upload/v1792755697/atckys1f4rxj5ai7kmbx.pag"],
      ["vip.entry.7", "https://res.cloudinary.com/wdicx984/raw/upload/v1792755700/w8j9xwougbralnw5z8va.pag"],
      ["vip.frame.7", "https://res.cloudinary.com/wdicx984/raw/upload/v1792755700/w8j9xwougbralnw5z8va.pag"],
    ];
    for (const [key, url] of items) {
      const existing = await ctx.db.query("assets").withIndex("by_key", q => q.eq("key", key)).first();
      if (existing) {
        await ctx.db.patch(existing._id, { imageUrl: url, updatedAt: Date.now() });
      } else {
        await ctx.db.insert("assets", { key, imageUrl: url, updatedAt: Date.now() });
      }
      count++;
    }
    return { ok: true, count };
  }
});

