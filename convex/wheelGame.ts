import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireUser } from "./lib/auth";

// ترتيب أقسام العجلة الـ 9 بالضبط: 77 ثم تفاح وبطيخ بالتناوب
export const SECTORS = [
  { index: 0, item: "watermelon", mult: 2 },
  { index: 1, item: "apple", mult: 2 },
  { index: 2, item: "watermelon", mult: 2 },
  { index: 3, item: "apple", mult: 2 },
  { index: 4, item: "77", mult: 8 },
  { index: 5, item: "watermelon", mult: 2 },
  { index: 6, item: "apple", mult: 2 },
  { index: 7, item: "watermelon", mult: 2 },
  { index: 8, item: "apple", mult: 2 },
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
  args: {
    period: v.union(v.literal("day"), v.literal("week"), v.literal("all")),
    tokenOverride: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    let since = 0;
    if (args.period === "day") since = now - 24 * 60 * 60 * 1000;
    else if (args.period === "week") since = now - 7 * 24 * 60 * 60 * 1000;

    const allWins = await ctx.db
      .query("wheelWins")
      .withIndex("by_createdAt")
      .filter((q) => q.gte(q.field("createdAt"), since))
      .collect();

    // تجميع الأرباح لكل مستخدم
    const userMap = new Map();
    for (const w of allWins) {
      const uid = w.userId;
      if (!userMap.has(uid)) {
        userMap.set(uid, { _id: uid, name: w.name, avatarUrl: w.avatarUrl, points: 0 });
      }
      userMap.get(uid).points += w.profit;
    }

    const sorted = Array.from(userMap.values()).sort((a, b) => b.points - a.points);
    const top10 = sorted.slice(0, 10);
    
    // إيجاد ترتيب المستخدم الحالي
    let myRank = null;
    if (args.tokenOverride) {
      const me = await requireUser(ctx, args.tokenOverride);
      if (me) {
        const myIdx = sorted.findIndex((u) => u._id === me._id);
        if (myIdx !== -1) {
          myRank = { ...sorted[myIdx], rank: myIdx + 1 };
        } else {
          myRank = { _id: me._id, name: me.name ?? "أنت", avatarUrl: me.avatarUrl, points: 0, rank: 0 };
        }
      }
    }

    return { top10, myRank };
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
      // مسح الرهانات القديمة من الجدول الحي
      const oldBets = await ctx.db.query("wheelLiveBets").collect();
      for (const b of oldBets) await ctx.db.delete(b._id);

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

    await ctx.db.insert("wheelLiveBets", {
      item: args.item,
      amount: args.amount,
      createdAt: Date.now(),
    });

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

    // تسجيل الأرباح لكل فائز في جدول wheelWins
    const allBetsForRound = await ctx.db
      .query("wheelBets")
      .withIndex("by_round", (q) => q.eq("roundNumber", state.roundNumber))
      .collect();
      
    const userTotals = new Map();
    for (const b of allBetsForRound) {
      if (!userTotals.has(b.userId)) {
        userTotals.set(b.userId, { userId: b.userId, name: b.userName, avatarUrl: b.userAvatar, totalBet: 0, totalWin: 0 });
      }
      userTotals.get(b.userId).totalBet += b.amount;
    }

    const winnerItem = winner.item;
    const mult = winnerItem === "77" ? 8 : 2;
    for (const b of allBetsForRound) {
      if (b.item === winnerItem) {
        userTotals.get(b.userId).totalWin += b.amount * mult;
      }
    }

    for (const w of Array.from(userTotals.values())) {
      if (w.totalWin > 0) {
        await ctx.db.insert("wheelWins", {
          userId: w.userId,
          name: w.name,
          avatarUrl: w.avatarUrl,
          profit: w.totalWin - w.totalBet,
          createdAt: Date.now(),
        });
      }
    }

    const newHistory = [winner.item, ...state.history].slice(0, 50);

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


export const getLiveBets = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("wheelLiveBets").withIndex("by_createdAt").order("desc").take(10);
  },
});
