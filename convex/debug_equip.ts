import { query } from "./_generated/server";
import { v } from "convex/values";

export const debugUser = query({
  args: { userNumber: v.number() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("userNumber"), args.userNumber))
      .first();
    if (!user) return { error: "user not found" };
    const result: any = { userNumber: user.userNumber, name: user.name };
    for (const key of ["equippedEntryEffectId", "equippedVehicleId"] as const) {
      const id = user[key];
      if (!id) { result[key] = null; continue; }
      const item = await ctx.db.get("shopItems", id);
      result[key] = item ? {
        _id: item._id,
        name: item.name,
        imageUrl: item.imageUrl,
        previewType: (item as any).previewType,
        category: item.category,
      } : { missing: true, id };
    }
    return result;
  },
});
