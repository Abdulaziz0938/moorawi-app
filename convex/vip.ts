
// [custom-vip-tiers] ط¹طھط¨ط§طھ ظ…ط³طھظˆظٹط§طھ ط§ظ„ظ€ VIP ظ…طھظˆط§ظپظ‚ط© ظ…ط¹ ط³ط¹ط± ط§ظ„طµط±ظپ (700 coins = $1)
export const EZO_VIP_LEVELS = [
  { level: 0, minCoins: 0, usd: 0, name: "ط¹ط§ط¯ظٹ" },
  { level: 1, minCoins: 7000, usd: 10, name: "ظپط§ط±ط³" },       // 7K Coins (~$10)
  { level: 2, minCoins: 35000, usd: 50, name: "ظ†ط¨ظٹظ„" },      // 35K Coins (~$50)
  { level: 3, minCoins: 105000, usd: 150, name: "ظپظٹظƒظˆظ†طھ" },  // 105K Coins (~$150)
  { level: 4, minCoins: 350000, usd: 500, name: "ط¯ظˆظ‚" },     // 350K Coins (~$500)
  { level: 5, minCoins: 1050000, usd: 1500, name: "ط§ظ„ظ…ظ„ظƒ" },  // 1.05M Coins (~$1,500) - King
  { level: 6, minCoins: 3500000, usd: 5000, name: "ط§ظ„ط¥ظ…ط¨ط±ط§ط·ظˆط±" }, // 3.5M Coins (~$5,000) - Emperor
  { level: 7, minCoins: 10500000, usd: 15000, name: "ط§ظ„ط£ط³ط·ظˆط±ط©" }, // 10.5M Coins (~$15,000) - SVIP Legend
];

/**
 * ط­ط³ط§ط¨ ظ…ط³طھظˆظ‰ ط§ظ„ظ€ VIP ط§ظ„طھظ„ظ‚ط§ط¦ظٹ ط¨ظ†ط§ط،ظ‹ ط¹ظ„ظ‰ ط¥ط¬ظ…ط§ظ„ظٹ ط§ظ„ط¹ظ…ظ„ط§طھ ط§ظ„ظ…ط´ط­ظˆظ†ط© ط¨ط³ط¹ط± طµط±ظپظƒ
 */
export function calculateEzoVipLevel(totalRechargedCoins: number = 0): number {
  let currentLevel = 0;
  for (const tier of EZO_VIP_LEVELS) {
    if (totalRechargedCoins >= tier.minCoins) {
      currentLevel = tier.level;
    } else {
      break;
    }
  }
  return currentLevel;
}


// [ezo-vip] VIP subscription system
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
// - `checkAndExpire` is a lazy sweep â€” called by myVip() and profileFull.

import { v } from "convex/values"
import { ConvexError } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { requireUser, isFullAdmin } from "./lib/auth";
import { activeVipLevel } from "./lib/vip";

// ============================================================
// Config â€” 7 VIP levels. Price in Coins (1 Coin = 1 Diamond).
// All visuals (color, icon name, imageUrl) are DATA, not hardcoded in UI.
// Admin can later upload real images via adminPanel and update imageUrl.
// ============================================================
export const VIP_LEVELS = [
  { level: 1, name: "VIP 1",  priceCoins: 24_000,    color: "#10b981", accent: "#34d399", exclusive: false, exclusiveReason: null },
  { level: 2, name: "VIP 2",  priceCoins: 60_000,    color: "#3b82f6", accent: "#60a5fa", exclusive: false, exclusiveReason: null },
  { level: 3, name: "VIP 3",  priceCoins: 240_000,   color: "#a855f7", accent: "#c084fc", exclusive: false, exclusiveReason: null },
  { level: 4, name: "VIP 4",  priceCoins: 599_998,   color: "#dc2626", accent: "#f87171", exclusive: false, exclusiveReason: null },
  { level: 5, name: "VIP 5",  priceCoins: null,      color: "#eab308", accent: "#facc15", exclusive: true,  exclusiveReason: "ط­طµط±ظٹ â€” ظٹظڈط­طµظ„ ط¹ظ„ظٹظ‡ ط¹ط¨ط± ط§ظ„ط´ط­ظ† ط§ظ„طھط±ظƒظٹ" },
  { level: 6, name: "VIP 6",  priceCoins: null,      color: "#f97316", accent: "#fb923c", exclusive: true,  exclusiveReason: "ط­طµط±ظٹ â€” ظٹظڈط­طµظ„ ط¹ظ„ظٹظ‡ ط¹ط¨ط± ط§ظ„ط´ط­ظ† ط§ظ„طھط±ظƒظٹ" },
  { level: 7, name: "VIP 7",  priceCoins: null,      color: "#fbbf24", accent: "#fde047", exclusive: true,  exclusiveReason: "ط­طµط±ظٹ â€” ظٹظڈط­طµظ„ ط¹ظ„ظٹظ‡ ط¹ط¨ط± ط§ظ„ط´ط­ظ† ط§ظ„طھط±ظƒظٹ" },
] as const;

