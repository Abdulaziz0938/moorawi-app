// [ezo-missions] المهام اليومية + الأسبوعية + مكافأة الدخول اليومي
import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { requireUser } from "./lib/auth";

// ============================================================
// مكافآت الدخول اليومي (7 أيام)
// ============================================================
const DAILY_LOGIN_REWARDS = [50, 75, 100, 150, 200, 300, 1000];

// ============================================================
// المهام الافتراضية
// ============================================================
const DEFAULT_MISSIONS = [
  // ===== يومية =====
  { key: "daily_login",       title: "تسجيل الدخول",             description: "سجّل دخولك اليومي",         type: "daily",   target: 1,    reward: 50,    sortOrder: 1 },
  { key: "daily_send_gift",   title: "أرسل هدية",                 description: "أرسل هدية واحدة على الأقل", type: "daily",   target: 1,    reward: 30,    sortOrder: 2 },
  { key: "daily_5_gifts",     title: "أرسل 5 هدايا",             description: "أرسل 5 هدايا",              type: "daily",   target: 5,    reward: 100,   sortOrder: 3 },
  { key: "daily_10_messages", title: "أرسل 10 رسائل",            description: "10 رسائل في الشات",         type: "daily",   target: 10,   reward: 50,    sortOrder: 4 },
  { key: "daily_30min",       title: "30 دقيقة نشاط",            description: "اقضِ 30 دقيقة في التطبيق",   type: "daily",   target: 30,   reward: 75,    sortOrder: 5 },
  { key: "daily_visit_3_rooms",title: "زيارة 3 غرف",             description: "زُر 3 غرف مختلفة",          type: "daily",   target: 3,    reward: 80,    sortOrder: 6 },
  { key: "daily_1_new_follow",title: "تابع مستخدماً جديداً",     description: "تابع مستخدماً لم تتابعه",   type: "daily",   target: 1,    reward: 40,    sortOrder: 7 },

  // ===== أسبوعية =====
  { key: "weekly_50_gifts",   title: "50 هدية أسبوعياً",          description: "أرسل 50 هدية هذا الأسبوع",  type: "weekly",  target: 50,   reward: 800,   sortOrder: 10 },
  { key: "weekly_500_messages",title: "500 رسالة",                description: "500 رسالة هذا الأسبوع",     type: "weekly",  target: 500,  reward: 600,   sortOrder: 11 },
  { key: "weekly_5_new_follows",title: "5 متابعات جديدة",         description: "تابع 5 مستخدمين جدد",       type: "weekly",  target: 5,    reward: 400,   sortOrder: 12 },
  { key: "weekly_10_rooms",   title: "10 غرف مختلفة",             description: "زُر 10 غرف هذا الأسبوع",     type: "weekly",  target: 10,   reward: 500,   sortOrder: 13 },
] as const;

// ============================================================
// SEED
// ============================================================
export const seed = internalMutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("missions").collect();
    if (existing.length > 0) return { ok: true, skipped: true };

    let created = 0;
    for (const m of DEFAULT_MISSIONS) {
      await ctx.db.insert("missions", {
        key: m.key,
        title: m.title,
        description: m.description,
        reward: m.reward,
        rewardType: "coins",
        type: m.type,
        target: m.target,
        sortOrder: m.sortOrder,
        active: true,
      });
      created++;
    }
    return { ok: true, created };
  },
});

// ============================================================
// QUERIES
// ============================================================
export const listActive = query({
  args: { type: v.optional(v.union(v.literal("daily"), v.literal("weekly"), v.literal("achievement"))) },
  handler: async (ctx, args) => {
    const all = await ctx.db.query("missions").collect();
    const active = all.filter((m) => m.active);
    if (args.type) return active.filter((m) => m.type === args.type).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    return active;
  },
});

