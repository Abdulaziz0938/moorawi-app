import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { requireUser } from "./lib/auth";

// ============================================================
// [moorawi-economy] Wallet helpers
// ============================================================

async function recordTx(
  ctx: any,
  userId: any,
  type: string,
  amount: number,
  balanceAfter: number,
  meta?: string,
) {
  await ctx.db.insert("walletTransactions", {
    userId,
    type,
    amount,
    balanceAfter,
    meta,
    createdAt: Date.now(),
  });
}

// ============================================================
// Queries
// ============================================================

// Get current user's balance + diamonds
export const balance = query({
  args: { tokenOverride: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (!args.tokenOverride) return null;
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", args.tokenOverride!))
      .unique();
    if (!user) return null;
    return {
      coins: user.coins ?? 0,
      diamonds: user.diamonds ?? 0,
      totalPurchased: user.totalPurchased ?? 0,
      totalRecharged: user.totalRecharged ?? 0,
    };
  },
});

// Transaction history (last 50)
export const transactions = query({
  args: {
    tokenOverride: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    if (!args.tokenOverride) return [];
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", args.tokenOverride!))
      .unique();
    if (!user) return [];
    const limit = Math.min(args.limit ?? 50, 200);
    const txs = await ctx.db
      .query("walletTransactions")
      .withIndex("by_user_and_createdAt", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(limit);
    return txs;
  },
});

// ============================================================
// Mutations
// ============================================================

// Spend coins (deduct from balance)
export const spend = mutation({
  args: {
    amount: v.number(),
    meta: v.optional(v.string()),
    tokenOverride: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.amount <= 0) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "المبلغ يجب أن يكون أكبر من صفر" });
    }
    const user = await requireUser(ctx, args.tokenOverride);
    const currentBalance = user.coins ?? 0;
    if (currentBalance < args.amount) {
      throw new ConvexError({ code: "INSUFFICIENT_BALANCE", message: "رصيد غير كافٍ" });
    }
    const newBalance = currentBalance - args.amount;
    await ctx.db.patch("users", user._id, { coins: newBalance });
    await recordTx(ctx, user._id, "spend", -args.amount, newBalance, args.meta);
    return { ok: true, newBalance };
  },
});

// Reward coins (from missions, level ups, etc.)
export const reward = mutation({
  args: {
    amount: v.number(),
    meta: v.optional(v.string()),
    userId: v.optional(v.id("users")),
    tokenOverride: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.amount <= 0) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "المبلغ يجب أن يكون أكبر من صفر" });
    }
    let targetUser;
    if (args.userId) {
      // admin-granted reward to another user
      const me = await requireUser(ctx, args.tokenOverride);
      if (me.adminRole !== "super" && !me.isAdmin) {
        throw new ConvexError({ code: "FORBIDDEN", message: "صلاحيات الأدمن مطلوبة" });
      }
      targetUser = await ctx.db.get("users", args.userId);
    } else {
      targetUser = await requireUser(ctx, args.tokenOverride);
    }
    if (!targetUser) throw new ConvexError({ code: "NOT_FOUND", message: "المستخدم غير موجود" });
    const currentBalance = targetUser.coins ?? 0;
    const newBalance = currentBalance + args.amount;
    await ctx.db.patch("users", targetUser._id, { coins: newBalance });
    await recordTx(ctx, targetUser._id, "reward", args.amount, newBalance, args.meta);
    return { ok: true, newBalance };
  },
});

// Admin recharge (simulates payment gateway for now)
export const recharge = mutation({
  args: {
    amount: v.number(),
    usdCents: v.optional(v.number()),
    meta: v.optional(v.string()),
    tokenOverride: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.amount <= 0) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "المبلغ يجب أن يكون أكبر من صفر" });
    }
    const user = await requireUser(ctx, args.tokenOverride);
    const currentBalance = user.coins ?? 0;
    const newBalance = currentBalance + args.amount;
    const patch: any = { coins: newBalance };
    if (args.usdCents) {
      patch.totalPurchased = (user.totalPurchased ?? 0) + args.usdCents;
    }
    patch.totalRecharged = (user.totalRecharged ?? 0) + args.amount;
    await ctx.db.patch("users", user._id, patch);
    await recordTx(
      ctx,
      user._id,
      "recharge",
      args.amount,
      newBalance,
      args.meta ?? `+${args.amount} coins`,
    );
    return { ok: true, newBalance };
  },
});

// Exchange diamonds → coins (1 diamond = 1 coin، حسب Poppo)
export const exchangeDiamonds = mutation({
  args: {
    diamonds: v.number(),
    tokenOverride: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.diamonds <= 0) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "المبلغ يجب أن يكون أكبر من صفر" });
    }
    const user = await requireUser(ctx, args.tokenOverride);
    const currentDiamonds = user.diamonds ?? 0;
    if (currentDiamonds < args.diamonds) {
      throw new ConvexError({ code: "INSUFFICIENT_BALANCE", message: "رصيد الماس غير كافٍ" });
    }
    const currentCoins = user.coins ?? 0;
    const newDiamonds = currentDiamonds - args.diamonds;
    const newCoins = currentCoins + args.diamonds;
    await ctx.db.patch("users", user._id, {
      diamonds: newDiamonds,
      coins: newCoins,
    });
    await recordTx(
      ctx,
      user._id,
      "exchange",
      args.diamonds,
      newCoins,
      `تبديل ${args.diamonds} 💎 → ${args.diamonds} 💰`,
    );
    return { ok: true, newCoins, newDiamonds };
  },
});