const VIP_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

// ============================================================
// Query: myVip â€” current user's VIP state (lazy expiring first)
// ============================================================
export const myVip = query({
  args: { tokenOverride: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
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
// Query: getVipStatus(userId) â€” for viewing others
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
// Mutation: buyVip(level) â€” deduct coins, activate/extend
// ============================================================
export const buyVip = mutation({
  args: { level: v.number(), tokenOverride: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    const plan = VIP_LEVELS.find((p) => p.level === args.level);
    if (!plan) throw new ConvexError({ code: "BAD_REQUEST", message: "ظ…ط³طھظˆظ‰ VIP ط؛ظٹط± طµط§ظ„ط­" });
    if (plan.exclusive || plan.priceCoins === null) {
      throw new ConvexError({ code: "FORBIDDEN", message: "ظ‡ط°ط§ ط§ظ„ظ…ط³طھظˆظ‰ ط­طµط±ظٹ â€” ظٹظڈط­طµظ„ ط¹ظ„ظٹظ‡ ط¹ط¨ط± ط§ظ„ط´ط­ظ† ط§ظ„طھط±ظƒظٹ" });
    }
    const price = plan.priceCoins; // narrowed to number

    const balance = me.coins ?? 0;
    if (balance < price) {
      throw new ConvexError({ code: "INSUFFICIENT_BALANCE", message: `طھط­طھط§ط¬ ${price.toLocaleString()} ط¹ظ…ظ„ط© â€” ط±طµظٹط¯ظƒ ${balance.toLocaleString()}` });
    }

    const now = Date.now();
    const currentLevel = activeVipLevel(me);
    const currentExpiry = (me.vipExpiresAt && me.vipExpiresAt > now) ? me.vipExpiresAt : 0;

    let newLevel: number;
    let newExpiry: number;

    if (currentLevel === 0) {
      // expired or none â€” activate fresh
      newLevel = args.level;
      newExpiry = now + VIP_DAYS * DAY_MS;
    } else if (args.level > currentLevel) {
      // upgrade â€” start the new level now, extend expiry by 30d (keep leftover if any)
      newLevel = args.level;
      newExpiry = Math.max(currentExpiry, now) + VIP_DAYS * DAY_MS;
    } else {
      // same or lower â€” keep level, extend expiry
      newLevel = currentLevel;
      newExpiry = currentExpiry + VIP_DAYS * DAY_MS;
    }

    // 1) Deduct coins
    await ctx.db.patch("users", me._id, {
      coins: balance - price,
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
      purchasePrice: price,
      source: "purchase",
    });

    // 3) Wallet transaction log
    await ctx.db.insert("walletTransactions", {
      userId: me._id,
      type: "spend",
      amount: -price,
      balanceAfter: balance - price,
      meta: `ط´ط±ط§ط، ${plan.name}`,
      createdAt: now,
    });

    return { ok: true, level: newLevel, expiresAt: newExpiry, subscriptionId: subId };
  },
});

// ============================================================
// Mutation: grantVip(userId, level, days) â€” ADMIN ONLY (or future gift)
// ============================================================
export const grantVip = mutation({
  args: {
    userId: v.id("users"),
    level: v.number(),
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx);
    if (!isFullAdmin(me)) throw new ConvexError({ code: "FORBIDDEN", message: "ط؛ظٹط± ظ…طµط±ط­" });
    const plan = VIP_LEVELS.find((p) => p.level === args.level);
    if (!plan) throw new ConvexError({ code: "BAD_REQUEST", message: "ظ…ط³طھظˆظ‰ VIP ط؛ظٹط± طµط§ظ„ط­" });
    const days = args.days ?? VIP_DAYS;

    const target = await ctx.db.get("users", args.userId);
    if (!target) throw new ConvexError({ code: "NOT_FOUND", message: "ط§ظ„ظ…ط³طھط®ط¯ظ… ط؛ظٹط± ظ…ظˆط¬ظˆط¯" });

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
// Mutation: checkAndExpire â€” lazy sweep (called from myVip / cron)
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
// Query: getPlans â€” public (for VipShopSheet)
// ============================================================
export const getPlans = query({
  args: {},
  handler: async () => VIP_LEVELS,
});

// ============================================================
// [ezo-vip] Benefits â€” per-level features (DB-driven)
// ============================================================
export const getBenefits = query({
  args: { level: v.number() },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("vipBenefits")
      .withIndex("by_level", (q) => q.eq("level", args.level))
      .collect();
    return rows.filter((r) => r.active).sort((a, b) => a.order - b.order);
  },
});

export const getAllBenefits = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("vipBenefits").collect();
    return rows.filter((r) => r.active).sort((a, b) =>
      a.level === b.level ? a.order - b.order : a.level - b.level
    );
  },
});

export const setVipBenefit = mutation({
  args: {
    id: v.optional(v.id("vipBenefits")),
    level: v.number(),
    order: v.number(),
    icon: v.string(),
    textAr: v.string(),
    textEn: v.optional(v.string()),
    tokenOverride: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    if (!isFullAdmin(me)) throw new ConvexError({ code: "FORBIDDEN", message: "ط؛ظٹط± ظ…طµط±ط­" });
    if (args.level < 1 || args.level > 7) throw new ConvexError({ code: "BAD_REQUEST", message: "ظ…ط³طھظˆظ‰ ط؛ظٹط± طµط§ظ„ط­" });
    const trimmed = args.textAr.trim();
    if (trimmed.length < 1) throw new ConvexError({ code: "BAD_REQUEST", message: "ظ†طµ ظپط§ط±ط؛" });

    if (args.id) {
      const existing = await ctx.db.get("vipBenefits", args.id);
      if (!existing) throw new ConvexError({ code: "NOT_FOUND", message: "ط§ظ„ظ…ظٹط²ط© ط؛ظٹط± ظ…ظˆط¬ظˆط¯ط©" });
      await ctx.db.patch("vipBenefits", args.id, {
        level: args.level,
        order: args.order,
        icon: args.icon,
        textAr: trimmed,
        textEn: args.textEn,
      });
      return { ok: true, id: args.id };
    }
    const id = await ctx.db.insert("vipBenefits", {
      level: args.level,
      order: args.order,
      icon: args.icon,
      textAr: trimmed,
      textEn: args.textEn,
      active: true,
    });
    return { ok: true, id };
  },
});

export const removeVipBenefit = mutation({
  args: { id: v.id("vipBenefits"), tokenOverride: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    if (!isFullAdmin(me)) throw new ConvexError({ code: "FORBIDDEN", message: "ط؛ظٹط± ظ…طµط±ط­" });
    await ctx.db.delete("vipBenefits", args.id);
    return { ok: true };
  },
});

// Seed once â€” populate default VIP benefits.
// Skips if any benefits already exist for that level.
export const seedBenefits = internalMutation({
  args: {},
  handler: async (ctx) => {
    // ط§ظ„ظ‚ط§ط¦ظ…ط© ط§ظ„ظ…ظˆط­ظ‘ط¯ط© (ط¨ط¯ظˆظ† level) â€” ظ†ظˆط²ظ‘ط¹ظ‡ط§ ط­ط³ط¨ ط§ظ„ظ…ط³طھظˆظ‰
    const BASE = [
      // â”€â”€â”€ Tier 1 (14 items â€” ظ„ظƒظ„ VIP) â”€â”€â”€
      { icon: "Gift",           textAr: "ظ‡ط¯ط§ظٹط§ VIP ط§ظ„ط­طµط±ظٹط©" },
      { icon: "Type",           textAr: "ط§ظ„ط§ط³ظ… ط°ظ‡ط¨ظٹ" },
      { icon: "Coins",          textAr: "ط¹ظ…ظ„ط§طھ ظٹظˆظ…ظٹط©" },
      { icon: "Eye",            textAr: "ط¹ط±ط¶ ط§ظ„ط²ظˆط§ط±" },
      { icon: "Heart",          textAr: "ظ…طھط§ط¨ط¹ط© ط؛ظٹط± ظ…ط­ط¯ظˆط¯ط©" },
      { icon: "Percent",        textAr: "ط®طµظ… ظ„ظ„طھط±ظ‚ظٹط© ط£ظˆ ط§ظ„طھط¬ط¯ظٹط¯" },
      { icon: "TrendingUp",     textAr: "ط§ظ„ط£ط¹ظ„ظ‰ ظپظٹ ط§ظ„ظ‚ط§ط¦ظ…ط©" },
      { icon: "MessageCircle",  textAr: "Private chat" },
      { icon: "Zap",            textAr: "طھظ‚ط¯ظ… ط£ط³ط±ط¹ ظپظٹ ط§ظ„ظ…ط³طھظˆظٹط§طھ" },
      { icon: "ShoppingBag",    textAr: "ط®طµظ… ط§ظ„ظ…طھط¬ط±" },
      { icon: "Wand2",          textAr: "طھطµظ…ظٹظ… طھط£ط«ظٹط± ط§ظ„ط¯ط®ظˆظ„" },
      { icon: "Award",          textAr: "ظ…ظ‚ط¹ط¯ ط§ظ„ط´ط±ظپ" },
      { icon: "Ban",            textAr: "ظٹط­ط¸ط± ط§ظ„ظ…طھط§ط¨ط¹ط©" },
      { icon: "Ghost",          textAr: "طھط®ظپظٹ" },

      // â”€â”€â”€ Tier 2 (2 more â€” VIP2+ = 16) â”€â”€â”€
      { icon: "IdCard",         textAr: "ط´ط±ط§ط، ط§ظٹط¯ظٹ ظ…ظ…ظٹط²" },
      { icon: "Share2",         textAr: "ط´ط§ط±ظƒ ط§ظ„ VIP ط§ظ„ط®ط§طµ ط¨ظƒ" },

      // â”€â”€â”€ Tier 3 (2 more â€” VIP3+ = 18) â”€â”€â”€
      { icon: "Megaphone",      textAr: "ط¥ط¹ظ„ط§ظ† ط§ظ„ظ…ظ†طµط©" },
      { icon: "ShieldOff",      textAr: "طھط¬ظ†ط¨ ط§ظ„ط·ط±ط¯" },

      // â”€â”€â”€ Tier 4 (4 more â€” VIP4+ = 22) â”€â”€â”€
      { icon: "BadgeCheck",     textAr: "ط´ط±ط§ط، ط§ظ…طھظٹط§ط²ط§طھ VIP" },
      { icon: "Users",          textAr: "ط§ظ„ط´ط®طµ ط§ظ„ط؛ط§ظ…ط¶" },
      { icon: "Mic",            textAr: "طھط؛ظٹظٹط± ط§ظ„طµظˆطھ ط§ظ„ط­طµط±ظٹ" },
      { icon: "UserCircle",     textAr: "ط¯ظٹظƒظˆط± ط§ظ„ط±ط¬ظ„ ط§ظ„ط؛ط§ظ…ط¶" },

      // â”€â”€â”€ Tier 5 (6 more â€” VIP5+ = 28) â”€â”€â”€
      { icon: "Car",            textAr: "ط§ظ„ظ…ط±ظƒط¨ط© ط§ظ„ط­طµط±ظٹط©" },
      { icon: "Home",           textAr: "Home Decorate Ar" },
      { icon: "AudioLines",     textAr: "طھط£ط«ظٹط± طھظپط¹ظٹظ„ ط§ظ„ظ…ظٹظƒط±ظˆظپظˆظ†" },
      { icon: "MicVocal",       textAr: "Mic Ar" },
      { icon: "Bell",           textAr: "ط¥ط´ط¹ط§ط± ظ„ظƒظ„ ط§ظ„ط³ظٹط³طھظ…" },
      { icon: "Music",          textAr: "ط§ط³طھط®ط¯ط§ظ… ط§ظ„ظ…ظٹظƒط±ظˆظپظˆظ† ظ…ط¬ط§ظ†ط§ظ‹" },

      // â”€â”€â”€ Tier 6 (3 more â€” VIP6+ = 31) â”€â”€â”€
      { icon: "Gift",           textAr: "ط´ط±ظٹط· ظ‡ط¯ط§ظٹط§ ط­طµط±ظٹ" },
      { icon: "Palette",        textAr: "App Skin Ar" },
      { icon: "LayoutGrid",     textAr: "طھط®ط·ظٹط· ط§ظ„ط؛ط±ظپط©" },

      // â”€â”€â”€ Tier 7 (9 more â€” VIP7 = 40) â”€â”€â”€
      { icon: "ScrollText",     textAr: "ط§ظ„ط´ظ‡ط§ط¯ط©" },
      { icon: "Crown",          textAr: "ط§ظ„ظ…ظ„ظƒظٹط© ط§ظ„ظƒط§ظ…ظ„ط© ظ„ظ„ط؛ط±ظپط©" },
      { icon: "Sparkles",       textAr: "طھط£ط«ظٹط±ط§طھ ط¯ط®ظˆظ„ ط­طµط±ظٹط©" },
      { icon: "Shield",         textAr: "ط­ظ…ط§ظٹط© ظ…ظ† ط§ظ„ط·ط±ط¯ ط§ظ„طھظ„ظ‚ط§ط¦ظٹ" },
      { icon: "Trophy",         textAr: "طھط§ط¬ ط§ظ„ظ…ظ„ظٹظˆظ†ظٹط±" },
      { icon: "Star",           textAr: "ظ†ط¬ظ…ط© ط¹ظ„ظ‰ ط§ظ„ط¨ط±ظˆظپط§ظٹظ„" },
      { icon: "Zap",            textAr: "ط·ط§ظ‚ط© ظ…ط¶ط§ط¹ظپط©" },
      { icon: "Eye",            textAr: "ط²ظٹط§ط¯ط© ط§ظ„ط²ظˆط§ط± 3x" },
      { icon: "Gem",            textAr: "ط§ظ„ط£ظ„ظ…ط§ط³ط© ط§ظ„ط­ظ…ط±ط§ط،" },
    ];

    // [ezo-vip] ط¹ط¯ط¯ ط§ظ„ظ…ط²ط§ظٹط§ ظ„ظƒظ„ ظ…ط³طھظˆظ‰ (Ezo-style)
    const COUNTS: Record<number, number> = {
      1: 14, 2: 16, 3: 18, 4: 22, 5: 28, 6: 31, 7: 40,
    };

    let created = 0;
    let skipped = 0;

    for (const level of [1, 2, 3, 4, 5, 6, 7]) {
      const existing = await ctx.db
        .query("vipBenefits")
        .withIndex("by_level", (q) => q.eq("level", level))
        .first();
      if (existing) { skipped += 1; continue; }

      const count = COUNTS[level];
      for (let i = 0; i < count; i++) {
        if (i >= BASE.length) break; // [ezo-vip-fix] ظ„ط§ طھظƒط±ط§ط±
        const base = BASE[i];
        await ctx.db.insert("vipBenefits", {
          level,
          order: i,
          icon: base.icon,
          textAr: base.textAr,
          active: true,
        });
        created += 1;
      }
    }

    return { ok: true, created, skipped };
  },
});





/**
 * ط¹ظ…ظ„ظٹط© ط´ط­ظ† ط±طµظٹط¯ ط§ظ„ظ…ط³طھط®ط¯ظ… ظˆطھط­ط¯ظٹط« ظ…ط³طھظˆظ‰ ط§ظ„ظ€ VIP طھظ„ظ‚ط§ط¦ظٹط§ظ‹ (ط·ط±ظٹظ‚ط© Ezo)
 */
export const rechargeAndUpgradeUser = internalMutation({
  args: {
    userId: v.id("users"),
    addedCoins: v.number(),
    usdAmount: v.optional(v.number()), // ط§ظ„ظ‚ظٹظ…ط© ط¨ط§ظ„ط¯ظˆظ„ط§ط± ط¥ظ† ظˆط¬ط¯طھ
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("ط§ظ„ظ…ط³طھط®ط¯ظ… ط؛ظٹط± ظ…ظˆط¬ظˆط¯");

    const currentRecharged = user.totalRecharged || 0;
    const newTotalRecharged = currentRecharged + args.addedCoins;
    
    const currentCoins = user.coins || 0;
    const newCoins = currentCoins + args.addedCoins;

    const currentPurchased = user.totalPurchased || 0;
    const addedCents = args.usdAmount ? Math.round(args.usdAmount * 100) : Math.round((args.addedCoins / 700) * 100);
    const newTotalPurchased = currentPurchased + addedCents;

    // ط­ط³ط§ط¨ ظ…ط³طھظˆظ‰ ط§ظ„ظ€ VIP ط§ظ„ط¬ط¯ظٹط¯ ط¨ظ†ط§ط،ظ‹ ط¹ظ„ظ‰ ط§ظ„ط¹طھط¨ط§طھ ط§ظ„طھط±ط§ظƒظ…ظٹط©
    const newVipLevel = calculateEzoVipLevel(newTotalRecharged);

    // طھط­ط¯ظٹط« ط¨ظٹط§ظ†ط§طھ ط§ظ„ظ…ط³طھط®ط¯ظ… ظپظٹ ظ‚ط§ط¹ط¯ط© ط§ظ„ط¨ظٹط§ظ†ط§طھ
    await ctx.db.patch(args.userId, {
      coins: newCoins,
      totalRecharged: newTotalRecharged,
      totalPurchased: newTotalPurchased,
      vipLevel: newVipLevel,
    });

    return {
      success: true,
      previousLevel: user.vipLevel || 0,
      newVipLevel,
      newTotalRecharged,
      newCoins,
    };
  },
});



/**
 * ط§ظ„طھط­ظ‚ظ‚ ظ…ظ…ط§ ط¥ط°ط§ ظƒط§ظ† ط§ظ„ظ…ط³طھط®ط¯ظ… ظٹظ…طھظ„ظƒ ط­طµط§ظ†ط© ط¶ط¯ ط§ظ„ط·ط±ط¯ (VIP 5 ظپظ…ط§ ظپظˆظ‚ ط¹ظ„ظ‰ ط·ط±ظٹظ‚ط© Ezo)
 */
export function hasAntiKickImmunity(vipLevel: number = 0): boolean {
  return vipLevel >= 5;
}

/**
 * ط§ظ„طھط­ظ‚ظ‚ ظ…ظ…ط§ ط¥ط°ط§ ظƒط§ظ† ط§ظ„ظ…ط³طھط®ط¯ظ… ظٹظ…طھظ„ظƒ ظ…ظٹط²ط© ط§ظ„طھط®ظپظٹ (VIP 6 ظپظ…ط§ ظپظˆظ‚)
 */
export function hasInvisibleEntry(vipLevel: number = 0): boolean {
  return vipLevel >= 6;
}

