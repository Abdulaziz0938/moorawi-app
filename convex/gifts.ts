import { ConvexError, v } from "convex/values";
import { vipLevelFromTotalReceived } from "./lib/vip";
import { mutation, query } from "./_generated/server";
import { requireUser } from "./lib/auth";
import { weekKey } from "./lib/week";

// (تم حذف generateGiftUploadUrl — نستخدم Cloudinary)

// ============ ADMIN: Create gift ============
// [moorawi-trophy] Update room weekly total (lazy reset)
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
    tokenOverride: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.tokenOverride);
    if (!user.isAdmin && user.adminRole !== "super" && user.adminRole !== "moderator") {
      throw new ConvexError({ code: "FORBIDDEN", message: "غير مصرح" });
    }
    const name = args.name.trim();
    if (name.length < 1 || name.length > 30) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "اسم الهدية غير صالح" });
    }
    if (args.price < 1 || args.price > 1000000) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "السعر غير صالح" });
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
      throw new ConvexError({ code: "FORBIDDEN", message: "غير مصرح" });
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

// ============ LIST: Admin — all gifts ============
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
      throw new ConvexError({ code: "BAD_REQUEST", message: "عدد غير صالح" });
    }
    const gift = await ctx.db.get("gifts", args.giftId);
    if (!gift) throw new ConvexError({ code: "NOT_FOUND", message: "الهدية غير موجودة" });

    const target = await ctx.db.get("users", args.toUserId);
    if (!target) throw new ConvexError({ code: "NOT_FOUND", message: "المستلم غير موجود" });
    

    const totalPrice = gift.price * args.quantity;
    const myCoins = user.coins ?? 0;
    if (myCoins < totalPrice) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "رصيدك غير كافٍ" });
    }

    await ctx.db.patch("users", user._id, {
      coins: myCoins - totalPrice,
      totalSent: (user.totalSent ?? 0) + totalPrice,
    });
    // [moorawi-levels] 1 coin received = 1 Charm XP (Poppo standard)
    await ctx.db.patch("users", args.toUserId, {
      charms: (target.charms ?? 0) + totalPrice,
      totalReceived: (target.totalReceived ?? 0) + totalPrice,
    });

    // افحص آخر transaction — هل هي combo continuation؟
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
      fromName: user.name ?? "ضيف",
      toUserId: args.toUserId,
      toName: target.name ?? "ضيف",
      giftId: gift._id,
      giftName: gift.name,
      giftIcon: "🎁",
      quantity: args.quantity,
      totalPrice,
    });

    // [moorawi-trophy] Add to room weekly total
    await updateRoomWeekly(ctx, args.roomId, totalPrice);

    // لا تنشئ رسالة جديدة إذا كانت استمرار كومبو
    if (!isComboContinuation) {
      await ctx.db.insert("messages", {
        roomId: args.roomId,
        senderId: user._id,
        senderName: user.name ?? "ضيف",
        text: `${user.name ?? "ضيف"} أرسل ${gift.name} × ${args.quantity} إلى ${target.name ?? "ضيف"}`,
        system: true,
      });
    }

    return { success: true, remaining: myCoins - totalPrice };
  },
});

