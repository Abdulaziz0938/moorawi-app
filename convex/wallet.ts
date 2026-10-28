import { mutation, query } from "./_generated/server";
import { calculateEzoVipLevel } from "./vip";
import { ConvexError, v } from "convex/values";
import { requireUser } from "./lib/auth";

// ============================================================
// [ezo-economy] Wallet helpers
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
    const MAX_RECHARGE = 1_000_000;
    if (args.amount > MAX_RECHARGE) {
      throw new ConvexError({ code: "BAD_REQUEST", message: `الحد الأقصى ${MAX_RECHARGE.toLocaleString()} عملة لكل عملية` });
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
    userId: v.optional(v.id("users")),
    tokenOverride: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.amount <= 0) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "المبلغ يجب أن يكون أكبر من صفر" });
    }
    const me = await requireUser(ctx, args.tokenOverride);
    if (!me.isAdmin && me.adminRole !== "super") {
      throw new ConvexError({ code: "FORBIDDEN", message: "صلاحيات الأدمن مطلوبة" });
    }
    const user = args.userId ? await ctx.db.get("users", args.userId) : me;
    if (!user) throw new ConvexError({ code: "NOT_FOUND", message: "المستخدم غير موجود" });
    const currentBalance = user.coins ?? 0;
    const newBalance = currentBalance + args.amount;
    const patch: any = { coins: newBalance };
    if (args.usdCents) {
      patch.totalPurchased = (user.totalPurchased ?? 0) + args.usdCents;
    }
    patch.totalRecharged = (user.totalRecharged ?? 0) + args.amount;
    patch.vipLevel = calculateEzoVipLevel(patch.totalRecharged);
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

// Exchange diamonds → coins (1 diamond = 1 coin)
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
      `تبديل ${args.diamonds} ماس → ${args.diamonds} عملة`,
    );
    return { ok: true, newCoins, newDiamonds };
  },
});

// ═══════════════════════════════════════════════════════════
// [ezo-recharge] طلب شحن — مستخدم عادي (pending)
// ═══════════════════════════════════════════════════════════
export const requestRecharge = mutation({
  args: {
    packageCode: v.optional(v.string()),
    coins: v.optional(v.number()),
    bonus: v.optional(v.number()),
    priceSYP: v.optional(v.number()),
    priceUSD: v.optional(v.number()),
    method: v.optional(v.string()),
    txnRef: v.optional(v.string()),
    receiptUrl: v.optional(v.string()),
    note: v.optional(v.string()),
    tokenOverride: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    if (!me.uid) throw new ConvexError({ code: "BAD_REQUEST", message: "UID غير موجود" });

    let coins = args.coins ?? 0;
    let bonus = args.bonus ?? 0;
    let priceSYP = args.priceSYP ?? 0;
    let priceUSD = args.priceUSD;

    if (args.packageCode) {
      const pkg = await ctx.db
        .query("rechargePackages")
        .withIndex("by_code", (q) => q.eq("code", args.packageCode!))
        .unique();
      if (!pkg || !pkg.active) {
        throw new ConvexError({ code: "NOT_FOUND", message: "الباقة غير متوفرة" });
      }
      coins = pkg.coins;
      bonus = pkg.bonus;
      priceSYP = pkg.priceSYP;
      priceUSD = pkg.priceUSD;
    }

    if (coins <= 0) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "حدد باقة أو قيمة" });
    }

    const method = args.method ?? "sham_cash";
    if (method === "sham_cash") {
      const ref = (args.txnRef ?? "").trim();
      if (ref.length < 4) {
        throw new ConvexError({
          code: "BAD_REQUEST",
          message: "أدخل رقم عملية التحويل (4 أحرف على الأقل)",
        });
      }
    }

    const now = Date.now();
    const id = await ctx.db.insert("rechargeRequests", {
      userId: me._id,
      uid: me.uid,
      userName: me.name,
      packageCode: args.packageCode,
      coins,
      bonus,
      totalCoins: coins + bonus,
      priceSYP,
      priceUSD,
      method,
      txnRef: args.txnRef?.trim() || undefined,
      receiptUrl: args.receiptUrl,
      note: args.note,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });
    return { ok: true, requestId: id, status: "pending" };
  },
});

// طلباتي
export const myRechargeRequests = query({
  args: { tokenOverride: v.optional(v.string()), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    const limit = Math.min(args.limit ?? 50, 100);
    return await ctx.db
      .query("rechargeRequests")
      .withIndex("by_user_and_createdAt", (q) => q.eq("userId", me._id))
      .order("desc")
      .take(limit);
  },
});

