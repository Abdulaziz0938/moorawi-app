import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser } from "./lib/auth";

// (تم حذف generateGiftUploadUrl — نستخدم Cloudinary)

// ============ ADMIN: Create gift ============
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
    await ctx.db.patch("users", args.toUserId, {
      charms: (target.charms ?? 0) + args.quantity,
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

// ============ LEADERBOARD ============
export const roomLeaderboard = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    const txs = await ctx.db
      .query("giftTransactions")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .take(500);
    const totals: Record<string, { userId: string; name: string; total: number }> = {};
    for (const t of txs) {
      const key = t.toUserId;
      if (!totals[key]) totals[key] = { userId: key, name: t.toName, total: 0 };
      totals[key].total += t.totalPrice;
    }
    return Object.values(totals).sort((a, b) => b.total - a.total).slice(0, 10);
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
