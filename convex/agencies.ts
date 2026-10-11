// [moorawi-agency] Agency system — creation, joining, earnings, salary
import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { requireUser, isFullAdmin, isAssetManager } from "./lib/auth";
import { activeVipLevel } from "./lib/vip";

// ============================================================
// LEVEL TABLE — 15 مستويات نظام المضيف في Ezo
// ============================================================
const HOST_LEVELS = [
  { level: 1,  days: 15, hours: 20, target: 20_000,      half: 6_000,      base: 7,     dia: 6,     total: 13,      agency: 4,     vip: 0,  vipCount: 0, frame: 0,  entry: 0  },
  { level: 2,  days: 15, hours: 20, target: 40_000,      half: 12_000,     base: 19,    dia: 10,    total: 29,      agency: 8,     vip: 0,  vipCount: 0, frame: 0,  entry: 0  },
  { level: 3,  days: 15, hours: 20, target: 80_000,      half: 24_000,     base: 37,    dia: 20,    total: 57,      agency: 18,    vip: 0,  vipCount: 0, frame: 0,  entry: 0  },
  { level: 4,  days: 15, hours: 20, target: 126_000,     half: 37_800,     base: 60,    dia: 32,    total: 92,      agency: 29,    vip: 7,  vipCount: 1, frame: 0,  entry: 0  },
  { level: 5,  days: 15, hours: 20, target: 220_000,     half: 66_000,     base: 85,    dia: 65,    total: 150,     agency: 40,    vip: 7,  vipCount: 1, frame: 7,  entry: 7  },
  { level: 6,  days: 10, hours: 15, target: 320_000,     half: 96_000,     base: 130,   dia: 86,    total: 216,     agency: 56,    vip: 7,  vipCount: 1, frame: 7,  entry: 7  },
  { level: 7,  days: 10, hours: 15, target: 460_000,     half: 138_000,    base: 175,   dia: 115,   total: 290,     agency: 74,    vip: 10, vipCount: 2, frame: 10, entry: 10 },
  { level: 8,  days: 10, hours: 15, target: 580_000,     half: 174_000,    base: 210,   dia: 150,   total: 360,     agency: 92,    vip: 10, vipCount: 2, frame: 10, entry: 10 },
  { level: 9,  days: 8,  hours: 12, target: 850_000,     half: 225_000,    base: 310,   dia: 230,   total: 540,     agency: 125,   vip: 10, vipCount: 2, frame: 10, entry: 10 },
  { level: 10, days: 8,  hours: 12, target: 1_250_000,   half: 375_000,    base: 420,   dia: 348,   total: 768,     agency: 180,   vip: 15, vipCount: 2, frame: 15, entry: 15 },
  { level: 11, days: 8,  hours: 12, target: 1_850_000,   half: 555_000,    base: 560,   dia: 560,   total: 1_120,   agency: 260,   vip: 15, vipCount: 2, frame: 15, entry: 15 },
  { level: 12, days: 0,  hours: 0,  target: 3_500_000,   half: 1_050_000,  base: 850,   dia: 1_300, total: 2_150,   agency: 450,   vip: 15, vipCount: 3, frame: 15, entry: 15 },
  { level: 13, days: 0,  hours: 0,  target: 5_250_000,   half: 1_575_000,  base: 1_450, dia: 1_650, total: 3_100,   agency: 700,   vip: 30, vipCount: 3, frame: 30, entry: 30 },
  { level: 14, days: 0,  hours: 0,  target: 7_000_000,   half: 2_100_000,  base: 1_600, dia: 2_500, total: 4_100,   agency: 900,   vip: 30, vipCount: 3, frame: 30, entry: 30 },
  { level: 15, days: 0,  hours: 0,  target: 10_500_000,  half: 3_150_000,  base: 2_500, dia: 3_600, total: 6_100,   agency: 1_400, vip: 30, vipCount: 3, frame: 30, entry: 30 },
];

// Agency tier thresholds (30d)
function agencyLevelFromPoints(points: number): "D" | "C" | "B" | "A" | "S" {
  if (points >= 150_000_000) return "S";
  if (points >= 50_000_000) return "A";
  if (points >= 10_000_000) return "B";
  if (points >= 2_000_000) return "C";
  return "D";
}

// Find the highest level whose target <= achieved
function levelFromAchieved(achieved: number): number {
  let lvl = 0;
  for (const L of HOST_LEVELS) {
    if (achieved >= L.target) lvl = L.level;
    else break;
  }
  return lvl;
}



