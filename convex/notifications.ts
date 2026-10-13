// [ezo-notifications] رسائل النظام من Ezo
import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { requireUser, isFullAdmin } from "./lib/auth";


// [ezo-types] Notification type union (matches schema)
const notifTypeValidator = v.union(
  v.literal("welcome"),
  v.literal("announcement"),
  v.literal("host_invite"),
  v.literal("reward"),
  v.literal("verification"),
  v.literal("agency"),
  v.literal("system"),
);


// Public — قائمة إشعاراتي
export const listMine = query({
  args: { tokenOverride: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    if (!me) return [];

    const rows = await ctx.db
      .query("systemNotifications")
      .withIndex("by_user", (q) => q.eq("userId", me._id))
      .order("desc")
      .take(50);

    return rows;
  },
});

// Public — عدد غير المقروء
export const unreadCount = query({
  args: { tokenOverride: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    if (!me) return 0;
    const unread = await ctx.db
      .query("systemNotifications")
      .withIndex("by_user_unread", (q) => q.eq("userId", me._id).eq("readAt", undefined))
      .collect();
    return unread.length;
  },
});

// Public — تعليم مقروء
export const markRead = mutation({
  args: {
    notificationId: v.optional(v.id("systemNotifications")),
    markAll: v.optional(v.boolean()),
    tokenOverride: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    if (!me) return { ok: false };

    const now = Date.now();
    if (args.markAll) {
      const unread = await ctx.db
        .query("systemNotifications")
        .withIndex("by_user_unread", (q) => q.eq("userId", me._id).eq("readAt", undefined))
        .collect();
      for (const n of unread) await ctx.db.patch("systemNotifications", n._id, { readAt: now });
      return { ok: true, count: unread.length };
    }

    if (!args.notificationId) return { ok: false };
    await ctx.db.patch("systemNotifications", args.notificationId, { readAt: now });
    return { ok: true };
  },
});

// Helper — إرسال إشعار (يُستخدم من backend آخر)
export async function pushNotification(
  ctx: any,
  userId: any,
  type: string,
  title: string,
  body: string,
  actionType?: string,
  actionPayload?: string,
  iconUrl?: string
) {
  await ctx.db.insert("systemNotifications", {
    userId,
    type,
    title,
    body,
    actionType,
    actionPayload,
    iconUrl,
    createdAt: Date.now(),
  });
}

// Admin — إرسال إشعار لمستخدم محدد
export const sendTo = mutation({
  args: {
    userId: v.id("users"),
    type: v.optional(notifTypeValidator),
    title: v.string(),
    body: v.string(),
    actionType: v.optional(v.string()),
    actionPayload: v.optional(v.string()),
    iconUrl: v.optional(v.string()),
    tokenOverride: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    if (!isFullAdmin(me)) throw new Error("غير مصرح");

    const id = await ctx.db.insert("systemNotifications", {
      userId: args.userId,
      type: args.type ?? "system",
      title: args.title,
      body: args.body,
      actionType: args.actionType,
      actionPayload: args.actionPayload,
      iconUrl: args.iconUrl,
      createdAt: Date.now(),
    });
    return { ok: true, id };
  },
});

// Admin — إرسال إشعار جماعي
export const sendToAll = mutation({
  args: {
    type: v.optional(notifTypeValidator),
    title: v.string(),
    body: v.string(),
    actionType: v.optional(v.string()),
    actionPayload: v.optional(v.string()),
    iconUrl: v.optional(v.string()),
    tokenOverride: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    if (!isFullAdmin(me)) throw new Error("غير مصرح");

    const users = await ctx.db.query("users").collect();
    const now = Date.now();
    let sent = 0;
    for (const u of users) {
      await ctx.db.insert("systemNotifications", {
        userId: u._id,
        type: args.type ?? "announcement",
        title: args.title,
        body: args.body,
        actionType: args.actionType,
        actionPayload: args.actionPayload,
        iconUrl: args.iconUrl,
        createdAt: now,
      });
      sent++;
    }
    return { ok: true, sent };
  },
});

// Internal — إشعار ترحيب عند التسجيل
export const welcomeUser = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await ctx.db.insert("systemNotifications", {
      userId: args.userId,
      type: "welcome",
      title: "أهلاً بك في Ezo",
      body: "مرحباً بك! استكشف الغرف، اجمع الأصدقاء، واحصل على مكافآت يومية.",
      actionType: "open_rooms",
      createdAt: Date.now(),
    });
    return { ok: true };
  },
});
