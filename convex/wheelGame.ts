import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireUser } from "./lib/auth";

// ترتيب أقسام العجلة الـ 9 بالضبط: 77 ثم تفاح وبطيخ بالتناوب
export const SECTORS = [
  { index: 0, item: "77", mult: 8 },
  { index: 1, item: "apple", mult: 2 },
  { index: 2, item: "watermelon", mult: 2 },
  { index: 3, item: "apple", mult: 2 },
  { index: 4, item: "watermelon", mult: 2 },
  { index: 5, item: "apple", mult: 2 },
  { index: 6, item: "watermelon", mult: 2 },
  { index: 7, item: "apple", mult: 2 },
  { index: 8, item: "watermelon", mult: 2 },
] as const;

export const getState = query({
  args: { tokenOverride: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const state = await ctx.db
      .query("wheelState")
      .withIndex("by_key", (q) => q.eq("key", "global"))
      .first();

    let me = null;
    try {
      me = await requireUser(ctx, args.tokenOverride);
    } catch {
      me = null;
    }

    let myBets = { watermelon: 0, "77": 0, apple: 0 };
    let myTotalBet = 0;
    let myWin = 0;

    if (state && me) {
      const userBets = await ctx.db
        .query("wheelBets")
        .withIndex("by_round_and_user", (q) =>
          q.eq("roundNumber", state.roundNumber).eq("userId", me._id)
        )
        .collect();

      for (const b of userBets) {
        myBets[b.item] += b.amount;
        myTotalBet += b.amount;
      }

      if (state.status !== "BETTING" && state.winningItem) {
        const winItem = state.winningItem as "watermelon" | "77" | "apple";
        const mult = winItem === "77" ? 8 : 2;
        myWin = myBets[winItem] * mult;
      }
    }

    return {
      state,
      userCoins: me?.coins ?? 0,
      myBets,
      myTotalBet,
      myWin,
      serverTime: Date.now(),
    };
  },
});

export const getLeaderboard = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").take(50);
    return users
      .map((u) => ({
        _id: u._id,
        name: u.name ?? "مستخدم",
        avatarUrl: u.avatarUrl,
        points: (u.totalSent ?? 0) + (u.coins ?? 0),
        reward: Math.floor(((u.totalSent ?? 0) + (u.coins ?? 0)) * 0.14),
      }))
      .sort((a, b) => b.points - a.points)
      .slice(0, 10);
  },
});

// تشغيل المحرك التلقائي للعجلة إذا لم يكن شغالاً أو كان متوقفاً
export const ensureGameRunning = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db
      .query("wheelState")
      .withIndex("by_key", (q) => q.eq("key", "global"))
      .first();

    const now = Date.now();
    if (!existing) {
      await ctx.db.insert("wheelState", {
        key: "global",
        roundNumber: 2774,
        status: "BETTING",
        endTime: now + 15000,
        jackpot: 715848,
        history: ["apple", "watermelon", "apple", "77", "watermelon", "apple", "watermelon", "apple"],
        topWinners: [],
      });
      await ctx.scheduler.runAfter(15000, internal.wheelGame.spinWheel, { roundNumber: 2774 });
      return;
    }

    // إذا علقت الجولة لأكثر من 25 ثانية بسبب إعادة تشغيل السيرفر، نعيد تنشيطها تلقائياً
    if (now > existing.endTime + 12000) {
      const nextRound = existing.roundNumber + 1;
      await ctx.db.patch(existing._id, {
        roundNumber: nextRound,
        status: "BETTING",
        endTime: now + 15000,
        winningIndex: undefined,
        winningItem: undefined,
        topWinners: [],
      });
      await ctx.scheduler.runAfter(15000, internal.wheelGame.spinWheel, { roundNumber: nextRound });
    }
  },
});

export const placeBet = mutation({
  args: {
    item: v.union(v.literal("watermelon"), v.literal("77"), v.literal("apple")),
    amount: v.number(),
    tokenOverride: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.tokenOverride);
    if (args.amount <= 0) throw new Error("قيمة الرهان غير صالحة");

    const state = await ctx.db
      .query("wheelState")
      .withIndex("by_key", (q) => q.eq("key", "global"))
      .first();

    if (!state || state.status !== "BETTING" || Date.now() >= state.endTime) {
      throw new Error("انتهى وقت المراهنة لهذه الجولة!");
    }

    const currentCoins = user.coins ?? 0;
    if (currentCoins < args.amount) {
      throw new Error("LOW_BALANCE");
    }

    // خصم الرصيد من المستخدم وزيادة الجاكبوت
    await ctx.db.patch(user._id, {
      coins: currentCoins - args.amount,
      totalSent: (user.totalSent ?? 0) + args.amount,
    });

    await ctx.db.patch(state._id, {
      jackpot: state.jackpot + Math.floor(args.amount * 0.05),
    });

    // البحث عن رهان سابق لنفس العنصر في نفس الجولة لدمجه أو إنشاء سجل جديد
    const existingBet = await ctx.db
      .query("wheelBets")
      .withIndex("by_round_and_user", (q) =>
        q.eq("roundNumber", state.roundNumber).eq("userId", user._id)
      )
      .filter((q) => q.eq(q.field("item"), args.item))
      .first();

    if (existingBet) {
      await ctx.db.patch(existingBet._id, {
        amount: existingBet.amount + args.amount,
      });
    } else {
      await ctx.db.insert("wheelBets", {
        roundNumber: state.roundNumber,
        userId: user._id,
        userName: user.name ?? "مستخدم",
        userAvatar: user.avatarUrl,
        item: args.item,
        amount: args.amount,
      });
    }

    return { success: true };
  },
});