// دورة يومية = YYYY-MM-DD
function dayKey(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}
// دورة أسبوعية = YYYY-Wxx
function weekKey(d: Date = new Date()): string {
  const onejan = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - onejan.getTime()) / 86400000 + onejan.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${week}`;
}

export const myProgress = query({
  args: { tokenOverride: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    if (!me) return { daily: [], weekly: [], streak: 0, canClaimDaily: false, nextReward: 0 };

    const dailyCycle = dayKey();
    const weeklyCycle = weekKey();

    // كل المهام النشطة
    const missions = (await ctx.db.query("missions").collect()).filter((m) => m.active);

    // تقدم المستخدم في الدورة الحالية
    const myDailies = await ctx.db
      .query("userMissions")
      .withIndex("by_user_and_cycle", (q) => q.eq("userId", me._id).eq("cycleKey", dailyCycle))
      .collect();

    const myWeeklies = await ctx.db
      .query("userMissions")
      .withIndex("by_user_and_cycle", (q) => q.eq("userId", me._id).eq("cycleKey", weeklyCycle))
      .collect();

    const mapProgress = (arr: any[]) => {
      const map = new Map<string, any>();
      for (const um of arr) map.set(um.missionId as string, um);
      return map;
    };

    const dm = mapProgress(myDailies);
    const wm = mapProgress(myWeeklies);

    const build = (m: any, progressMap: Map<string, any>) => {
      const p = progressMap.get(m._id as string);
      const progress = Math.min(p?.progress ?? 0, m.target);
      const completed = progress >= m.target;
      const claimed = !!p?.claimedAt;
      return {
        _id: m._id,
        key: m.key,
        title: m.title,
        description: m.description,
        reward: m.reward,
        target: m.target,
        progress,
        completed,
        claimed,
      };
    };

    const daily = missions.filter((m) => m.type === "daily").map((m) => build(m, dm));
    const weekly = missions.filter((m) => m.type === "weekly").map((m) => build(m, wm));

    // حالة الدخول اليومي
    const today = new Date();
    const lastLoginClaim = me.lastLoginRewardAt ?? 0;
    const streak = me.loginStreak ?? 0;
    const lastClaimDay = lastLoginClaim ? new Date(lastLoginClaim).toISOString().slice(0, 10) : null;
    const canClaimDaily = lastClaimDay !== dayKey(today);

    // المكافأة القادمة
    const nextStreak = canClaimDaily ? (streak % 7) : streak % 7;
    const nextReward = DAILY_LOGIN_REWARDS[nextStreak] ?? DAILY_LOGIN_REWARDS[0];

    return { daily, weekly, streak, canClaimDaily, nextReward };
  },
});

// ============================================================
// MUTATIONS
// ============================================================

// تسجيل التقدم (يُستدعى من gifts, messages, follows, ...)
export const recordProgress = mutation({
  args: {
    missionKeys: v.array(v.string()),
    amount: v.optional(v.number()),
    tokenOverride: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    if (!me) return { ok: false };

    const amount = args.amount ?? 1;
    const dailyCycle = dayKey();
    const weeklyCycle = weekKey();

    const missions = await ctx.db.query("missions").collect();

    for (const key of args.missionKeys) {
      const m = missions.find((x) => x.key === key);
      if (!m) continue;
      const cycle = m.type === "weekly" ? weeklyCycle : dailyCycle;

      const existing = await ctx.db
        .query("userMissions")
        .withIndex("by_user_and_mission", (q) => q.eq("userId", me._id).eq("missionId", m._id))
        .filter((q) => q.eq(q.field("cycleKey"), cycle))
        .first();

      if (existing) {
        if (existing.claimedAt) continue;
        await ctx.db.patch("userMissions", existing._id, {
          progress: Math.min((existing.progress ?? 0) + amount, m.target),
        });
      } else {
        await ctx.db.insert("userMissions", {
          userId: me._id,
          missionId: m._id,
          progress: Math.min(amount, m.target),
          cycleKey: cycle,
        });
      }
    }
    return { ok: true };
  },
});

// استلام المكافأة
export const claim = mutation({
  args: {
    missionId: v.id("missions"),
    tokenOverride: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    if (!me) throw new Error("غير مصرح");

    const m = await ctx.db.get("missions", args.missionId);
    if (!m) throw new Error("المهمة غير موجودة");

    const dailyCycle = dayKey();
    const weeklyCycle = weekKey();
    const cycle = m.type === "weekly" ? weeklyCycle : dailyCycle;

    const existing = await ctx.db
      .query("userMissions")
      .withIndex("by_user_and_mission", (q) => q.eq("userId", me._id).eq("missionId", args.missionId))
      .filter((q) => q.eq(q.field("cycleKey"), cycle))
      .first();

    if (!existing) throw new Error("لم تبدأ المهمة");
    if (existing.progress < m.target) throw new Error("لم تُكمل المهمة");
    if (existing.claimedAt) throw new Error("تم الاستلام");

    await ctx.db.patch("userMissions", existing._id, { claimedAt: Date.now() });

    // إضافة الكوينز
    await ctx.db.patch("users", me._id, {
      coins: (me.coins ?? 0) + m.reward,
    });

    return { ok: true, reward: m.reward };
  },
});

// ============================================================
// الدخول اليومي
// ============================================================
export const claimDailyLogin = mutation({
  args: { tokenOverride: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    if (!me) throw new Error("غير مصرح");

    const now = Date.now();
    const today = dayKey(new Date(now));
    const lastClaim = me.lastLoginRewardAt ?? 0;
    const lastDay = lastClaim ? new Date(lastClaim).toISOString().slice(0, 10) : null;
    if (lastDay === today) throw new Error("تم الاستلام اليوم");

    // فحص إذا فات أكثر من يوم (نُصفّر السلسلة)
    const oneDayMs = 24 * 60 * 60 * 1000;
    let streak = me.loginStreak ?? 0;
    if (lastClaim && now - lastClaim > 2 * oneDayMs) streak = 0;

    const dayIndex = streak % 7;
    const reward = DAILY_LOGIN_REWARDS[dayIndex] ?? 50;

    await ctx.db.patch("users", me._id, {
      coins: (me.coins ?? 0) + reward,
      loginStreak: streak + 1,
      lastLoginRewardAt: now,
    } as any);

    // [ezo-missions] سجّل تقدم مهمة daily_login
    const dailyCycle = dayKey(new Date(now));
    const loginMission = await ctx.db
      .query("missions")
      .filter((q) => q.eq(q.field("key"), "daily_login"))
      .first();
    if (loginMission) {
      const existing = await ctx.db
        .query("userMissions")
        .withIndex("by_user_and_mission", (q) => q.eq("userId", me._id).eq("missionId", loginMission._id))
        .filter((q) => q.eq(q.field("cycleKey"), dailyCycle))
        .first();
      if (existing) {
        await ctx.db.patch("userMissions", existing._id, {
          progress: loginMission.target,
        });
      } else {
        await ctx.db.insert("userMissions", {
          userId: me._id,
          missionId: loginMission._id,
          progress: loginMission.target,
          cycleKey: dailyCycle,
        });
      }
    }

    return { ok: true, reward, streak: streak + 1, dayIndex: dayIndex + 1 };
  },
});