// ============================================================
// [moorawi-agency] توليد رقم وكالة فريد (3 أرقام ثم 4 ثم 5...)
// ============================================================
async function getNextAgencyNumber(ctx: any): Promise<number> {
  const counter = await ctx.db
    .query("counters")
    .withIndex("by_name", (q: any) => q.eq("name", "agencyNumber"))
    .unique();

  if (!counter) {
    // البداية من 100 (3 أرقام)
    await ctx.db.insert("counters", { name: "agencyNumber", value: 101 });
    return 100;
  }

  const current = counter.value;
  await ctx.db.patch("counters", counter._id, { value: current + 1 });
  return current;
}

// ============================================================
// SEED LEVELS (internal — run once)
// ============================================================
export const seedLevels = internalMutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("hostLevels").collect();
    if (existing.length > 0) return { ok: true, skipped: true };

    for (const L of HOST_LEVELS) {
      await ctx.db.insert("hostLevels", {
        level: L.level,
        daysRequired: L.days,
        hoursPerDay: L.hours,
        targetCoins: L.target,
        halfSeasonCoins: L.half,
        baseSalary: L.base,
        diamondSalary: L.dia,
        totalSalary: L.total,
        agencySalary: L.agency,
        vipRewardDays: L.vip > 0 ? L.vip : undefined,
        vipRewardCount: L.vipCount > 0 ? L.vipCount : undefined,
        frameRewardLevel: L.frame > 0 ? L.frame : undefined,
        entryRewardLevel: L.entry > 0 ? L.entry : undefined,
      });
    }
    return { ok: true, inserted: HOST_LEVELS.length };
  },
});

// ============================================================
// QUERIES
// ============================================================
export const getLevels = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("hostLevels").collect();
  },
});

export const getAgency = query({
  args: { agencyId: v.id("agencies") },
  handler: async (ctx, args) => {
    const a = await ctx.db.get("agencies", args.agencyId);
    if (!a) return null;
    const owner = await ctx.db.get("users", a.ownerId);
    const hosts = await ctx.db
      .query("agencyHosts")
      .withIndex("by_agency", (q) => q.eq("agencyId", args.agencyId).eq("status", "active"))
      .collect();
    return {
      ...a,
      ownerName: owner?.name ?? "—",
      ownerAvatar: owner?.avatarUrl ?? null,
      activeHostCount: hosts.length,
    };
  },
});

export const myAgency = query({
  args: { tokenOverride: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    if (!me.agencyId) return null;
    return await ctx.db.get("agencies", me.agencyId);
  },
});

export const myStatus = query({
  args: { tokenOverride: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    const agency = me.agencyId ? await ctx.db.get("agencies", me.agencyId) : null;

    // دخل الشهر الحالي
    const month = new Date().toISOString().slice(0, 7); // "2026-10"
    const earnings = await ctx.db
      .query("hostMonthlyEarnings")
      .withIndex("by_host_month", (q) => q.eq("hostId", me._id).eq("month", month))
      .first();

    const income = me.hostIncomeMonth ?? 0;
    const hours = me.hostHoursMonth ?? 0;
    const days = me.hostDaysMonth ?? 0;
    const myLevel = levelFromAchieved(income);
    const levelData = HOST_LEVELS.find((L) => L.level === myLevel);

    return {
      isHost: me.isHost ?? false,
      agencyId: me.agencyId ?? null,
      agencyName: agency?.name ?? null,
      hostLevel: myLevel,
      incomeThisMonth: income,
      hoursThisMonth: hours,
      daysThisMonth: days,
      diamondsHeld: me.diamonds ?? 0,
      currentEarnings: earnings ?? null,
      targetCoins: levelData?.target ?? 0,
      nextLevelTarget: HOST_LEVELS.find((L) => L.level === myLevel + 1)?.target ?? 0,
      halfSeasonTarget: levelData?.half ?? 0,
      baseSalary: levelData?.base ?? 0,
      diamondSalary: levelData?.dia ?? 0,
      totalSalary: levelData?.total ?? 0,
    };
  },
});

export const listAgencies = query({
  args: { search: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const all = await ctx.db.query("agencies").collect();
    const q = (args.search ?? "").trim().toLowerCase();
    const filtered = q.length === 0
      ? all
      : all.filter((a) => a.name.toLowerCase().includes(q));

    const enriched = await Promise.all(
      filtered.slice(0, 50).map(async (a) => {
        const owner = await ctx.db.get("users", a.ownerId);
        const hosts = await ctx.db
          .query("agencyHosts")
          .withIndex("by_agency", (q2) => q2.eq("agencyId", a._id).eq("status", "active"))
          .collect();
        return {
          _id: a._id,
          name: a.name,
          level: a.level,
          logoUrl: a.logoUrl ?? null,
          description: a.description ?? null,
          ownerName: owner?.name ?? "—",
          activeHostCount: hosts.length,
        };
      })
    );
    return enriched;
  },
});

