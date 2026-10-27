import { ConvexError, v } from "convex/values";
import { levelFromValue } from "./lib/levels";
import { activeVipLevel } from "./lib/vip";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireUser, isFullAdmin } from "./lib/auth";
import { weekKey } from "./lib/week";
import { checkAndGrantMedals } from "./medals";


// [ezo-charms] ظٹط²ظٹط¯ sessionCharms ط¹ظ„ظ‰ ظ…ط§ظٹظƒ ط§ظ„ظ…ط³طھظ„ظ… (ط¥ظ† ظƒط§ظ† ط¹ظ„ظ‰ ظ…ط§ظٹظƒ)
async function bumpSeatCharms(
  ctx: any,
  roomId: any,
  userId: any,
  amount: number,
) {
  const seats = await ctx.db
    .query("micSeats")
    .withIndex("by_room_and_seatIndex", (q: any) => q.eq("roomId", roomId))
    .take(24);
  for (const s of seats) {
    if (s.userId === userId) {
      await ctx.db.patch("micSeats", s._id, {
        sessionCharms: (s.sessionCharms ?? 0) + amount,
        sessionStartedAt: s.sessionStartedAt ?? Date.now(),
      });
      break;
    }
  }
}



// [ezo-agency] ط­ط³ط§ط¨ ظ…ط³طھظˆظ‰ ط§ظ„ظ…ط¶ظٹظپ ظ…ظ† ط¯ط®ظ„ظ‡ ط§ظ„ط´ظ‡ط±ظٹ
function levelFromAchieved(achieved: number): number {
  const T = [0, 20_000, 40_000, 80_000, 126_000, 220_000, 320_000,
    460_000, 580_000, 850_000, 1_250_000, 1_850_000, 3_500_000,
    5_250_000, 7_000_000, 10_500_000];
  let lvl = 0;
  for (let i = 1; i < T.length; i++) {
    if (achieved >= T[i]) lvl = i;
    else break;
  }
  return lvl;
}


// (طھظ… ط­ط°ظپ generateGiftUploadUrl â€” ظ†ط³طھط®ط¯ظ… Cloudinary)

// ============ ADMIN: Create gift ============
// [ezo-trophy] Update room weekly total (lazy reset)
async function updateRoomWeekly(ctx: any, roomId: any, amount: number) {
  const room = await ctx.db.get("rooms", roomId);
  if (!room) return;
  const current = weekKey();
  const sameCycle = room.weeklyCycleKey === current;
  await ctx.db.patch("rooms", roomId, {
    weeklyTotal: sameCycle ? (room.weeklyTotal ?? 0) + amount : amount,
    weeklyCycleKey: current,
    weeklyResetAt: sameCycle ? room.weeklyResetAt : Date.now(),
  });
}

export const createGift = mutation({
  args: {
    name: v.string(),
    price: v.number(),
    category: v.string(),
    mediaUrl: v.string(),
    mediaType: v.union(v.literal("image"), v.literal("video")),
    forceGlobal: v.optional(v.boolean()),
    isLucky: v.optional(v.boolean()),
    luckyMultipliers: v.optional(v.array(v.object({
      multiplier: v.number(),
      probability: v.number(),
    }))),
    tokenOverride: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.tokenOverride);
    if (!user.isAdmin && user.adminRole !== "super" && user.adminRole !== "moderator") {
      throw new ConvexError({ code: "FORBIDDEN", message: "ط؛ظٹط± ظ…طµط±ط­" });
    }
    const name = args.name.trim();
    if (name.length < 1 || name.length > 30) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "ط§ط³ظ… ط§ظ„ظ‡ط¯ظٹط© ط؛ظٹط± طµط§ظ„ط­" });
    }
    if (args.price < 1 || args.price > 1000000) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "ط§ظ„ط³ط¹ط± ط؛ظٹط± طµط§ظ„ط­" });
    }
    const isVideo = args.mediaType === "video";
    const isRelationship = args.category === "relation";
    const isGlobal = args.price >= 30000 || !!args.forceGlobal;
    const showsBanner = args.price >= 1000 && isVideo;

    const id = await ctx.db.insert("gifts", {
      name,
      price: args.price,
      category: args.category,
      mediaUrl: args.mediaUrl,
      mediaType: args.mediaType,
      isLucky: args.isLucky,
      luckyMultipliers: args.luckyMultipliers,
      hasSound: isVideo,
      isGlobal,
      isRelationship,
      forceGlobal: args.forceGlobal ?? false,
      showsBanner,
      active: true,
    });
    return id;
  },
});

