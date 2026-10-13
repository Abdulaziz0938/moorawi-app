// [ezo-gifts] سجل الهدايا — مُرسَلة + مُستلمة مع تفاصيل كاملة
//
// يُظهر لكل معاملة:
//   - الهدية: صورة + اسم + كمية
//   - السعر: للوحدة + الإجمالي
//   - الطرف الآخر: اسم + معرّف + صورة
//   - الغرفة: اسم (اختياري)
//   - التاريخ: _creationTime

import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireUser } from "./lib/auth";

// ============================================================
// mySentGifts — هداياي المُرسَلة (بترتيب زمني معكوس)
// ============================================================
export const mySentGifts = query({
  args: {
    limit: v.optional(v.number()),
    tokenOverride: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    const limit = Math.min(args.limit ?? 50, 200);

    const txs = await ctx.db
      .query("giftTransactions")
      .withIndex("by_from", (q) => q.eq("fromUserId", me._id))
      .order("desc")
      .take(limit);

    return await Promise.all(
      txs.map(async (t) => {
        const gift = await ctx.db.get("gifts", t.giftId);
        const toUser = await ctx.db.get("users", t.toUserId);
        const room = await ctx.db.get("rooms", t.roomId);

        const unitPrice = t.quantity > 0 ? Math.floor(t.totalPrice / t.quantity) : 0;

        return {
          _id: t._id,
          _creationTime: t._creationTime,
          giftId: t.giftId,
          giftName: t.giftName,
          giftIcon: t.giftIcon,
          giftImageUrl: gift?.mediaUrl ?? null,
          quantity: t.quantity,
          unitPrice,
          totalPrice: t.totalPrice,
          otherUserId: t.toUserId,
          otherName: toUser?.name ?? t.toName ?? "ضيف",
          otherUserNumber: toUser?.userNumber ?? null,
          otherAvatarUrl:
            toUser?.avatarUrl ??
            (toUser?.avatarId ? await ctx.storage.getUrl(toUser.avatarId) : null),
          roomId: t.roomId,
          roomName: room?.name ?? null,
        };
      })
    );
  },
});

// ============================================================
// myReceivedGifts — هداياي المُستلَمة
// ============================================================
export const myReceivedGifts = query({
  args: {
    limit: v.optional(v.number()),
    tokenOverride: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    const limit = Math.min(args.limit ?? 50, 200);

    const txs = await ctx.db
      .query("giftTransactions")
      .withIndex("by_to", (q) => q.eq("toUserId", me._id))
      .order("desc")
      .take(limit);

    return await Promise.all(
      txs.map(async (t) => {
        const gift = await ctx.db.get("gifts", t.giftId);
        const fromUser = await ctx.db.get("users", t.fromUserId);
        const room = await ctx.db.get("rooms", t.roomId);

        const unitPrice = t.quantity > 0 ? Math.floor(t.totalPrice / t.quantity) : 0;

        return {
          _id: t._id,
          _creationTime: t._creationTime,
          giftId: t.giftId,
          giftName: t.giftName,
          giftIcon: t.giftIcon,
          giftImageUrl: gift?.mediaUrl ?? null,
          quantity: t.quantity,
          unitPrice,
          totalPrice: t.totalPrice,
          otherUserId: t.fromUserId,
          otherName: fromUser?.name ?? t.fromName ?? "ضيف",
          otherUserNumber: fromUser?.userNumber ?? null,
          otherAvatarUrl:
            fromUser?.avatarUrl ??
            (fromUser?.avatarId ? await ctx.storage.getUrl(fromUser.avatarId) : null),
          roomId: t.roomId,
          roomName: room?.name ?? null,
        };
      })
    );
  },
});

// ============================================================
// summary — إجماليات (للـ header)
// ============================================================
export const summary = query({
  args: { tokenOverride: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);

    const sent = await ctx.db
      .query("giftTransactions")
      .withIndex("by_from", (q) => q.eq("fromUserId", me._id))
      .take(1000);

    const received = await ctx.db
      .query("giftTransactions")
      .withIndex("by_to", (q) => q.eq("toUserId", me._id))
      .take(1000);

    let sentTotal = 0;
    let sentCount = 0;
    for (const t of sent) {
      sentTotal += t.totalPrice;
      sentCount += t.quantity;
    }

    let receivedTotal = 0;
    let receivedCount = 0;
    for (const t of received) {
      receivedTotal += t.totalPrice;
      receivedCount += t.quantity;
    }

    return {
      sent: { total: sentTotal, count: sentCount, transactions: sent.length },
      received: { total: receivedTotal, count: receivedCount, transactions: received.length },
    };
  },
});