// المرحلة 1 بعد انتهاء الـ 15 ثانية: إيقاف المراهنات فوراً وبدء دوران العجلة (4.5 ثانية)
export const spinWheel = internalMutation({
  args: { roundNumber: v.number() },
  handler: async (ctx, args) => {
    const state = await ctx.db
      .query("wheelState")
      .withIndex("by_key", (q) => q.eq("key", "global"))
      .first();

    if (!state || state.roundNumber !== args.roundNumber) return;

    // اختيار القسم الفائز عشوائياً من الأقسام الـ 9
    const winningIndex = Math.floor(Math.random() * SECTORS.length);
    const winner = SECTORS[winningIndex];

    // توزيع الأرباح وحساب أعلى 3 فائزين
    const allRoundBets = await ctx.db
      .query("wheelBets")
      .withIndex("by_round", (q) => q.eq("roundNumber", state.roundNumber))
      .collect();

    const userStats = new Map<
      string,
      { userId: any; name: string; avatarUrl?: string; totalBet: number; totalWin: number }
    >();

    for (const b of allRoundBets) {
      const key = b.userId.toString();
      const prev = userStats.get(key) ?? {
        userId: b.userId,
        name: b.userName,
        avatarUrl: b.userAvatar,
        totalBet: 0,
        totalWin: 0,
      };
      prev.totalBet += b.amount;
      if (b.item === winner.item) {
        prev.totalWin += b.amount * winner.mult;
      }
      userStats.set(key, prev);
    }

    // إيداع الفوز في حسابات الفائزين
    for (const st of userStats.values()) {
      if (st.totalWin > 0) {
        const u: any = await ctx.db.get(st.userId);
        if (u) {
          await ctx.db.patch(u._id, {
            coins: (u.coins ?? 0) + st.totalWin,
          });
        }
      }
    }

    const topWinners = Array.from(userStats.values())
      .filter((w) => w.totalWin > 0)
      .sort((a, b) => b.totalWin - a.totalWin)
      .slice(0, 3)
      .map((w) => ({
        userId: w.userId,
        name: w.name,
        avatarUrl: w.avatarUrl,
        bet: w.totalBet,
        win: w.totalWin,
      }));

    const newHistory = [winner.item, ...state.history].slice(0, 10);

    await ctx.db.patch(state._id, {
      status: "SPINNING",
      winningIndex,
      winningItem: winner.item,
      history: newHistory,
      topWinners,
      endTime: Date.now() + 4500,
    });

    // بعد 4.5 ثانية (انتهاء دوران العجلة) ننتقل لإظهار نافذة الفائزين
    await ctx.scheduler.runAfter(4500, internal.wheelGame.showResultModal, {
      roundNumber: state.roundNumber,
    });
  },
});

// المرحلة 2: إظهار نافذة التهنئة لمدة 4 ثوانٍ
export const showResultModal = internalMutation({
  args: { roundNumber: v.number() },
  handler: async (ctx, args) => {
    const state = await ctx.db
      .query("wheelState")
      .withIndex("by_key", (q) => q.eq("key", "global"))
      .first();

    if (!state || state.roundNumber !== args.roundNumber) return;

    await ctx.db.patch(state._id, {
      status: "RESULT",
      endTime: Date.now() + 4000,
    });

    await ctx.scheduler.runAfter(4000, internal.wheelGame.startNextRound, {
      roundNumber: state.roundNumber + 1,
    });
  },
});

// المرحلة 3: بدء جولة جديدة لمدة 15 ثانية تلقائياً
export const startNextRound = internalMutation({
  args: { roundNumber: v.number() },
  handler: async (ctx, args) => {
    const state = await ctx.db
      .query("wheelState")
      .withIndex("by_key", (q) => q.eq("key", "global"))
      .first();

    if (!state) return;

    await ctx.db.patch(state._id, {
      roundNumber: args.roundNumber,
      status: "BETTING",
      endTime: Date.now() + 15000,
      winningIndex: undefined,
      winningItem: undefined,
      topWinners: [],
    });

    await ctx.scheduler.runAfter(15000, internal.wheelGame.spinWheel, {
      roundNumber: args.roundNumber,
    });
  },
});