// ============ إرسال هدية لعدة مستخدمين دفعة واحدة (Batch) ============
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

    // تحققات الإدخال
    if (!args.toUserIds.length) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "لم يتم اختيار أي مستلم" });
    }
    if (args.toUserIds.length > 500) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "عدد المستلمين كبير جداً (500 كحد أقصى)" });
    }
    if (args.quantity < 1 || args.quantity > 999) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "عدد غير صالح" });
    }

    const gift = await ctx.db.get("gifts", args.giftId);
    if (!gift) throw new ConvexError({ code: "NOT_FOUND", message: "الهدية غير موجودة" });

    // إزالة التكرار (حماية من إرسال نفس الـ ID مرتين)
    const uniqueIds = Array.from(new Set(args.toUserIds));

    // جلب جميع المستلمين دفعة واحدة
    const targetDocs = await Promise.all(uniqueIds.map((id) => ctx.db.get("users", id)));
    const targets = targetDocs.filter((t): t is NonNullable<typeof t> => t !== null);

    if (targets.length === 0) {
      throw new ConvexError({ code: "NOT_FOUND", message: "المستلمون غير موجودين" });
    }

    const totalPrice = gift.price * args.quantity * targets.length;
    const myCoins = user.coins ?? 0;
    if (myCoins < totalPrice) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "رصيدك غير كافٍ" });
    }

    // خصم مرة واحدة من المرسل
    await ctx.db.patch("users", user._id, {
      coins: myCoins - totalPrice,
      totalSent: (user.totalSent ?? 0) + totalPrice,
    });

    // batchId موحد لكل معاملات الدفعة (للتجميع في الواجهة)
    const batchId = `b_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // لكل مستلم: زيادة charms + totalReceived + insert transaction
    for (const target of targets) {
      await ctx.db.patch("users", target._id, {
        charms: (target.charms ?? 0) + (gift.price * args.quantity),
        totalReceived: (target.totalReceived ?? 0) + gift.price * args.quantity,
      });
      await ctx.db.insert("giftTransactions", {
        roomId: args.roomId,
        fromUserId: user._id,
        fromName: user.name ?? "ضيف",
        toUserId: target._id,
        toName: target.name ?? "ضيف",
        giftId: gift._id,
        giftName: gift.name,
        giftIcon: "🎁",
        quantity: args.quantity,
        totalPrice: gift.price * args.quantity,
        batchId,
      });
    }

    // [moorawi-trophy] Add to room weekly total (once per batch)
    await updateRoomWeekly(ctx, args.roomId, totalPrice);

    // رسالة واحدة فقط (بدل N)
    const summary = targets.length === 1
      ? `إلى ${targets[0]?.name ?? "ضيف"}`
      : `إلى ${targets.length} مستخدمين`;
    await ctx.db.insert("messages", {
      roomId: args.roomId,
      senderId: user._id,
      senderName: user.name ?? "ضيف",
      text: `${user.name ?? "ضيف"} أرسل ${gift.name} × ${args.quantity} ${summary}`,
      system: true,
    });

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
    // حساب since حسب الفترة
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

    // تجميع حسب المستخدم
    const totals: Record<string, { userId: any; total: number }> = {};
    for (const t of filtered) {
      const key = isWealth ? t.fromUserId : t.toUserId;
      if (!totals[key]) totals[key] = { userId: key, total: 0 };
      totals[key].total += t.totalPrice;
    }

    const sorted = Object.values(totals).sort((a, b) => b.total - a.total).slice(0, 20);

    // جلب بيانات كل مستخدم
    const vipThresholds = [1000, 5000, 20000, 50000, 100000, 250000, 500000];
    const enriched = await Promise.all(
      sorted.map(async (item) => {
        const u = await ctx.db.get("users", item.userId);
        // [moorawi-fix] prefer Cloudinary avatarUrl, fallback to legacy storage avatarId
        const avatarUrl = u?.avatarUrl ?? (u?.avatarId ? await ctx.storage.getUrl(u.avatarId) : null);
        const vip = vipThresholds.filter((x) => (u?.totalSent ?? 0) >= x).length;
        return {
          userId: item.userId as string,
          userNumber: u?.userNumber ?? null,
          name: u?.name ?? "ضيف",
          avatarUrl,
          vip,
          charmLevel: vipLevelFromTotalReceived(u?.totalReceived ?? 0),
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
    // ============ دعم الدفعات (batch): جلب كل الأهداف ============
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

// استعلام عام لجميع الغرف للاستماع للشريط الذهبي (≥ 30000)
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
      roomName: room?.name ?? "غرفة",
      fromName: recent.fromName,
      fromAvatar,
      toName: recent.toName,
      toAvatar,
      createdAt: recent._creationTime,
    };
  },
});