export const myRequests = query({
  args: { tokenOverride: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    const reqs = await ctx.db
      .query("agencyRequests")
      .withIndex("by_user", (q) => q.eq("userId", me._id).eq("status", "pending"))
      .collect();
    const enriched = await Promise.all(
      reqs.map(async (r) => {
        const agency = await ctx.db.get("agencies", r.agencyId);
        return { ...r, agencyName: agency?.name ?? "—" };
      })
    );
    return enriched;
  },
});

export const agencyHosts = query({
  args: { agencyId: v.id("agencies") },
  handler: async (ctx, args) => {
    const hosts = await ctx.db
      .query("agencyHosts")
      .withIndex("by_agency", (q) => q.eq("agencyId", args.agencyId).eq("status", "active"))
      .collect();
    const enriched = await Promise.all(
      hosts.map(async (h) => {
        const u = await ctx.db.get("users", h.userId);
        const income = u?.hostIncomeMonth ?? 0;
        return {
          _id: h._id,
          userId: h.userId,
          name: u?.name ?? "—",
          userNumber: u?.userNumber ?? null,
          avatarUrl: u?.avatarUrl ?? (u?.avatarId ? await ctx.storage.getUrl(u.avatarId) : null),
          vip: activeVipLevel(u),
          hostLevel: u?.hostLevel ?? 0,
          incomeThisMonth: income,
          diamondsHeld: u?.diamonds ?? 0,
          joinedAt: h.joinedAt,
        };
      })
    );
    return enriched;
  },
});

export const agencyRequests = query({
  args: { agencyId: v.id("agencies") },
  handler: async (ctx, args) => {
    const reqs = await ctx.db
      .query("agencyRequests")
      .withIndex("by_agency", (q) => q.eq("agencyId", args.agencyId).eq("status", "pending"))
      .collect();
    const enriched = await Promise.all(
      reqs.map(async (r) => {
        const u = await ctx.db.get("users", r.userId);
        return {
          _id: r._id,
          userId: r.userId,
          name: u?.name ?? "—",
          userNumber: u?.userNumber ?? null,
          avatarUrl: u?.avatarUrl ?? (u?.avatarId ? await ctx.storage.getUrl(u.avatarId) : null),
          createdAt: r.createdAt,
        };
      })
    );
    return enriched;
  },
});

// ============================================================
// MUTATIONS
// ============================================================
export const createAgency = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
    tokenOverride: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    const name = args.name.trim();
    if (name.length < 2) throw new Error("الاسم قصير جداً");

    // تأكد أنه لا يملك وكالة
    const existing = await ctx.db
      .query("agencies")
      .withIndex("by_owner", (q) => q.eq("ownerId", me._id))
      .first();
    if (existing) throw new Error("لديك وكالة بالفعل");

    const agencyNumber = await getNextAgencyNumber(ctx);
    const id = await ctx.db.insert("agencies", {
      name,
      agencyNumber,
      ownerId: me._id,
      level: "D",
      totalPoints30d: 0,
      hostCount: 0,
      totalEarned: 0,
      description: args.description,
      logoUrl: args.logoUrl,
      createdAt: Date.now(),
    });
    return { ok: true, agencyId: id };
  },
});

export const requestJoin = mutation({
  args: {
    agencyId: v.id("agencies"),
    tokenOverride: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    if (me.agencyId) throw new Error("أنت في وكالة بالفعل");

    const agency = await ctx.db.get("agencies", args.agencyId);
    if (!agency) throw new Error("الوكالة غير موجودة");

    // فحص طلب مسبق
    const existing = await ctx.db
      .query("agencyRequests")
      .withIndex("by_user", (q) => q.eq("userId", me._id).eq("status", "pending"))
      .first();
    if (existing) throw new Error("لديك طلب قيد المراجعة");

    await ctx.db.insert("agencyRequests", {
      agencyId: args.agencyId,
      userId: me._id,
      status: "pending",
      createdAt: Date.now(),
    });
    return { ok: true };
  },
});

