
// [custom-vip-tiers] عتبات مستويات الـ VIP متوافقة مع سعر الصرف (700 coins = $1)
export const BINMO_VIP_LEVELS = [
  { level: 0, minCoins: 0, usd: 0, name: "عادي" },
  { level: 1, minCoins: 7000, usd: 10, name: "فارس" },       // 7K Coins (~$10)
  { level: 2, minCoins: 35000, usd: 50, name: "نبيل" },      // 35K Coins (~$50)
  { level: 3, minCoins: 105000, usd: 150, name: "فيكونت" },  // 105K Coins (~$150)
  { level: 4, minCoins: 350000, usd: 500, name: "دوق" },     // 350K Coins (~$500)
  { level: 5, minCoins: 1050000, usd: 1500, name: "الملك" },  // 1.05M Coins (~$1,500) - King
  { level: 6, minCoins: 3500000, usd: 5000, name: "الإمبراطور" }, // 3.5M Coins (~$5,000) - Emperor
  { level: 7, minCoins: 10500000, usd: 15000, name: "الأسطورة" }, // 10.5M Coins (~$15,000) - SVIP Legend
];

/**
 * حساب مستوى الـ VIP التلقائي بناءً على إجمالي العملات المشحونة بسعر صرفك
 */
export function calculateBinmoVipLevel(totalRechargedCoins: number = 0): number {
  let currentLevel = 0;
  for (const tier of BINMO_VIP_LEVELS) {
    if (totalRechargedCoins >= tier.minCoins) {
      currentLevel = tier.level;
    } else {
      break;
    }
  }
  return currentLevel;
}


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

import { v } from "convex/values"
import { ConvexError } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { requireUser, isFullAdmin } from "./lib/auth";
import { activeVipLevel } from "./lib/vip";

// ============================================================
// Config — 7 VIP levels. Price in Coins (1 Coin = 1 Diamond).
// All visuals (color, icon name, imageUrl) are DATA, not hardcoded in UI.
// Admin can later upload real images via adminPanel and update imageUrl.
// ============================================================
export const VIP_LEVELS = [
  { level: 1, name: "VIP 1",  priceCoins: 24_000,    color: "#10b981", accent: "#34d399", exclusive: false, exclusiveReason: null },
  { level: 2, name: "VIP 2",  priceCoins: 60_000,    color: "#3b82f6", accent: "#60a5fa", exclusive: false, exclusiveReason: null },
  { level: 3, name: "VIP 3",  priceCoins: 240_000,   color: "#a855f7", accent: "#c084fc", exclusive: false, exclusiveReason: null },
  { level: 4, name: "VIP 4",  priceCoins: 599_998,   color: "#dc2626", accent: "#f87171", exclusive: false, exclusiveReason: null },
  { level: 5, name: "VIP 5",  priceCoins: null,      color: "#eab308", accent: "#facc15", exclusive: true,  exclusiveReason: "حصري — يُحصل عليه عبر الشحن التركي" },
  { level: 6, name: "VIP 6",  priceCoins: null,      color: "#f97316", accent: "#fb923c", exclusive: true,  exclusiveReason: "حصري — يُحصل عليه عبر الشحن التركي" },
  { level: 7, name: "VIP 7",  priceCoins: null,      color: "#fbbf24", accent: "#fde047", exclusive: true,  exclusiveReason: "حصري — يُحصل عليه عبر الشحن التركي" },
] as const;

const VIP_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

// ============================================================
// Query: myVip — current user's VIP state (lazy expiring first)
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
  args: { level: v.number(), tokenOverride: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    const plan = VIP_LEVELS.find((p) => p.level === args.level);
    if (!plan) throw new ConvexError({ code: "BAD_REQUEST", message: "مستوى VIP غير صالح" });
    if (plan.exclusive || plan.priceCoins === null) {
      throw new ConvexError({ code: "FORBIDDEN", message: "هذا المستوى حصري — يُحصل عليه عبر الشحن التركي" });
    }
    const price = plan.priceCoins; // narrowed to number

    const balance = me.coins ?? 0;
    if (balance < price) {
      throw new ConvexError({ code: "INSUFFICIENT_BALANCE", message: `تحتاج ${price.toLocaleString()} عملة — رصيدك ${balance.toLocaleString()}` });
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
    if (!isFullAdmin(me)) throw new ConvexError({ code: "FORBIDDEN", message: "غير مصرح" });
    const plan = VIP_LEVELS.find((p) => p.level === args.level);
    if (!plan) throw new ConvexError({ code: "BAD_REQUEST", message: "مستوى VIP غير صالح" });
    const days = args.days ?? VIP_DAYS;

    const target = await ctx.db.get("users", args.userId);
    if (!target) throw new ConvexError({ code: "NOT_FOUND", message: "المستخدم غير موجود" });

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

// ============================================================
// [moorawi-vip] Benefits — per-level features (DB-driven)
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
    if (!isFullAdmin(me)) throw new ConvexError({ code: "FORBIDDEN", message: "غير مصرح" });
    if (args.level < 1 || args.level > 7) throw new ConvexError({ code: "BAD_REQUEST", message: "مستوى غير صالح" });
    const trimmed = args.textAr.trim();
    if (trimmed.length < 1) throw new ConvexError({ code: "BAD_REQUEST", message: "نص فارغ" });

    if (args.id) {
      const existing = await ctx.db.get("vipBenefits", args.id);
      if (!existing) throw new ConvexError({ code: "NOT_FOUND", message: "الميزة غير موجودة" });
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
    if (!isFullAdmin(me)) throw new ConvexError({ code: "FORBIDDEN", message: "غير مصرح" });
    await ctx.db.delete("vipBenefits", args.id);
    return { ok: true };
  },
});

