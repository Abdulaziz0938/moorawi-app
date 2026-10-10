import { mutation } from "./_generated/server";
import { ConvexError, v } from "convex/values";

// ⚠️ One-time reset (protected by confirm string)
// Resets charms + totalSent + totalReceived for ALL users (except owner)
export const resetAllStats = mutation({
  args: { confirm: v.string() },
  handler: async (ctx, args) => {
    if (args.confirm !== "RESET_ALL_STATS_2026") {
      throw new ConvexError({ code: "FORBIDDEN", message: "Confirm mismatch" });
    }

    const all = await ctx.db.query("users").collect();
    let reset = 0;

    for (const u of all) {
      await ctx.db.patch("users", u._id, {
        charms: 0,
        totalSent: 0,
        totalReceived: 0,
      });
      reset++;
    }

    return { ok: true, reset };
  },
});

// Reset walletTransactions + giftTransactions (fresh start)
export const resetTransactions = mutation({
  args: { confirm: v.string() },
  handler: async (ctx, args) => {
    if (args.confirm !== "RESET_TX_2026") {
      throw new ConvexError({ code: "FORBIDDEN", message: "Confirm mismatch" });
    }

    const wallet = await ctx.db.query("walletTransactions").collect();
    for (const t of wallet) await ctx.db.delete("walletTransactions", t._id);

    const gift = await ctx.db.query("giftTransactions").collect();
    for (const t of gift) await ctx.db.delete("giftTransactions", t._id);

    return { ok: true, deletedWallet: wallet.length, deletedGift: gift.length };
  },
});