// ============ ADMIN: Delete gift ============
export const removeGift = mutation({
  args: { giftId: v.id("gifts"), tokenOverride: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.tokenOverride);
    if (!user.isAdmin && user.adminRole !== "super") {
      throw new ConvexError({ code: "FORBIDDEN", message: "ط؛ظٹط± ظ…طµط±ط­" });
    }
    const gift = await ctx.db.get("gifts", args.giftId);
    if (!gift) return null;
    await ctx.db.delete(gift._id);
    return null;
  },
});

// ============ LIST: All gifts (with URLs) ============
export const listActive = query({
  args: {},
  handler: async (ctx) => {
    const gifts = await ctx.db
      .query("gifts")
      .withIndex("by_active", (q) => q.eq("active", true))
      .take(200);
    return gifts.sort((a, b) => a.price - b.price);
  },
});

// ============ LIST: Admin â€” all gifts ============
export const listAllAdmin = query({
  args: { tokenOverride: v.optional(v.string()) },
  handler: async (ctx, args) => {
    try {
      const user = await requireUser(ctx, args.tokenOverride);
      if (!user.isAdmin && user.adminRole !== "super" && user.adminRole !== "moderator") return [];
      const gifts = await ctx.db.query("gifts").take(300);
      return gifts.sort((a, b) => a.price - b.price);
    } catch { return []; }
  },
});

// ============ BALANCE ============
export const myBalance = query({
  args: { tokenOverride: v.optional(v.string()) },
  handler: async (ctx, args) => {
    try {
      const user = await requireUser(ctx, args.tokenOverride);
      return user.coins ?? 0;
    } catch { return 0; }
  },
});

// ============ SEND ============
export const send = mutation({
  args: {
    roomId: v.id("rooms"),
    toUserId: v.id("users"),
    giftId: v.id("gifts"),
    quantity: v.number(),
    tokenOverride: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.tokenOverride);
    if (args.quantity < 1 || args.quantity > 999) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "ط¹ط¯ط¯ ط؛ظٹط± طµط§ظ„ط­" });
    }
    const gift = await ctx.db.get("gifts", args.giftId);
    if (!gift) throw new ConvexError({ code: "NOT_FOUND", message: "ط§ظ„ظ‡ط¯ظٹط© ط؛ظٹط± ظ…ظˆط¬ظˆط¯ط©" });

    // [VIP-Lock] ظپط­طµ ط­طµط±ظٹط© ظ‡ط¯ط§ظٹط§ VIP
    if (gift.category === "vip") {
      const senderVip = activeVipLevel(user);
      if (senderVip <= 0) {
        throw new ConvexError({
          code: "FORBIDDEN",
          message: "ظ‡ط°ظ‡ ط§ظ„ظ‡ط¯ظٹط© ط­طµط±ظٹط© ظ„ط£ط¹ط¶ط§ط، VIP ظپظ‚ط·! ط§ط´طھط±ظƒ ظپظٹ VIP ظ„ط¥ط±ط³ط§ظ„ظ‡ط§.",
        });
      }
    }

    const target = await ctx.db.get("users", args.toUserId);
    if (!target) throw new ConvexError({ code: "NOT_FOUND", message: "ط§ظ„ظ…ط³طھظ„ظ… ط؛ظٹط± ظ…ظˆط¬ظˆط¯" });
    

    const totalPrice = gift.price * args.quantity;
    const myCoins = user.coins ?? 0;
    if (myCoins < totalPrice) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "ط±طµظٹط¯ظƒ ط؛ظٹط± ظƒط§ظپظچ" });
    }

    await ctx.db.patch("users", user._id, {
      coins: myCoins - totalPrice,
      totalSent: (user.totalSent ?? 0) + totalPrice,
    });
    await recordMissionProgress(ctx, user._id, ["daily_send_gift", "daily_5_gifts", "weekly_50_gifts"]);
    // [ezo-levels] 1 coin received = 1 Charm XP
    await ctx.db.patch("users", args.toUserId, {
      charms: (target.charms ?? 0) + totalPrice,
      totalReceived: (target.totalReceived ?? 0) + totalPrice,
    });
    // [ezo-charms] ط²ظٹط§ط¯ط© ط¹ط¯ظ‘ط§ط¯ ط§ظ„ط¬ظ„ط³ط© ط¹ظ„ظ‰ ط§ظ„ظ…ط§ظٹظƒ
    await bumpSeatCharms(ctx, args.roomId, args.toUserId, totalPrice);

    // ط§ظپط­طµ ط¢ط®ط± transaction â€” ظ‡ظ„ ظ‡ظٹ combo continuationطں
    const lastTx = await ctx.db
      .query("giftTransactions")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .order("desc")
      .first();
    const isComboContinuation = lastTx &&
      lastTx.fromUserId === user._id &&
      lastTx.giftId === gift._id &&
      (Date.now() - lastTx._creationTime) < 3000;

    await ctx.db.insert("giftTransactions", {
      roomId: args.roomId,
      fromUserId: user._id,
      fromName: user.name ?? "ط¶ظٹظپ",
      toUserId: args.toUserId,
      toName: target.name ?? "ط¶ظٹظپ",
      giftId: gift._id,
      giftName: gift.name,
      giftIcon: gift.mediaUrl ?? "",
      quantity: args.quantity,
      totalPrice,
    });

    // [ezo-trophy] Add to room weekly total
    await updateRoomWeekly(ctx, args.roomId, totalPrice);

    // [ezo-medals] Auto-grant medals for sender + receiver
    await checkAndGrantMedals(ctx, user._id);
    await checkAndGrantMedals(ctx, args.toUserId);

    // ظ„ط§ طھظ†ط´ط¦ ط±ط³ط§ظ„ط© ط¬ط¯ظٹط¯ط© ط¥ط°ط§ ظƒط§ظ†طھ ط§ط³طھظ…ط±ط§ط± ظƒظˆظ…ط¨ظˆ
    if (!isComboContinuation) {
      await ctx.db.insert("messages", {
        roomId: args.roomId,
        senderId: user._id,
        senderName: user.name ?? "ط¶ظٹظپ",
        text: `${user.name ?? "ط¶ظٹظپ"} ط£ط±ط³ظ„ ${gift.name} أ— ${args.quantity} ط¥ظ„ظ‰ ${target.name ?? "ط¶ظٹظپ"}`,
        system: true,
      });
    }

    return { success: true, remaining: myCoins - totalPrice };
  },
});