// Seed once — populate default VIP benefits.
// Skips if any benefits already exist for that level.
export const seedBenefits = internalMutation({
  args: {},
  handler: async (ctx) => {
    // القائمة الموحّدة (بدون level) — نوزّعها حسب المستوى
    const BASE = [
      // ─── Tier 1 (14 items — لكل VIP) ───
      { icon: "Gift",           textAr: "هدايا VIP الحصرية" },
      { icon: "Type",           textAr: "الاسم ذهبي" },
      { icon: "Coins",          textAr: "عملات يومية" },
      { icon: "Eye",            textAr: "عرض الزوار" },
      { icon: "Heart",          textAr: "متابعة غير محدودة" },
      { icon: "Percent",        textAr: "خصم للترقية أو التجديد" },
      { icon: "TrendingUp",     textAr: "الأعلى في القائمة" },
      { icon: "MessageCircle",  textAr: "Private chat" },
      { icon: "Zap",            textAr: "تقدم أسرع في المستويات" },
      { icon: "ShoppingBag",    textAr: "خصم المتجر" },
      { icon: "Wand2",          textAr: "تصميم تأثير الدخول" },
      { icon: "Award",          textAr: "مقعد الشرف" },
      { icon: "Ban",            textAr: "يحظر المتابعة" },
      { icon: "Ghost",          textAr: "تخفي" },

      // ─── Tier 2 (2 more — VIP2+ = 16) ───
      { icon: "IdCard",         textAr: "شراء ايدي مميز" },
      { icon: "Share2",         textAr: "شارك ال VIP الخاص بك" },

      // ─── Tier 3 (2 more — VIP3+ = 18) ───
      { icon: "Megaphone",      textAr: "إعلان المنصة" },
      { icon: "ShieldOff",      textAr: "تجنب الطرد" },

      // ─── Tier 4 (4 more — VIP4+ = 22) ───
      { icon: "BadgeCheck",     textAr: "شراء امتيازات VIP" },
      { icon: "Users",          textAr: "الشخص الغامض" },
      { icon: "Mic",            textAr: "تغيير الصوت الحصري" },
      { icon: "UserCircle",     textAr: "ديكور الرجل الغامض" },

      // ─── Tier 5 (6 more — VIP5+ = 28) ───
      { icon: "Car",            textAr: "المركبة الحصرية" },
      { icon: "Home",           textAr: "Home Decorate Ar" },
      { icon: "AudioLines",     textAr: "تأثير تفعيل الميكروفون" },
      { icon: "MicVocal",       textAr: "Mic Ar" },
      { icon: "Bell",           textAr: "إشعار لكل السيستم" },
      { icon: "Music",          textAr: "استخدام الميكروفون مجاناً" },

      // ─── Tier 6 (3 more — VIP6+ = 31) ───
      { icon: "Gift",           textAr: "شريط هدايا حصري" },
      { icon: "Palette",        textAr: "App Skin Ar" },
      { icon: "LayoutGrid",     textAr: "تخطيط الغرفة" },

      // ─── Tier 7 (9 more — VIP7 = 40) ───
      { icon: "ScrollText",     textAr: "الشهادة" },
      { icon: "Crown",          textAr: "الملكية الكاملة للغرفة" },
      { icon: "Sparkles",       textAr: "تأثيرات دخول حصرية" },
      { icon: "Shield",         textAr: "حماية من الطرد التلقائي" },
      { icon: "Trophy",         textAr: "تاج المليونير" },
      { icon: "Star",           textAr: "نجمة على البروفايل" },
      { icon: "Zap",            textAr: "طاقة مضاعفة" },
      { icon: "Eye",            textAr: "زيادة الزوار 3x" },
      { icon: "Gem",            textAr: "الألماسة الحمراء" },
    ];

    // [ezo-vip] عدد المزايا لكل مستوى (Binmo-style)
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
        if (i >= BASE.length) break; // [ezo-vip-fix] لا تكرار
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



import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * عملية شحن رصيد المستخدم وتحديث مستوى الـ VIP تلقائياً (طريقة Binmo)
 */
export const rechargeAndUpgradeUser = mutation({
  args: {
    userId: v.id("users"),
    addedCoins: v.number(),
    usdAmount: v.optional(v.number()), // القيمة بالدولار إن وجدت
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("المستخدم غير موجود");

    const currentRecharged = user.totalRecharged || 0;
    const newTotalRecharged = currentRecharged + args.addedCoins;
    
    const currentCoins = user.coins || 0;
    const newCoins = currentCoins + args.addedCoins;

    const currentPurchased = user.totalPurchased || 0;
    const addedCents = args.usdAmount ? Math.round(args.usdAmount * 100) : Math.round((args.addedCoins / 700) * 100);
    const newTotalPurchased = currentPurchased + addedCents;

    // حساب مستوى الـ VIP الجديد بناءً على العتبات التراكمية
    const newVipLevel = calculateBinmoVipLevel(newTotalRecharged);

    // تحديث بيانات المستخدم في قاعدة البيانات
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
 * التحقق مما إذا كان المستخدم يمتلك حصانة ضد الطرد (VIP 5 فما فوق على طريقة Binmo)
 */
export function hasAntiKickImmunity(vipLevel: number = 0): boolean {
  return vipLevel >= 5;
}

/**
 * التحقق مما إذا كان المستخدم يمتلك ميزة التخفي (VIP 6 فما فوق)
 */
export function hasInvisibleEntry(vipLevel: number = 0): boolean {
  return vipLevel >= 6;
}
