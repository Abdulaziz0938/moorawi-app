import { internalMutation } from "./_generated/server";
export const deleteJunk = internalMutation({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("assets").collect();
    const junk = all.filter(a => a.key.startsWith("asset.others."));
    let deleted = 0;
    for (const item of junk) {
      await ctx.db.delete(item._id);
      deleted++;
    }
    return { deleted, remaining: all.length - deleted };
  }
});