// كل الطلبات — أدمن
export const listRechargeRequests = query({
  args: {
    status: v.optional(v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected"))),
    tokenOverride: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    if (!me.isAdmin && me.adminRole !== "super") return [];
    const limit = Math.min(args.limit ?? 50, 200);
    const status = args.status ?? "pending";
    return await ctx.db
      .query("rechargeRequests")
      .withIndex("by_status_and_createdAt", (q) => q.eq("status", status))
      .order("desc")
      .take(limit);
  },
});

// موافقة — أدمن
export const approveRecharge = mutation({
  args: { requestId: v.id("rechargeRequests"), adminNote: v.optional(v.string()), tokenOverride: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    if (!me.isAdmin && me.adminRole !== "super") {
      throw new ConvexError({ code: "FORBIDDEN", message: "صلاحيات الأدمن مطلوبة" });
    }
    const req = await ctx.db.get("rechargeRequests", args.requestId);
    if (!req) throw new ConvexError({ code: "NOT_FOUND" });
    if (req.status !== "pending") throw new ConvexError({ code: "CONFLICT", message: "تمت معالجة الطلب" });

    const target = await ctx.db.get("users", req.userId);
    if (!target) throw new ConvexError({ code: "NOT_FOUND" });
    const newBalance = (target.coins ?? 0) + req.totalCoins;
    const patch: any = { coins: newBalance };
    if (req.priceUSD) patch.totalPurchased = (target.totalPurchased ?? 0) + req.priceUSD;
    patch.totalRecharged = (target.totalRecharged ?? 0) + req.totalCoins;
    patch.vipLevel = calculateEzoVipLevel(patch.totalRecharged);
    await ctx.db.patch("users", target._id, patch);
    await recordTx(ctx, target._id, "recharge", req.totalCoins, newBalance, `شحن موافق عليه (${req.uid})`);

    await ctx.db.patch("rechargeRequests", req._id, {
      status: "approved",
      adminId: me._id,
      adminNote: args.adminNote,
      updatedAt: Date.now(),
    });
    return { ok: true, newBalance };
  },
});

// رفض — أدمن
export const rejectRecharge = mutation({
  args: { requestId: v.id("rechargeRequests"), adminNote: v.optional(v.string()), tokenOverride: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    if (!me.isAdmin && me.adminRole !== "super") {
      throw new ConvexError({ code: "FORBIDDEN", message: "صلاحيات الأدمن مطلوبة" });
    }
    const req = await ctx.db.get("rechargeRequests", args.requestId);
    if (!req) throw new ConvexError({ code: "NOT_FOUND" });
    if (req.status !== "pending") throw new ConvexError({ code: "CONFLICT", message: "تمت معالجة الطلب" });
    await ctx.db.patch("rechargeRequests", req._id, {
      status: "rejected",
      adminId: me._id,
      adminNote: args.adminNote,
      updatedAt: Date.now(),
    });
    return { ok: true };
  },
});

// عرض الباقات (عام)
export const listPackages = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("rechargePackages")
      .withIndex("by_active_sort", (q) => q.eq("active", true))
      .take(50);
  },
});

// إدارة الباقات — أدمن
export const upsertPackage = mutation({
  args: {
    code: v.string(),
    coins: v.number(),
    bonus: v.number(),
    priceSYP: v.number(),
    priceUSD: v.optional(v.number()),
    label: v.string(),
    highlight: v.optional(v.boolean()),
    tag: v.optional(v.string()),
    active: v.boolean(),
    sortOrder: v.number(),
    tokenOverride: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    if (!me.isAdmin && me.adminRole !== "super") {
      throw new ConvexError({ code: "FORBIDDEN", message: "صلاحيات الأدمن مطلوبة" });
    }
    const existing = await ctx.db
      .query("rechargePackages")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .unique();
    const data = {
      code: args.code,
      coins: args.coins,
      bonus: args.bonus,
      totalCoins: args.coins + args.bonus,
      priceSYP: args.priceSYP,
      priceUSD: args.priceUSD,
      label: args.label,
      highlight: args.highlight,
      tag: args.tag,
      active: args.active,
      sortOrder: args.sortOrder,
    };
    if (existing) {
      await ctx.db.patch("rechargePackages", existing._id, data);
      return { ok: true, id: existing._id };
    }
    const id = await ctx.db.insert("rechargePackages", { ...data, createdAt: Date.now() });
    return { ok: true, id };
  },
});

// بذر الباقات الافتراضية — أدمن
// ✅ تم تعديل جميع الأسعار لتكون 1 دولار = 1000 عملة (السعر بالسنوات)
export const seedDefaultPackages = mutation({
  args: { tokenOverride: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    if (!me.isAdmin && me.adminRole !== "super") {
      throw new ConvexError({ code: "FORBIDDEN", message: "صلاحيات الأدمن مطلوبة" });
    }
    const defaults = [
      { code: "p_1000",   coins: 1000,   bonus: 0,     priceSYP: 2500,    priceUSD: 100,   label: "1,000 عملة ($1)",   sortOrder: 1 },
      { code: "p_5000",   coins: 5000,   bonus: 0,     priceSYP: 12500,   priceUSD: 500,   label: "5,000 عملة ($5)",   highlight: true, tag: "شائع", sortOrder: 2 },
      { code: "p_10000",  coins: 10000,  bonus: 500,   priceSYP: 25000,   priceUSD: 1000,  label: "10,000 عملة ($10)",  sortOrder: 3 },
      { code: "p_20000",  coins: 20000,  bonus: 1500,  priceSYP: 50000,   priceUSD: 2000,  label: "20,000 عملة ($20)",  sortOrder: 4 },
      { code: "p_50000",  coins: 50000,  bonus: 5000,  priceSYP: 125000,  priceUSD: 5000,  label: "50,000 عملة ($50)",  sortOrder: 5 },
      { code: "p_100000", coins: 100000, bonus: 15000, priceSYP: 250000,  priceUSD: 10000, label: "100,000 عملة ($100)", sortOrder: 6 },
    ];
    let created = 0;
    let updated = 0;
    
    for (const d of defaults) {
      const existing = await ctx.db
        .query("rechargePackages")
        .withIndex("by_code", (q) => q.eq("code", d.code))
        .unique();
      if (existing) {
        // تحديث الباقات القديمة لتتوافق مع السعر الجديد
        await ctx.db.patch("rechargePackages", existing._id, {
          ...d,
          totalCoins: d.coins + d.bonus,
          active: true,
        });
        updated++;
        continue;
      }
      await ctx.db.insert("rechargePackages", {
        ...d,
        totalCoins: d.coins + d.bonus,
        active: true,
        createdAt: Date.now(),
      });
      created++;
    }
    return { ok: true, created, updated };
  },
});