// ============ ط¥ط±ط³ط§ظ„ ظ‡ط¯ظٹط© ظ„ط¹ط¯ط© ظ…ط³طھط®ط¯ظ…ظٹظ† ط¯ظپط¹ط© ظˆط§ط­ط¯ط© (Batch) ============
export const sendBatch = mutation({
  args: {
    roomId: v.id("rooms"),
    toUserIds: v.array(v.id("users")),
    giftId: v.id("gifts"),
    quantity: v.number(),
    tokenOverride: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.tokenOverride);

    // طھط­ظ‚ظ‚ط§طھ ط§ظ„ط¥ط¯ط®ط§ظ„
    if (!args.toUserIds.length) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "ظ„ظ… ظٹطھظ… ط§ط®طھظٹط§ط± ط£ظٹ ظ…ط³طھظ„ظ…" });
    }
    if (args.toUserIds.length > 500) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "ط¹ط¯ط¯ ط§ظ„ظ…ط³طھظ„ظ…ظٹظ† ظƒط¨ظٹط± ط¬ط¯ط§ظ‹ (500 ظƒط­ط¯ ط£ظ‚طµظ‰)" });
    }
    if (args.quantity < 1 || args.quantity > 999) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "ط¹ط¯ط¯ ط؛ظٹط± طµط§ظ„ط­" });
    }

    const gift = await ctx.db.get("gifts", args.giftId);
    if (!gift) throw new ConvexError({ code: "NOT_FOUND", message: "ط§ظ„ظ‡ط¯ظٹط© ط؛ظٹط± ظ…ظˆط¬ظˆط¯ط©" });
    // [VIP-Lock] ظپط­طµ ط­طµط±ظٹط© ظ‡ط¯ط§ظٹط§ VIP ظپظٹ ط§ظ„ط¥ط±ط³ط§ظ„ ط§ظ„ط¬ظ…ط§ط¹ظٹ
    if (gift.category === "vip") {
      const myVip = activeVipLevel(user);
      if (myVip <= 0) {
        throw new ConvexError({
          code: "FORBIDDEN",
          message: "ظ‡ط°ظ‡ ط§ظ„ظ‡ط¯ظٹط© ط­طµط±ظٹط© ظ„ط£ط¹ط¶ط§ط، VIP ظپظ‚ط·! ط§ط´طھط±ظƒ ظپظٹ VIP ظ„ط¥ط±ط³ط§ظ„ظ‡ط§.",
        });
      }
    }

    // ط¥ط²ط§ظ„ط© ط§ظ„طھظƒط±ط§ط± (ط­ظ…ط§ظٹط© ظ…ظ† ط¥ط±ط³ط§ظ„ ظ†ظپط³ ط§ظ„ظ€ ID ظ…ط±طھظٹظ†)
    const uniqueIds = Array.from(new Set(args.toUserIds));

    // ط¬ظ„ط¨ ط¬ظ…ظٹط¹ ط§ظ„ظ…ط³طھظ„ظ…ظٹظ† ط¯ظپط¹ط© ظˆط§ط­ط¯ط©
    const targetDocs = await Promise.all(uniqueIds.map((id) => ctx.db.get("users", id)));
    const targets = targetDocs.filter((t): t is NonNullable<typeof t> => t !== null);

    if (targets.length === 0) {
      throw new ConvexError({ code: "NOT_FOUND", message: "ط§ظ„ظ…ط³طھظ„ظ…ظˆظ† ط؛ظٹط± ظ…ظˆط¬ظˆط¯ظٹظ†" });
    }

    const totalPrice = gift.price * args.quantity * targets.length;
    const myCoins = user.coins ?? 0;
    if (myCoins < totalPrice) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "ط±طµظٹط¯ظƒ ط؛ظٹط± ظƒط§ظپظچ" });
    }

    // batchId ظ…ظˆط­ط¯ ظ„ظƒظ„ ظ…ط¹ط§ظ…ظ„ط§طھ ط§ظ„ط¯ظپط¹ط© (ظ„ظ„طھط¬ظ…ظٹط¹ ظپظٹ ط§ظ„ظˆط§ط¬ظ‡ط©)
    const batchId = `b_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // ط§ظ„طھط­ظ‚ظ‚ ظ…ظ…ط§ ط¥ط°ط§ ظƒط§ظ† ط§ظ„ظ…ط±ط³ظ„ ظٹظ‡ط¯ظٹ ظ†ظپط³ظ‡ ط¶ظ…ظ† ط§ظ„ط¯ظپط¹ط©
    const isSelfIncluded = targets.some((t) => t._id === user._id);
    const perTarget = gift.price * args.quantity;

    // ط®طµظ… ظ…ط±ط© ظˆط§ط­ط¯ط© ظ…ظ† ط§ظ„ظ…ط±ط³ظ„ ظ…ط¹ ط¯ظ…ط¬ ط­طµطھظ‡ ط¥ظ† ظƒط§ظ† ط¶ظ…ظ† ط§ظ„ظ…ط³طھظ„ظ…ظٹظ† (Self-Gift Safe)
    const selfDiamondRatio = user.agencyId ? 0.3 : 0.7;
    await ctx.db.patch("users", user._id, {
      coins: myCoins - totalPrice,
      totalSent: (user.totalSent ?? 0) + totalPrice,
      ...(isSelfIncluded ? {
        charms: (user.charms ?? 0) + perTarget,
        totalReceived: (user.totalReceived ?? 0) + perTarget,
        diamonds: (user.diamonds ?? 0) + Math.floor(perTarget * selfDiamondRatio),
        ...(user.agencyId ? { hostIncomeMonth: (user.hostIncomeMonth ?? 0) + perTarget } : {}),
      } : {}),
    });

    // ظ„ظƒظ„ ظ…ط³طھظ„ظ… ط¢ط®ط±: ط²ظٹط§ط¯ط© charms + totalReceived + insert transaction
    for (const target of targets) {
      if (target._id !== user._id) {
        await ctx.db.patch("users", target._id, {
          charms: (target.charms ?? 0) + perTarget,
          totalReceived: (target.totalReceived ?? 0) + perTarget,
          // [ezo-agency] 30% ظ…ط§ط³ ظ„ظ„ظ…ط¶ظٹظپطŒ 70% ظ„ط¹ط¶ظˆ ط¹ط§ط¯ظٹ
          ...(target.agencyId ? {
            diamonds: (target.diamonds ?? 0) + Math.floor(perTarget * 0.3),
            hostIncomeMonth: (target.hostIncomeMonth ?? 0) + perTarget,
          } : {
            diamonds: (target.diamonds ?? 0) + Math.floor(perTarget * 0.7),
          }),
        });
      }
      // [ezo-charms] ط²ظٹط§ط¯ط© ط¹ط¯ظ‘ط§ط¯ ط§ظ„ط¬ظ„ط³ط© ط¹ظ„ظ‰ ط§ظ„ظ…ط§ظٹظƒ
      await bumpSeatCharms(ctx, args.roomId, target._id, perTarget);
      await ctx.db.insert("giftTransactions", {
        roomId: args.roomId,
        fromUserId: user._id,
        fromName: user.name ?? "ط¶ظٹظپ",
        toUserId: target._id,
        toName: target.name ?? "ط¶ظٹظپ",
        giftId: gift._id,
        giftName: gift.name,
        giftIcon: gift.mediaUrl ?? "",
        quantity: args.quantity,
        totalPrice: gift.price * args.quantity,
        batchId,
      });
    }

    // [ezo-trophy] Add to room weekly total (once per batch)
    await updateRoomWeekly(ctx, args.roomId, totalPrice);

    // [ezo-medals] Auto-grant medals
    await checkAndGrantMedals(ctx, user._id);
    for (const target of targets) {
      await checkAndGrantMedals(ctx, target._id);
    }

    // ط±ط³ط§ظ„ط© ظˆط§ط­ط¯ط© ظپظ‚ط· (ط¨ط¯ظ„ N)
    const summary = targets.length === 1
      ? `ط¥ظ„ظ‰ ${targets[0]?.name ?? "ط¶ظٹظپ"}`
      : `ط¥ظ„ظ‰ ${targets.length} ظ…ط³طھط®ط¯ظ…ظٹظ†`;
    await ctx.db.insert("messages", {
      roomId: args.roomId,
      senderId: user._id,
      senderName: user.name ?? "ط¶ظٹظپ",
      text: `${user.name ?? "ط¶ظٹظپ"} ط£ط±ط³ظ„ ${gift.name} أ— ${args.quantity} ${summary}`,
      system: true,
    });

    // [ezo-rocket] ط´ط­ظ† ط§ظ„طµط§ط±ظˆط® ط¹ظ†ط¯ ظƒظ„ ط¯ظپط¹ط© ظ‡ط¯ط§ظٹط§
    try {
      await ctx.scheduler.runAfter(0, internal.rockets.addEnergy, {
        roomId: args.roomId,
        fromUserId: user._id,
        amount: totalPrice,
      });
    } catch (e) {
      console.error("[rocket] addEnergy failed:", e);
    }

    return {
      success: true,
      batchId,
      count: targets.length,
      totalSpent: totalPrice,
      remaining: myCoins - totalPrice,
    };
  },
});

// ============ LEADERBOARD ============
export const roomLeaderboard = query({
  args: {
    roomId: v.id("rooms"),
    type: v.union(v.literal("wealth"), v.literal("charm")),
    period: v.union(v.literal("daily"), v.literal("weekly"), v.literal("monthly")),
  },
  handler: async (ctx, args) => {
    // ط­ط³ط§ط¨ since ط­ط³ط¨ ط§ظ„ظپطھط±ط©
    const now = new Date();
    let since: number;
    if (args.period === "daily") {
      since = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    } else if (args.period === "weekly") {
      const d = new Date(now); d.setDate(d.getDate() - 7); since = d.getTime();
    } else {
      const d = new Date(now); d.setDate(d.getDate() - 30); since = d.getTime();
    }

    const txs = await ctx.db
      .query("giftTransactions")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .order("desc")
      .take(1000);

    const filtered = txs.filter((t) => t._creationTime >= since);
    const isWealth = args.type === "wealth";

    // طھط¬ظ…ظٹط¹ ط­ط³ط¨ ط§ظ„ظ…ط³طھط®ط¯ظ…
    const totals: Record<string, { userId: any; total: number }> = {};
    for (const t of filtered) {
      const key = isWealth ? t.fromUserId : t.toUserId;
      if (!totals[key]) totals[key] = { userId: key, total: 0 };
      totals[key].total += t.totalPrice;
    }

    const sorted = Object.values(totals).sort((a, b) => b.total - a.total).slice(0, 20);

    // ط¬ظ„ط¨ ط¨ظٹط§ظ†ط§طھ ظƒظ„ ظ…ط³طھط®ط¯ظ…
    const enriched = await Promise.all(
      sorted.map(async (item) => {
        const u = await ctx.db.get("users", item.userId);
        // [ezo-fix] prefer Cloudinary avatarUrl, fallback to legacy storage avatarId
        const avatarUrl = u?.avatarUrl ?? (u?.avatarId ? await ctx.storage.getUrl(u.avatarId) : null);
        const vip = activeVipLevel(u);
        return {
          userId: item.userId as string,
          userNumber: u?.userNumber ?? null,
          name: u?.name ?? "ط¶ظٹظپ",
          avatarUrl,
          vip,
          charmLevel: levelFromValue(u?.totalReceived ?? 0),
          charmValue: u?.charms ?? 0,
          wealthValue: u?.totalSent ?? 0,
          adminRole: u?.adminRole ?? null,
          total: item.total,
        };
      })
    );

    return enriched;
  },
});

// Latest gift in room (for on-screen animation overlay)
export const latestGift = query({
  args: { roomId: v.id("rooms"), since: v.number() },
  handler: async (ctx, args) => {
    const txs = await ctx.db
      .query("giftTransactions")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .order("desc")
      .take(5);
    const recent = txs.find((t) => t._creationTime > args.since);
    if (!recent) return null;
    const gift = await ctx.db.get("gifts", recent.giftId);
    if (!gift) return null;
    const mediaUrl = gift.mediaUrl ?? (gift.mediaId ? await ctx.storage.getUrl(gift.mediaId) : null);
    return {
      _id: recent._id,
      fromName: recent.fromName,
      toName: recent.toName,
      giftName: recent.giftName,
      quantity: recent.quantity,
      price: gift.price,
      mediaUrl,
      mediaType: gift.mediaType,
      createdAt: recent._creationTime,
    };
  },
});

// Latest gift in room WITH avatars for the banner
export const latestGiftFull = query({
  args: { roomId: v.id("rooms"), since: v.number() },
  handler: async (ctx, args) => {
    const txs = await ctx.db
      .query("giftTransactions")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .order("desc")
      .take(20);
    const recent = txs.find((t) => t._creationTime > args.since);
    if (!recent) return null;
    const gift = await ctx.db.get("gifts", recent.giftId);
    if (!gift) return null;
    const [fromUser, toUser] = await Promise.all([
      ctx.db.get("users", recent.fromUserId),
      ctx.db.get("users", recent.toUserId),
    ]);
    const [mediaUrl, fromAvatar, toAvatar] = await Promise.all([
      gift.mediaUrl ?? (gift.mediaId ? await ctx.storage.getUrl(gift.mediaId) : null),
      fromUser?.avatarId ? ctx.storage.getUrl(fromUser.avatarId) : Promise.resolve(null),
      toUser?.avatarId ? ctx.storage.getUrl(toUser.avatarId) : Promise.resolve(null),
    ]);
    // ============ ط¯ط¹ظ… ط§ظ„ط¯ظپط¹ط§طھ (batch): ط¬ظ„ط¨ ظƒظ„ ط§ظ„ط£ظ‡ط¯ط§ظپ ============
    let batchTargets: Array<{ toUserId: string; toName: string; toAvatar: string | null }> = [];
    if (recent.batchId) {
      const batchTxs = await ctx.db
        .query("giftTransactions")
        .withIndex("by_batch", (q) => q.eq("batchId", recent.batchId))
        .take(500);
      batchTargets = await Promise.all(
        batchTxs.map(async (t) => {
          const u = await ctx.db.get("users", t.toUserId);
          const av = u?.avatarId ? await ctx.storage.getUrl(u.avatarId) : null;
          return {
            toUserId: t.toUserId as string,
            toName: t.toName,
            toAvatar: av,
          };
        })
      );
    }

    return {
      _id: recent._id,
      giftId: recent.giftId,
      fromName: recent.fromName,
      toName: recent.toName,
      fromUserId: recent.fromUserId,
      toUserId: recent.toUserId,
      fromAvatar,
      toAvatar,
      giftName: recent.giftName,
      quantity: recent.quantity,
      price: gift.price,
      mediaUrl,
      mediaType: gift.mediaType,
      hasSound: gift.hasSound ?? false,
      isGlobal: gift.isGlobal ?? false,
      isRelationship: gift.isRelationship ?? false,
      createdAt: recent._creationTime,
      batchId: recent.batchId ?? null,
      batchTargets,
    };
  },
});

// Migration: backfill badges for old gifts
export const migrateGiftBadges = mutation({
  args: { tokenOverride: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireUser(ctx, args.tokenOverride);
    const gifts = await ctx.db.query("gifts").take(500);
    let updated = 0;
    for (const g of gifts) {
      const isVideo = g.mediaType === "video";
      const isRelationship = g.category === "relation";
      const isGlobal = g.price >= 30000 || !!g.forceGlobal;
      const showsBanner = g.price >= 1000 && isVideo;
      await ctx.db.patch("gifts", g._id, {
        hasSound: isVideo,
        isGlobal,
        isRelationship,
        showsBanner,
      });
      updated++;
    }
    return { updated };
  },
});

// ط§ط³طھط¹ظ„ط§ظ… ط¹ط§ظ… ظ„ط¬ظ…ظٹط¹ ط§ظ„ط؛ط±ظپ ظ„ظ„ط§ط³طھظ…ط§ط¹ ظ„ظ„ط´ط±ظٹط· ط§ظ„ط°ظ‡ط¨ظٹ (â‰¥ 30000)
export const latestGlobalBroadcast = query({
  args: { since: v.number() },
  handler: async (ctx, args) => {
    const txs = await ctx.db
      .query("giftTransactions")
      .order("desc")
      .take(10);
    const recent = txs.find((t) => t._creationTime > args.since);
    if (!recent) return null;
    const gift = await ctx.db.get("gifts", recent.giftId);
    if (!gift) return null;
    if ((gift.price ?? 0) < 30000 && !gift.isGlobal) return null;

    const [fromUser, toUser, room] = await Promise.all([
      ctx.db.get("users", recent.fromUserId),
      ctx.db.get("users", recent.toUserId),
      ctx.db.get("rooms", recent.roomId),
    ]);
    const [fromAvatar, toAvatar] = await Promise.all([
      fromUser?.avatarId ? ctx.storage.getUrl(fromUser.avatarId) : Promise.resolve(null),
      toUser?.avatarId ? ctx.storage.getUrl(toUser.avatarId) : Promise.resolve(null),
    ]);

    return {
      _id: recent._id,
      giftName: recent.giftName,
      quantity: recent.quantity,
      price: gift.price,
      roomId: recent.roomId,
      roomName: room?.name ?? "ط؛ط±ظپط©",
      fromName: recent.fromName,
      fromAvatar,
      toName: recent.toName,
      toAvatar,
      createdAt: recent._creationTime,
    };
  },
});

// [ezo-missions] Helper ظ„طھط³ط¬ظٹظ„ طھظ‚ط¯ظ… ط§ظ„ظ…ظ‡ط§ظ…
async function recordMissionProgress(ctx: any, userId: any, keys: string[], amount = 1) {
  const dailyCycle = new Date().toISOString().slice(0, 10);
  const onejan = new Date(new Date().getFullYear(), 0, 1);
  const week = Math.ceil(((new Date().getTime() - onejan.getTime()) / 86400000 + onejan.getDay() + 1) / 7);
  const weeklyCycle = `${new Date().getFullYear()}-W${week}`;

  const missions = await ctx.db.query("missions").collect();
  for (const key of keys) {
    const m = missions.find((x: any) => x.key === key);
    if (!m) continue;
    const cycle = m.type === "weekly" ? weeklyCycle : dailyCycle;
    const existing = await ctx.db
      .query("userMissions")
      .withIndex("by_user_and_mission", (q: any) => q.eq("userId", userId).eq("missionId", m._id))
      .filter((q: any) => q.eq(q.field("cycleKey"), cycle))
      .first();
    if (existing) {
      if (existing.claimedAt) continue;
      await ctx.db.patch("userMissions", existing._id, {
        progress: Math.min((existing.progress ?? 0) + amount, m.target),
      });
    } else {
      await ctx.db.insert("userMissions", {
        userId,
        missionId: m._id,
        progress: Math.min(amount, m.target),
        cycleKey: cycle,
      });
    }
  }
}