export const reviewRequest = mutation({
  args: {
    requestId: v.id("agencyRequests"),
    approve: v.boolean(),
    tokenOverride: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    const req = await ctx.db.get("agencyRequests", args.requestId);
    if (!req) throw new Error("الطلب غير موجود");

    const agency = await ctx.db.get("agencies", req.agencyId);
    if (!agency) throw new Error("الوكالة غير موجودة");
    if (agency.ownerId !== me._id && !isFullAdmin(me)) throw new Error("غير مصرح");

    if (args.approve) {
      // تأكد من عدم وجوده في وكالة
      const target = await ctx.db.get("users", req.userId);
      if (target?.agencyId) throw new Error("العضو في وكالة أخرى");

      await ctx.db.patch("users", req.userId, {
        agencyId: req.agencyId,
        isHost: true,
        hostLevel: 0,
        hostIncomeMonth: 0,
        hostHoursMonth: 0,
        hostDaysMonth: 0,
      });
      await ctx.db.insert("agencyHosts", {
        agencyId: req.agencyId,
        userId: req.userId,
        status: "active",
        joinedAt: Date.now(),
      });
      await ctx.db.patch("agencies", req.agencyId, {
        hostCount: (agency.hostCount ?? 0) + 1,
      });
      await ctx.db.patch("agencyRequests", args.requestId, {
        status: "approved",
        reviewedAt: Date.now(),
      });
      return { ok: true, approved: true };
    } else {
      await ctx.db.patch("agencyRequests", args.requestId, {
        status: "rejected",
        reviewedAt: Date.now(),
      });
      return { ok: true, approved: false };
    }
  },
});

export const leaveAgency = mutation({
  args: { tokenOverride: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    if (!me.agencyId) throw new Error("لست في وكالة");

    const rel = await ctx.db
      .query("agencyHosts")
      .withIndex("by_user_status", (q) => q.eq("userId", me._id).eq("status", "active"))
      .first();
    if (rel) {
      await ctx.db.patch("agencyHosts", rel._id, {
        status: "left",
        leftAt: Date.now(),
      });
    }

    const agency = await ctx.db.get("agencies", me.agencyId);
    if (agency && agency.hostCount > 0) {
      await ctx.db.patch("agencies", me.agencyId, {
        hostCount: agency.hostCount - 1,
      });
    }

    await ctx.db.patch("users", me._id, {
      agencyId: undefined,
      isHost: false,
    });
    return { ok: true };
  },
});

export const kickHost = mutation({
  args: {
    hostUserId: v.id("users"),
    tokenOverride: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    const target = await ctx.db.get("users", args.hostUserId);
    if (!target?.agencyId) throw new Error("العضو ليس في وكالة");

    const agency = await ctx.db.get("agencies", target.agencyId);
    if (!agency) throw new Error("الوكالة غير موجودة");
    if (agency.ownerId !== me._id && !isFullAdmin(me)) throw new Error("غير مصرح");

    const rel = await ctx.db
      .query("agencyHosts")
      .withIndex("by_user_status", (q) => q.eq("userId", args.hostUserId).eq("status", "active"))
      .first();
    if (rel) {
      await ctx.db.patch("agencyHosts", rel._id, {
        status: "kicked",
        leftAt: Date.now(),
      });
    }

    await ctx.db.patch("users", args.hostUserId, {
      agencyId: undefined,
      isHost: false,
    });

    if (agency.hostCount > 0) {
      await ctx.db.patch("agencies", agency._id, {
        hostCount: agency.hostCount - 1,
      });
    }
    return { ok: true };
  },
});

// ============================================================
// UPDATE host stats (يُستدعى من gifts.ts عند كل هدية)
// ============================================================
export const updateHostStats = mutation({
  args: {
    hostId: v.id("users"),
    coinsValue: v.number(),
    tokenOverride: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    if (!isFullAdmin(me)) throw new Error("internal only");

    const host = await ctx.db.get("users", args.hostId);
    if (!host || !host.agencyId) return { ok: true, skipped: true };

    const currentIncome = host.hostIncomeMonth ?? 0;
    const newIncome = currentIncome + args.coinsValue;
    const newLevel = levelFromAchieved(newIncome);

    // الماس المُنزَّل: 30% من قيمة الهدية
    const diamondShare = Math.floor(args.coinsValue * 0.3);
    const newDiamonds = (host.diamonds ?? 0) + diamondShare;

    await ctx.db.patch("users", args.hostId, {
      hostIncomeMonth: newIncome,
      hostLevel: newLevel,
      diamonds: newDiamonds,
    });

    return { ok: true, newIncome, newLevel };
  },
});

