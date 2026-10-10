import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { requireUser } from "./lib/auth";
import { weekKey } from "./lib/week";

// ============================================================
// [moorawi-trophy] Weekly reward tiers
// ============================================================
const TIERS: Record<number, { coins: number; vip: number; vipCount: number }> = {
  1: { coins: 10_000, vip: 1, vipCount: 3 },
  3: { coins: 30_000, vip: 1, vipCount: 5 },
  6: { coins: 60_000, vip: 2, vipCount: 5 },
};

// ============================================================
// Query: Get reward status for a room
// ============================================================
export const getWeeklyRewardStatus = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    const room = await ctx.db.get("rooms", args.roomId);
    if (!room) return null;

    const currentCycle = weekKey();
    // Current week's total (must match cycleKey or reset)
    const isCurrentCycle = room.weeklyCycleKey === currentCycle;
    const total = isCurrentCycle ? (room.weeklyTotal ?? 0) : 0;

    // Compute tier
    const millions = total / 1_000_000;
    let tier = 0;
    if (millions >= 6) tier = 6;
    else if (millions >= 3) tier = 3;
    else if (millions >= 1) tier = 1;

    // Check if already claimed this cycle
    const existing = await ctx.db
      .query("roomWeeklyRewards")
      .withIndex("by_room_and_cycle", (q) =>
        q.eq("roomId", args.roomId).eq("cycleKey", currentCycle),
      )
      .unique();

    return {
      cycleKey: currentCycle,
      total,
      tier,
      claimed: !!existing,
      rewardInfo: TIERS[tier] ?? null,
      claimRecord: existing,
    };
  },
});

// ============================================================
// Mutation: Claim reward (owner only)
// ============================================================
export const claimWeeklyReward = mutation({
  args: {
    roomId: v.id("rooms"),
    tokenOverride: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    const room = await ctx.db.get("rooms", args.roomId);
    if (!room) throw new ConvexError({ code: "NOT_FOUND", message: "الغرفة غير موجودة" });
    if (room.ownerId !== me._id) {
      throw new ConvexError({ code: "FORBIDDEN", message: "للمالك فقط" });
    }

    const currentCycle = weekKey();
    if (room.weeklyCycleKey !== currentCycle) {
      throw new ConvexError({ code: "NO_CYCLE", message: "لا يوجد نشاط هذا الأسبوع" });
    }

    const total = room.weeklyTotal ?? 0;
    const millions = total / 1_000_000;
    let tier = 0;
    if (millions >= 6) tier = 6;
    else if (millions >= 3) tier = 3;
    else if (millions >= 1) tier = 1;

    if (tier === 0) {
      throw new ConvexError({
        code: "NO_TIER",
        message: "لم تصل الغرفة لأي مستوى مكافأة (1M على الأقل)",
      });
    }

    // Check not already claimed
    const existing = await ctx.db
      .query("roomWeeklyRewards")
      .withIndex("by_room_and_cycle", (q) =>
        q.eq("roomId", args.roomId).eq("cycleKey", currentCycle),
      )
      .unique();
    if (existing) {
      throw new ConvexError({ code: "ALREADY_CLAIMED", message: "تم استلام مكافأة هذا الأسبوع" });
    }

    const reward = TIERS[tier];

    // Award coins to owner
    const owner = await ctx.db.get("users", room.ownerId);
    if (!owner) throw new ConvexError({ code: "NOT_FOUND", message: "المالك غير موجود" });

    const newCoins = (owner.coins ?? 0) + reward.coins;
    await ctx.db.patch("users", owner._id, { coins: newCoins });

    await ctx.db.insert("walletTransactions", {
      userId: owner._id,
      type: "reward",
      amount: reward.coins,
      balanceAfter: newCoins,
      meta: `مكافأة كأس الغرفة (${tier}M) — ${currentCycle}`,
      createdAt: Date.now(),
    });

    // Record claim
    await ctx.db.insert("roomWeeklyRewards", {
      roomId: args.roomId,
      ownerId: room.ownerId,
      cycleKey: currentCycle,
      tier,
      coinsAwarded: reward.coins,
      vipLevel: reward.vip,
      vipCount: reward.vipCount,
      vipClaimedBy: [],
      claimedAt: Date.now(),
    });

    return {
      ok: true,
      tier,
      coinsAwarded: reward.coins,
      vipLevel: reward.vip,
      vipCount: reward.vipCount,
    };
  },
});
