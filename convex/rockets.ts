// [ezo-rockets] نظام الصاروخ — Binmo style energy system
import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireUser } from "./lib/auth";

// ================================================================
// تعريف 5 مستويات الصاروخ
// ================================================================
export const ROCKET_LEVELS = [
  {
    name: "أخضر",
    threshold: 25_000,
    color: "#10b981",
    img: "/rockets/rocket-green.png",
    vehicle: "/rewards/vehicle-motorcycle.png",
    frame: "/rewards/frame-green.png",
    vip: 1,
  },
  {
    name: "أزرق",
    threshold: 250_000,
    color: "#3b82f6",
    img: "/rockets/rocket-blue.png",
    vehicle: "/rewards/vehicle-sportscar.png",
    frame: "/rewards/frame-blue.png",
    vip: 2,
  },
  {
    name: "بنفسجي",
    threshold: 625_000,
    color: "#8b5cf6",
    img: "/rockets/rocket-purple.png",
    vehicle: "/rewards/vehicle-yacht.png",
    frame: "/rewards/frame-purple.png",
    vip: 2,
  },
  {
    name: "أحمر",
    threshold: 1_000_000,
    color: "#ef4444",
    img: "/rockets/rocket-red.png",
    vehicle: "/rewards/vehicle-redcar.png",
    frame: "/rewards/frame-red.png",
    vip: 3,
  },
  {
    name: "ذهبي",
    threshold: 1_500_000,
    color: "#fbbf24",
    img: "/rockets/rocket-gold.png",
    vehicle: "/rewards/vehicle-military.png",
    frame: "/rewards/frame-gold.png",
    vip: 3,
  },
] as const;

// مفتاح اليوم (GMT+3)
function getCycleKey(): string {
  const now = new Date();
  const gmt3 = new Date(now.getTime() + 3 * 60 * 60 * 1000);
  return gmt3.toISOString().slice(0, 10);
}

// ================================================================
// Public Queries
// ================================================================

// حالة الصواريخ في الغرفة (5 مستويات)
export const getState = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    const cycle = getCycleKey();
    const rows = await ctx.db
      .query("roomRockets")
      .withIndex("by_room_cycle", (q) =>
        q.eq("roomId", args.roomId).eq("cycleKey", cycle)
      )
      .collect();

    // للـ 5 مستويات: إذا ما فيه صف → ارجع صفر
    return ROCKET_LEVELS.map((lvl, i) => {
      const row = rows.find((r) => r.levelIndex === i);
      const current = row?.currentEnergy ?? 0;
      const progress = Math.min(100, (current / lvl.threshold) * 100);
      return {
        levelIndex: i,
        name: lvl.name,
        color: lvl.color,
        img: lvl.img,
        vehicle: lvl.vehicle,
        frame: lvl.frame,
        threshold: lvl.threshold,
        currentEnergy: current,
        progress,
        launched: row?.launched ?? false,
        launchedAt: row?.launchedAt ?? null,
        mvpUserId: row?.mvpUserId ?? null,
        lastHitUserId: row?.lastHitUserId ?? null,
      };
    });
  },
});

// سجل إطلاقات الغرفة
export const listRoomHistory = query({
  args: { roomId: v.id("rooms"), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("rocketLaunchEvents")
      .withIndex("by_room_created", (q) => q.eq("roomId", args.roomId))
      .order("desc")
      .take(args.limit ?? 20);
    return rows;
  },
});

// مكافآت المستخدم الحالي (سجل "تسجيلي")
export const listMyRewards = query({
  args: { tokenOverride: v.optional(v.string()), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    if (!me) return [];
    const rows = await ctx.db
      .query("userRocketRewards")
      .withIndex("by_user_created", (q) => q.eq("userId", me._id))
      .order("desc")
      .take(args.limit ?? 50);
    return rows;
  },
});

// ================================================================
// Public Mutations
// ================================================================

// استلام مكافأة
export const claimReward = mutation({
  args: {
    rewardId: v.id("userRocketRewards"),
    tokenOverride: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    if (!me) throw new Error("Not authenticated");

    const reward = await ctx.db.get("userRocketRewards", args.rewardId);
    if (!reward) throw new Error("Reward not found");
    if (reward.userId !== me._id) throw new Error("Not your reward");
    if (reward.claimed) return { ok: true, alreadyClaimed: true };

    // أضف المكافأة للرصيد
    if (reward.rewardType === "coins" && reward.rewardAmount) {
      await ctx.db.patch("users", me._id, {
        coins: (me.coins ?? 0) + reward.rewardAmount,
      });
    } else if (reward.rewardType === "bcoins" && reward.rewardAmount) {
      // bcoins = diamonds موجودة في schema؟
      await ctx.db.patch("users", me._id, {
        charms: (me.charms ?? 0) + reward.rewardAmount,
      });
    }

    await ctx.db.patch("userRocketRewards", args.rewardId, {
      claimed: true,
      claimedAt: Date.now(),
    });

    return { ok: true };
  },
});

// ================================================================
// Internal — يُستدعى من sendBatch
// ================================================================

