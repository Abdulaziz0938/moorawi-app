// [moorawi-verification] نظام المصادقة — كاميرا + مراجعة
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser, isFullAdmin } from "./lib/auth";

// Public — إرسال طلب مصادقة
export const submit = mutation({
  args: {
    imageUrl: v.string(),
    tokenOverride: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    if (!me) throw new Error("غير مصرح");
    if (me.verificationStatus === "approved") throw new Error("حسابك موثق بالفعل");
    if (me.verificationStatus === "pending") throw new Error("لديك طلب قيد المراجعة");

    // فحص وجود طلب معلق
    const existing = await ctx.db
      .query("verificationRequests")
      .withIndex("by_user", (q) => q.eq("userId", me._id))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .first();
    if (existing) throw new Error("لديك طلب قيد المراجعة");

    const id = await ctx.db.insert("verificationRequests", {
      userId: me._id,
      imageUrl: args.imageUrl,
      status: "pending",
      submittedAt: Date.now(),
    });

    await ctx.db.patch("users", me._id, {
      verificationStatus: "pending",
    });

    return { ok: true, requestId: id };
  },
});

// Admin — قائمة الطلبات المعلقة
export const listPending = query({
  args: { tokenOverride: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    if (!isFullAdmin(me)) throw new Error("غير مصرح");

    const reqs = await ctx.db
      .query("verificationRequests")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();

    const enriched = await Promise.all(
      reqs.map(async (r) => {
        const u = await ctx.db.get("users", r.userId);
        return {
          ...r,
          userName: u?.name ?? "—",
          userNumber: u?.userNumber ?? null,
          userAvatar: u?.avatarUrl ?? null,
        };
      })
    );
    return enriched;
  },
});

// Admin — موافقة/رفض
export const review = mutation({
  args: {
    requestId: v.id("verificationRequests"),
    approve: v.boolean(),
    reason: v.optional(v.string()),
    tokenOverride: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    if (!isFullAdmin(me)) throw new Error("غير مصرح");

    const req = await ctx.db.get("verificationRequests", args.requestId);
    if (!req) throw new Error("الطلب غير موجود");

    await ctx.db.patch("verificationRequests", args.requestId, {
      status: args.approve ? "approved" : "rejected",
      reviewedAt: Date.now(),
      reviewedBy: me._id,
      reason: args.reason,
    });

    await ctx.db.patch("users", req.userId, {
      verificationStatus: args.approve ? "approved" : "rejected",
    });

    return { ok: true, approved: args.approve };
  },
});
