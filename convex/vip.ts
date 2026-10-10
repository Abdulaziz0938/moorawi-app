// [moorawi-vip] VIP subscription system
//
// VIP is a PAID subscription (1-7), not a wealth/charm level.
// - vipSubscriptions: immutable log of every purchase/gift/admin grant
// - users.vipLevel + users.vipExpiresAt: denormalized current state (fast reads)
//
// Rules:
// - Buying a HIGHER level while active: upgrade immediately, expiry kept if
//   longer, else extended.
// - Buying the SAME or LOWER level while active: extend expiry by 30 days.
// - Buying when expired: activate from now.
// - Admin can grant for free via `grantVip`.
// - `checkAndExpire` is a lazy sweep — called by myVip() and profileFull.

import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { requireUser } from "./lib/auth";
import { activeVipLevel } from "./lib/vip";

// ============================================================
// Config — 7 VIP levels. Price in Coins (1 Coin = 1 Diamond).
// All visuals (color, icon name, imageUrl) are DATA, not hardcoded in UI.
// Admin can later upload real images via adminPanel and update imageUrl.
// ============================================================
export const VIP_LEVELS = [
  { level: 1, name: "VIP 1",  priceCoins: 10_000,   color: "#9ca3af", icon: "Star",      imageUrl: null },
  { level: 2, name: "VIP 2",  priceCoins: 50_000,   color: "#60a5fa", icon: "Star",      imageUrl: null },
  { level: 3, name: "VIP 3",  priceCoins: 150_000,  color: "#34d399", icon: "Sparkles",  imageUrl: null },
  { level: 4, name: "VIP 4",  priceCoins: 400_000,  color: "#a78bfa", icon: "Crown",     imageUrl: null },
  { level: 5, name: "VIP 5",  priceCoins: 1_000_000, color: "#f472b6", icon: "Crown",    imageUrl: null },
  { level: 6, name: "VIP 6",  priceCoins: 2_500_000, color: "#fb923c", icon: "Crown",    imageUrl: null },
  { level: 7, name: "VIP 7",  priceCoins: 5_000_000, color: "#facc15", icon: "Crown",    imageUrl: null },
] as const;

const VIP_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

// ============================================================
// Query: myVip — current user's VIP state (lazy expiring first)
// ============================================================
export const myVip = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireUser(ctx);
    const level = activeVipLevel(me);
    return {
      level,
      expiresAt: me.vipExpiresAt ?? null,
      active: level > 0,
      plans: VIP_LEVELS,
    };
  },
});

// ============================================================
// Query: getVipStatus(userId) — for viewing others
// ============================================================
export const getVipStatus = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const u = await ctx.db.get("users", args.userId);
    if (!u) return { level: 0, active: false };
    const level = activeVipLevel(u);
    return { level, active: level > 0, expiresAt: u.vipExpiresAt ?? null };
  },
});

// ============================================================
// Mutation: buyVip(level) — deduct coins, activate/extend
// ============================================================
export const buyVip = mutation({
  args: { level: v.number() },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx);
    const plan = VIP_LEVELS.find((p) => p.level === args.level);
    if (!plan) throw new Error("مستوى VIP غير صالح");

    const balance = me.coins ?? 0;
    if (balance < plan.priceCoins) {
      throw new Error(`تحتاج ${plan.priceCoins.toLocaleString()} عملة — رصيدك ${balance.toLocaleString()}`);
    }

    const now = Date.now();
    const currentLevel = activeVipLevel(me);
    const currentExpiry = (me.vipExpiresAt && me.vipExpiresAt > now) ? me.vipExpiresAt : 0;

    let newLevel: number;
    let newExpiry: number;

    if (currentLevel === 0) {
      // expired or none — activate fresh
      newLevel = args.level;
      newExpiry = now + VIP_DAYS * DAY_MS;
    } else if (args.level > currentLevel) {
      // upgrade — start the new level now, extend expiry by 30d (keep leftover if any)
      newLevel = args.level;
      newExpiry = Math.max(currentExpiry, now) + VIP_DAYS * DAY_MS;
    } else {
      // same or lower — keep level, extend expiry
      newLevel = currentLevel;
      newExpiry = currentExpiry + VIP_DAYS * DAY_MS;
    }

    // 1) Deduct coins
    await ctx.db.patch("users", me._id, {
      coins: balance - plan.priceCoins,
      vipLevel: newLevel,
      vipExpiresAt: newExpiry,
    });

    // 2) Log subscription
    const subId = await ctx.db.insert("vipSubscriptions", {
      userId: me._id,
      level: args.level,
      purchasedAt: now,
      expiresAt: newExpiry,
      autoRenew: false,
      purchasePrice: plan.priceCoins,
      source: "purchase",
    });

    // 3) Wallet transaction log
    await ctx.db.insert("walletTransactions", {
      userId: me._id,
      type: "spend",
      amount: -plan.priceCoins,
      balanceAfter: balance - plan.priceCoins,
      meta: `شراء ${plan.name}`,
      createdAt: now,
    });

    return { ok: true, level: newLevel, expiresAt: newExpiry, subscriptionId: subId };
  },
});

// ============================================================
// Mutation: grantVip(userId, level, days) — ADMIN ONLY (or future gift)
// ============================================================
export const grantVip = mutation({
  args: {
    userId: v.id("users"),
    level: v.number(),
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx);
    if (me.adminRole !== "owner") throw new Error("غير مصرح");
    const plan = VIP_LEVELS.find((p) => p.level === args.level);
    if (!plan) throw new Error("مستوى VIP غير صالح");
    const days = args.days ?? VIP_DAYS;

    const target = await ctx.db.get("users", args.userId);
    if (!target) throw new Error("المستخدم غير موجود");

    const now = Date.now();
    const currentExpiry = (target.vipExpiresAt && target.vipExpiresAt > now) ? target.vipExpiresAt : now;
    const newExpiry = currentExpiry + days * DAY_MS;

    await ctx.db.patch("users", args.userId, {
      vipLevel: args.level,
      vipExpiresAt: newExpiry,
    });

    const subId = await ctx.db.insert("vipSubscriptions", {
      userId: args.userId,
      level: args.level,
      purchasedAt: now,
      expiresAt: newExpiry,
      autoRenew: false,
      purchasePrice: 0,
      source: "admin",
    });

    return { ok: true, level: args.level, expiresAt: newExpiry, subscriptionId: subId };
  },
});

// ============================================================
// Mutation: checkAndExpire — lazy sweep (called from myVip / cron)
// ============================================================
export const checkAndExpire = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const expired = await ctx.db
      .query("users")
      .filter((q) => q.and(
        q.gt(q.field("vipLevel"), 0),
        q.gt(q.field("vipExpiresAt"), 0),
        q.lte(q.field("vipExpiresAt"), now),
      ))
      .take(50);
    for (const u of expired) {
      await ctx.db.patch("users", u._id, { vipLevel: 0 });
    }
    return { expired: expired.length };
  },
});

// ============================================================
// Query: getPlans — public (for VipShopSheet)
// ============================================================
export const getPlans = query({
  args: {},
  handler: async () => VIP_LEVELS,
});
