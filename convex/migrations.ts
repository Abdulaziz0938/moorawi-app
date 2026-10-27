// [ezo-migration] عمليات تهيئة تُشغَّل من CLI فقط (internalMutation)
import { internalMutation } from "./_generated/server";
import { ConvexError, v } from "convex/values";

// ─── تعيين uid مخصص لمستخدم حسب userNumber (للإدارة فقط) ───
export const setCustomUid = internalMutation({
  args: {
    userNumber: v.number(),
    uid: v.string(),
  },
  handler: async (ctx, args) => {
    const trimmed = args.uid.trim();
    if (trimmed.length < 1 || trimmed.length > 20) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "UID يجب أن يكون 1-20 حرف" });
    }
    if (!/^[A-Za-z0-9_]+$/.test(trimmed)) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "UID يحتوي حروف/أرقام/underscore فقط" });
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_userNumber", (q) => q.eq("userNumber", args.userNumber))
      .unique();
    if (!user) {
      throw new ConvexError({ code: "NOT_FOUND", message: `userNumber=${args.userNumber} غير موجود` });
    }

    const existing = await ctx.db
      .query("users")
      .withIndex("by_uid", (q) => q.eq("uid", trimmed))
      .unique();
    if (existing && existing._id !== user._id) {
      throw new ConvexError({ code: "CONFLICT", message: `UID "${trimmed}" محجوز لحساب آخر` });
    }

    await ctx.db.patch("users", user._id, { uid: trimmed });
    return { ok: true, userId: user._id, userNumber: args.userNumber, uid: trimmed };
  },
});

// ─── تصفير كل الأرصدة (لمرحلة التجريب) ───
export const resetAllBalances = internalMutation({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    let usersUpdated = 0;
    for (const u of users) {
      await ctx.db.patch("users", u._id, {
        coins: 0,
        diamonds: 0,
        totalPurchased: 0,
        totalRecharged: 0,
        charms: 0,
        totalSent: 0,
        totalReceived: 0,
      });
      usersUpdated++;
    }

    const txs = await ctx.db.query("walletTransactions").collect();
    for (const t of txs) {
      await ctx.db.delete("walletTransactions", t._id);
    }

    const reqs = await ctx.db.query("rechargeRequests").collect();
    for (const r of reqs) {
      await ctx.db.delete("rechargeRequests", r._id);
    }

    return {
      ok: true,
      usersUpdated,
      txsDeleted: txs.length,
      requestsDeleted: reqs.length,
    };
  },
});

// ─── جرد سريع: يعرض المستخدمين و uids (بدون secrets) ───
export const listUsersBrief = internalMutation({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    return users.map((u) => ({
      userId: u._id,
      userNumber: u.userNumber,
      uid: u.uid ?? null,
      username: u.username ?? null,
      name: u.name ?? null,
      isAdmin: u.isAdmin ?? false,
      adminRole: u.adminRole ?? null,
      coins: u.coins ?? 0,
      diamonds: u.diamonds ?? 0,
    }));
  },
});

// ─── تعبئة uid للمستخدمين القدامى (backfill) ───
export const backfillUids = internalMutation({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    const missing = users.filter((u) => !u.uid);
    const counter = await ctx.db
      .query("counters")
      .withIndex("by_name", (q) => q.eq("name", "uid"))
      .unique();

    let next = counter ? counter.value : 100000;
    let updated = 0;
    for (const u of missing) {
      // تحقق من عدم التكرار
      let candidate = String(next);
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const existing = await ctx.db
          .query("users")
          .withIndex("by_uid", (q) => q.eq("uid", candidate))
          .unique();
        if (!existing) break;
        next++;
        candidate = String(next);
      }
      await ctx.db.patch("users", u._id, { uid: candidate });
      next++;
      updated++;
    }

    // خزّن العداد الجديد
    if (counter) {
      await ctx.db.patch("counters", counter._id, { value: next });
    } else {
      await ctx.db.insert("counters", { name: "uid", value: next });
    }

    return { ok: true, backfilled: updated, nextUid: next };
  },
});


// ═══════════════════════════════════════════════════════════
// [ezo-recharge] بذر الباقات الرسمية — سعر البيع: 700 كوينز = 1$
// ═══════════════════════════════════════════════════════════
export const seedPackagesInternal = internalMutation({
  args: {},
  handler: async (ctx) => {
    // احذف كل الباقات القديمة أولاً (لتجنب ازدواج)
    const old = await ctx.db.query("rechargePackages").collect();
    for (const o of old) await ctx.db.delete("rechargePackages", o._id);

    // السعر الرسمي: 700 كوينز = 1 USD
    const defaults = [
      { code: "p_700",    coins: 700,    bonus: 0,    priceUSD: 100,   label: "$1",   sortOrder: 1 },
      { code: "p_1400",   coins: 1400,   bonus: 0,    priceUSD: 200,   label: "$2",   sortOrder: 2 },
      { code: "p_3500",   coins: 3500,   bonus: 0,    priceUSD: 500,   label: "$5",   highlight: true, tag: "الأكثر مبيعاً", sortOrder: 3 },
      { code: "p_7000",   coins: 7000,   bonus: 0,    priceUSD: 1000,  label: "$10",  sortOrder: 4 },
      { code: "p_17500",  coins: 17500,  bonus: 0,    priceUSD: 2500,  label: "$25",  sortOrder: 5 },
      { code: "p_35000",  coins: 35000,  bonus: 0,    priceUSD: 5000,  label: "$50",  sortOrder: 6 },
      { code: "p_70000",  coins: 70000,  bonus: 0,    priceUSD: 10000, label: "$100", sortOrder: 7 },
      { code: "p_140000", coins: 140000, bonus: 0,    priceUSD: 20000, label: "$200", sortOrder: 8 },
    ];

    let created = 0;
    for (const d of defaults) {
      await ctx.db.insert("rechargePackages", {
        code: d.code,
        coins: d.coins,
        bonus: d.bonus,
        totalCoins: d.coins + d.bonus,
        priceSYP: 0,  // يُحدَّد لاحقاً عند اختيار شام كاش
        priceUSD: d.priceUSD,
        label: d.label,
        highlight: d.highlight,
        tag: d.tag,
        active: true,
        sortOrder: d.sortOrder,
        createdAt: Date.now(),
      });
      created++;
    }
    return { ok: true, created, note: "أسعار البيع: 700 كوينز = 1 USD" };
  },
});


// ═══════════════════════════════════════════════════════════
// [ezo-migration] تحديث عداد الـ userNumber إلى 6 خانات
// ═══════════════════════════════════════════════════════════

export const fixUserNumberCounter = internalMutation({
  args: {},
  handler: async (ctx) => {
    const counter = await ctx.db
      .query("counters")
      .withIndex("by_name", (q) => q.eq("name", "userNumber"))
      .first();

    if (counter) {
      await ctx.db.patch(counter._id, { value: 100000 });
      return { ok: true, action: "updated_to_100000", oldValue: counter.value };
    } else {
      await ctx.db.insert("counters", { name: "userNumber", value: 100000 });
      return { ok: true, action: "created_at_100000" };
    }
  },
});