// ============================================================
// [moorawi-agency] طلبات إنشاء وكالة
// ============================================================
export const submitCreateRequest = mutation({
  args: {
    agencyName: v.string(),
    description: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
    tokenOverride: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    if (me.agencyId) throw new Error("أنت في وكالة بالفعل");

    const name = args.agencyName.trim();
    if (name.length < 2) throw new Error("اسم الوكالة قصير جداً");

    // فحص طلب معلق
    const pending = await ctx.db
      .query("agencyCreateRequests")
      .withIndex("by_user", (q) => q.eq("userId", me._id).eq("status", "pending"))
      .first();
    if (pending) throw new Error("لديك طلب قيد المراجعة");

    // فحص أن الاسم غير محجوز
    const existing = await ctx.db
      .query("agencies")
      .filter((q) => q.eq(q.field("name"), name))
      .first();
    if (existing) throw new Error("اسم الوكالة محجوز");

    const id = await ctx.db.insert("agencyCreateRequests", {
      userId: me._id,
      agencyName: name,
      description: args.description,
      logoUrl: args.logoUrl,
      status: "pending",
      createdAt: Date.now(),
    });
    return { ok: true, requestId: id };
  },
});

export const myCreateRequests = query({
  args: { tokenOverride: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    const reqs = await ctx.db
      .query("agencyCreateRequests")
      .withIndex("by_user", (q) => q.eq("userId", me._id))
      .collect();
    return reqs.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const listCreateRequests = query({
  args: { tokenOverride: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    if (!isFullAdmin(me)) throw new Error("غير مصرح");
    const reqs = await ctx.db
      .query("agencyCreateRequests")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();
    const enriched = await Promise.all(
      reqs.map(async (r) => {
        const u = await ctx.db.get("users", r.userId);
        return {
          ...r,
          userName: u?.name ?? "—",
          userNumber: u?.userNumber ?? null,
          userAvatar: u?.avatarUrl ?? (u?.avatarId ? await ctx.storage.getUrl(u.avatarId) : null),
        };
      })
    );
    return enriched;
  },
});

export const reviewCreateRequest = mutation({
  args: {
    requestId: v.id("agencyCreateRequests"),
    approve: v.boolean(),
    note: v.optional(v.string()),
    tokenOverride: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    if (!isFullAdmin(me)) throw new Error("غير مصرح");

    const req = await ctx.db.get("agencyCreateRequests", args.requestId);
    if (!req) throw new Error("الطلب غير موجود");
    if (req.status !== "pending") throw new Error("تمت مراجعة الطلب مسبقاً");

    if (args.approve) {
      // فحص أن المستخدم ليس في وكالة
      const user = await ctx.db.get("users", req.userId);
      if (user?.agencyId) throw new Error("المستخدم في وكالة بالفعل");

      const agencyNumber = await getNextAgencyNumber(ctx);
      const agencyId = await ctx.db.insert("agencies", {
        name: req.agencyName,
        agencyNumber,
        ownerId: req.userId,
        level: "D",
        totalPoints30d: 0,
        hostCount: 0,
        totalEarned: 0,
        description: req.description,
        logoUrl: req.logoUrl,
        createdAt: Date.now(),
      });

      // ربط المالك كـ owner
      await ctx.db.patch("users", req.userId, {
        agencyId,
        agencyNumber,
        isHost: true,
      });

      await ctx.db.patch("agencyCreateRequests", args.requestId, {
        status: "approved",
        reviewedAt: Date.now(),
        reviewedBy: me._id,
        note: args.note,
      });

      return { ok: true, approved: true, agencyId, agencyNumber };
    } else {
      await ctx.db.patch("agencyCreateRequests", args.requestId, {
        status: "rejected",
        reviewedAt: Date.now(),
        reviewedBy: me._id,
        note: args.note,
      });
      return { ok: true, approved: false };
    }
  },
});

// ============================================================
// [moorawi-agency] البحث بالرقم
// ============================================================
export const findByNumber = query({
  args: { number: v.number() },
  handler: async (ctx, args) => {
    const agency = await ctx.db
      .query("agencies")
      .filter((q) => q.eq(q.field("agencyNumber"), args.number))
      .first();
    if (!agency) return null;
    const owner = await ctx.db.get("users", agency.ownerId);
    const hosts = await ctx.db
      .query("agencyHosts")
      .withIndex("by_agency", (q) => q.eq("agencyId", agency._id).eq("status", "active"))
      .collect();
    return {
      ...agency,
      ownerName: owner?.name ?? "—",
      ownerAvatar: owner?.avatarUrl ?? (owner?.avatarId ? await ctx.storage.getUrl(owner.avatarId) : null),
      activeHostCount: hosts.length,
    };
  },
});

// ============================================================
// [moorawi-agency] حذف وكالة (استخدام داخلي/تنظيف)
// ============================================================
export const deleteAgency = internalMutation({
  args: { agencyId: v.id("agencies") },
  handler: async (ctx, args) => {
    await ctx.db.delete("agencies", args.agencyId);
    return { ok: true };
  },
});
