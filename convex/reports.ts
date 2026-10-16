// [ezo-reports] نظام الإبلاغ عن المستخدمين
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser, isFullAdmin } from "./lib/auth";

const REPORT_REASONS = [
  "تحرش / مضايقة",
  "محتوى غير لائق",
  "انتحال شخصية",
  "إعلانات / سبام",
  "أخرى",
];

// ═══════════════════════════════════════════════════════════
// Public — إرسال إبلاغ
// ═══════════════════════════════════════════════════════════
export const submit = mutation({
  args: {
    targetUserId: v.id("users"),
    reason: v.string(),
    details: v.optional(v.string()),
    context: v.optional(v.string()),
    roomId: v.optional(v.id("rooms")),
    messageId: v.optional(v.id("messages")),
    tokenOverride: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    if (String(me._id) === String(args.targetUserId)) {
      throw new Error("لا يمكنك الإبلاغ عن نفسك");
    }
    const reason = args.reason.trim();
    if (!reason) throw new Error("اختر سبباً");
    if (!REPORT_REASONS.includes(reason)) {
      // اقبل لكن سجّل
    }

    const target = await ctx.db.get("users", args.targetUserId);
    if (!target) throw new Error("المستخدم غير موجود");

    // حد: إبلاغ واحد كل 5 دقائق لنفس الشخص
    const recent = await ctx.db
      .query("reports")
      .withIndex("by_reporter_and_createdAt", (q) => q.eq("reporterId", me._id))
      .order("desc")
      .take(20);
    const recentlyReported = recent.find(
      (r) =>
        String(r.targetUserId) === String(args.targetUserId) &&
        Date.now() - r.createdAt < 5 * 60 * 1000
    );
    if (recentlyReported) {
      throw new Error("أبلغت عن هذا المستخدم منذ قليل — انتظر قبل المحاولة مرة أخرى");
    }

    await ctx.db.insert("reports", {
      reporterId: me._id,
      reporterName: me.name ?? "ضيف",
      targetUserId: args.targetUserId,
      targetName: target.name ?? "ضيف",
      targetUserNumber: target.userNumber,
      reason,
      details: args.details?.trim() || undefined,
      context: args.context,
      roomId: args.roomId,
      messageId: args.messageId,
      status: "pending",
      createdAt: Date.now(),
    });
    return { ok: true };
  },
});

// ═══════════════════════════════════════════════════════════
// Public — إبلاغاتي السابقة
// ═══════════════════════════════════════════════════════════
export const mySubmitted = query({
  args: { tokenOverride: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    return await ctx.db
      .query("reports")
      .withIndex("by_reporter_and_createdAt", (q) => q.eq("reporterId", me._id))
      .order("desc")
      .take(30);
  },
});

// ═══════════════════════════════════════════════════════════
// Admin — عدد المعلّقة
// ═══════════════════════════════════════════════════════════
export const countPending = query({
  args: { tokenOverride: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    if (!isFullAdmin(me)) return 0;
    const rows = await ctx.db
      .query("reports")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();
    return rows.length;
  },
});

// ═══════════════════════════════════════════════════════════
// Admin — قائمة حسب الحالة
// ═══════════════════════════════════════════════════════════
export const listByStatus = query({
  args: {
    status: v.optional(v.union(
      v.literal("pending"),
      v.literal("reviewed"),
      v.literal("dismissed"),
      v.literal("actioned"),
    )),
    limit: v.optional(v.number()),
    tokenOverride: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    if (!isFullAdmin(me)) return [];
    const status = args.status ?? "pending";
    const limit = Math.min(args.limit ?? 100, 200);
    return await ctx.db
      .query("reports")
      .withIndex("by_status", (q) => q.eq("status", status))
      .order("desc")
      .take(limit);
  },
});

// ═══════════════════════════════════════════════════════════
// Admin — مراجعة إبلاغ
// ═══════════════════════════════════════════════════════════
export const review = mutation({
  args: {
    reportId: v.id("reports"),
    action: v.union(v.literal("dismissed"), v.literal("actioned"), v.literal("reviewed")),
    adminNote: v.optional(v.string()),
    banTarget: v.optional(v.boolean()),
    tokenOverride: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    if (!isFullAdmin(me)) throw new Error("غير مصرح");
    const report = await ctx.db.get("reports", args.reportId);
    if (!report) throw new Error("التقرير غير موجود");

    if (args.banTarget) {
      await ctx.db.patch("users", report.targetUserId, { banned: true });
    }

    await ctx.db.patch("reports", args.reportId, {
      status: args.action,
      adminId: me._id,
      adminNote: args.adminNote?.trim() || undefined,
      reviewedAt: Date.now(),
    });
    return { ok: true };
  },
});