// إضافة طاقة للصاروخ عند إرسال هدية
export const addEnergy = internalMutation({
  args: {
    roomId: v.id("rooms"),
    fromUserId: v.id("users"),
    amount: v.number(),
  },
  handler: async (ctx, args) => {
    const cycle = getCycleKey();

    // للـ 5 مستويات
    for (let i = 0; i < ROCKET_LEVELS.length; i++) {
      const lvl = ROCKET_LEVELS[i];
      const existing = await ctx.db
        .query("roomRockets")
        .withIndex("by_room_cycle_level", (q) =>
          q
            .eq("roomId", args.roomId)
            .eq("cycleKey", cycle)
            .eq("levelIndex", i)
        )
        .first();

      if (existing) {
        if (existing.launched) continue; // هذا المستوى انطلق، تخطاه
        const newEnergy = existing.currentEnergy + args.amount;
        await ctx.db.patch("roomRockets", existing._id, {
          currentEnergy: newEnergy,
          lastHitUserId: args.fromUserId,
          updatedAt: Date.now(),
        });

        // فحص الإطلاق
        if (newEnergy >= lvl.threshold) {
          await ctx.scheduler.runAfter(0, internal.rockets.launch, {
            rocketId: existing._id,
            levelIndex: i,
          });
        }
      } else {
        // صف جديد
        const newId = await ctx.db.insert("roomRockets", {
          roomId: args.roomId,
          cycleKey: cycle,
          levelIndex: i,
          currentEnergy: args.amount,
          targetEnergy: lvl.threshold,
          launched: false,
          lastHitUserId: args.fromUserId,
          updatedAt: Date.now(),
        });

        if (args.amount >= lvl.threshold) {
          await ctx.scheduler.runAfter(0, internal.rockets.launch, {
            rocketId: newId,
            levelIndex: i,
          });
        }
      }
    }

    return { ok: true };
  },
});

// إطلاق الصاروخ + توزيع المكافآت
export const launch = internalMutation({
  args: {
    rocketId: v.id("roomRockets"),
    levelIndex: v.number(),
  },
  handler: async (ctx, args) => {
    const rocket = await ctx.db.get("roomRockets", args.rocketId);
    if (!rocket || rocket.launched) return { ok: false };

    const lvl = ROCKET_LEVELS[args.levelIndex];
    if (!lvl) return { ok: false };

    // اجلب المستخدمين على المايكات
    const seats = await ctx.db
      .query("micSeats")
      .withIndex("by_room_and_seatIndex", (q) => q.eq("roomId", rocket.roomId))
      .collect();

    const occupied = seats.filter((s) => s.userId);
    if (occupied.length === 0) return { ok: false };

    // MVP = lastHitUserId (الأقرب للإطلاق)
    const mvpId = rocket.lastHitUserId;
    const mvpUser = mvpId ? await ctx.db.get("users", mvpId) : null;

    // للإحصاءات: أعلى مرسل في هذه الدورة لهذا المستوى
    const mvpName = mvpUser?.name ?? "ضيف";
    const mvpFinalId = mvpId ?? occupied[0].userId!;

    // سجّل حدث الإطلاق
    const eventId = await ctx.db.insert("rocketLaunchEvents", {
      roomId: rocket.roomId,
      levelIndex: args.levelIndex,
      levelName: lvl.name,
      levelColor: lvl.color,
      totalValue: rocket.currentEnergy,
      mvpUserId: mvpFinalId,
      mvpUserName: mvpName,
      lastHitUserId: mvpFinalId,
      lastHitUserName: mvpName,
      recipientCount: occupied.length,
      createdAt: Date.now(),
    });

    // وزّع المكافآت على المايكات (عشوائي)
    // لكل مستخدم: 1 من [coins, bcoins] + فرصة VIP/مركبة/إطار لـ 3 أعلى
    const now = Date.now();
    for (let idx = 0; idx < occupied.length; idx++) {
      const seat = occupied[idx];
      if (!seat.userId) continue;

      // اختر نوع المكافأة
      // 70%: coins أو bcoins | 20%: VIP | 10%: مركبة/إطار
      const roll = Math.random();

      let rewardType: "coins" | "bcoins" | "vip" | "vehicle" | "frame";
      let rewardImgUrl: string;
      let rewardAmount: number | undefined;

      if (roll < 0.4) {
        rewardType = "coins";
        rewardAmount = 500 + Math.floor(Math.random() * 2000);
        rewardImgUrl = rewardAmount > 1500 ? "/rewards/coins-large.png"
                      : rewardAmount > 800 ? "/rewards/coins-medium.png"
                      : "/rewards/coins-small.png";
      } else if (roll < 0.7) {
        rewardType = "bcoins";
        rewardAmount = 100 + Math.floor(Math.random() * 400);
        rewardImgUrl = rewardAmount > 350 ? "/rewards/bcoins-large.png"
                      : rewardAmount > 200 ? "/rewards/bcoins-medium.png"
                      : "/rewards/bcoins-small.png";
      } else if (roll < 0.9 && idx < 3) {
        rewardType = "vip";
        rewardImgUrl = `/rewards/vip${lvl.vip}.png`;
      } else if (idx < 2) {
        // أعلى اثنين → مركبة أو إطار
        const isVehicle = Math.random() < 0.6;
        rewardType = isVehicle ? "vehicle" : "frame";
        rewardImgUrl = isVehicle ? lvl.vehicle : lvl.frame;
      } else {
        rewardType = "coins";
        rewardAmount = 300 + Math.floor(Math.random() * 500);
        rewardImgUrl = "/rewards/coins-small.png";
      }

      await ctx.db.insert("userRocketRewards", {
        userId: seat.userId,
        roomId: rocket.roomId,
        launchId: eventId,
        levelIndex: args.levelIndex,
        levelName: lvl.name,
        levelColor: lvl.color,
        rewardType,
        rewardAmount,
        rewardImgUrl,
        claimed: false,
        createdAt: now,
      });
    }

    // ضع علامة "أُطلق"
    await ctx.db.patch("roomRockets", args.rocketId, {
      launched: true,
      launchedAt: now,
      mvpUserId: mvpFinalId,
      updatedAt: now,
    });

    return { ok: true, eventId };
  },
});
