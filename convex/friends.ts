// [ezo-friends] طلبات الصداقة
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser } from "./lib/auth";
import { activeVipLevel } from "./lib/vip";

// إرسال طلب صداقة
export const sendRequest = mutation({
  args: {
    targetUserId: v.id("users"),
    tokenOverride: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    if (me._id === args.targetUserId) throw new Error("لا يمكنك إرسال طلب لنفسك");

    const target = await ctx.db.get("users", args.targetUserId);
    if (!target) throw new Error("المستخدم غير موجود");

    // فحص وجود طلب معلق
    const existing = await ctx.db
      .query("friendRequests")
      .withIndex("by_pair", (q) => q.eq("fromUserId", me._id).eq("toUserId", args.targetUserId))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .first();
    if (existing) throw new Error("لديك طلب قيد الانتظار");

    // فحص إذا الهدف أرسل لي طلب سابقاً
    const reverse = await ctx.db
      .query("friendRequests")
      .withIndex("by_pair", (q) => q.eq("fromUserId", args.targetUserId).eq("toUserId", me._id))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .first();
    if (reverse) {
      // قبول تلقائي
      await ctx.db.patch("friendRequests", reverse._id, {
        status: "accepted",
        reviewedAt: Date.now(),
      });
      return { ok: true, autoAccepted: true };
    }

    await ctx.db.insert("friendRequests", {
      fromUserId: me._id,
      toUserId: args.targetUserId,
      status: "pending",
      createdAt: Date.now(),
    });

    return { ok: true };
  },
});

// قبول/رفض
export const review = mutation({
  args: {
    requestId: v.id("friendRequests"),
    accept: v.boolean(),
    tokenOverride: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    const req = await ctx.db.get("friendRequests", args.requestId);
    if (!req) throw new Error("الطلب غير موجود");
    if (req.toUserId !== me._id) throw new Error("غير مصرح");
    if (req.status !== "pending") throw new Error("تمت المراجعة مسبقاً");

    await ctx.db.patch("friendRequests", args.requestId, {
      status: args.accept ? "accepted" : "rejected",
      reviewedAt: Date.now(),
    });
    return { ok: true };
  },
});

// قائمة الأصدقاء (مقبولين من الجهتين)
export const listFriends = query({
  args: { tokenOverride: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    if (!me) return [];

    const asFrom = await ctx.db
      .query("friendRequests")
      .withIndex("by_from", (q) => q.eq("fromUserId", me._id).eq("status", "accepted"))
      .collect();
    const asTo = await ctx.db
      .query("friendRequests")
      .withIndex("by_to", (q) => q.eq("toUserId", me._id).eq("status", "accepted"))
      .collect();

    const all = [...asFrom, ...asTo];

    const enriched = await Promise.all(
      all.map(async (r) => {
        const otherId = r.fromUserId === me._id ? r.toUserId : r.fromUserId;
        const other = await ctx.db.get("users", otherId);
        if (!other) return null;
        return {
          _id: r._id,
          userId: otherId,
          name: other.name ?? "—",
          userNumber: other.userNumber ?? null,
          avatarUrl: other.avatarUrl ?? (other.avatarId ? await ctx.storage.getUrl(other.avatarId) : null),
          verified: other.verificationStatus === "approved",
          vip: activeVipLevel(other),
          since: r.reviewedAt ?? r.createdAt,
        };
      })
    );
    return enriched.filter(Boolean);
  },
});

// الطلبات المعلقة (الواردة)
export const pendingRequests = query({
  args: { tokenOverride: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    if (!me) return [];

    const reqs = await ctx.db
      .query("friendRequests")
      .withIndex("by_to", (q) => q.eq("toUserId", me._id).eq("status", "pending"))
      .collect();

    const enriched = await Promise.all(
      reqs.map(async (r) => {
        const from = await ctx.db.get("users", r.fromUserId);
        if (!from) return null;
        return {
          _id: r._id,
          userId: r.fromUserId,
          name: from.name ?? "—",
          userNumber: from.userNumber ?? null,
          avatarUrl: from.avatarUrl ?? (from.avatarId ? await ctx.storage.getUrl(from.avatarId) : null),
          verified: from.verificationStatus === "approved",
          vip: activeVipLevel(from),
          createdAt: r.createdAt,
        };
      })
    );
    return enriched.filter(Boolean);
  },
});

// هل هو صديقي؟
export const isFriend = query({
  args: {
    otherUserId: v.id("users"),
    tokenOverride: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    if (!me) return { status: "none" };

    const a = await ctx.db
      .query("friendRequests")
      .withIndex("by_pair", (q) => q.eq("fromUserId", me._id).eq("toUserId", args.otherUserId))
      .first();
    if (a?.status === "accepted") return { status: "friends" };
    if (a?.status === "pending") return { status: "sent" };

    const b = await ctx.db
      .query("friendRequests")
      .withIndex("by_pair", (q) => q.eq("fromUserId", args.otherUserId).eq("toUserId", me._id))
      .first();
    if (b?.status === "accepted") return { status: "friends" };
    if (b?.status === "pending") return { status: "received", requestId: b._id };

    return { status: "none" };
  },
});
