// [ezo-messages] نظام الرسائل المباشرة
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser } from "./lib/auth";
import { activeVipLevel } from "./lib/vip";
import { levelFromValue } from "./lib/levels";

// ============================================================
// فتح/إيجاد محادثة بين مستخدمين
// ============================================================
async function getOrCreateConversation(ctx: any, a: any, b: any) {
  const [u1, u2] = a < b ? [a, b] : [b, a];

  let conv = await ctx.db
    .query("conversations")
    .withIndex("by_pair", (q: any) => q.eq("user1Id", u1).eq("user2Id", u2))
    .unique();

  if (!conv) {
    const now = Date.now();
    const id = await ctx.db.insert("conversations", {
      user1Id: u1,
      user2Id: u2,
      lastMessageAt: now,
      unread1: 0,
      unread2: 0,
    });
    conv = await ctx.db.get("conversations", id);
  }
  return conv;
}

// ============================================================
// فتح محادثة (للاستدعاء من MiniProfile)
// ============================================================
export const openWith = mutation({
  args: {
    otherUserId: v.id("users"),
    tokenOverride: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    if (me._id === args.otherUserId) throw new Error("لا يمكنك محادثة نفسك");
    const other = await ctx.db.get("users", args.otherUserId);
    if (!other) throw new Error("المستخدم غير موجود");

    const conv = await getOrCreateConversation(ctx, me._id, args.otherUserId);
    return { conversationId: conv._id };
  },
});

// ============================================================
// قائمة المحادثات
// ============================================================
export const listConversations = query({
  args: { tokenOverride: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    if (!me) return [];

    const asUser1 = await ctx.db
      .query("conversations")
      .withIndex("by_user1", (q) => q.eq("user1Id", me._id))
      .collect();
    const asUser2 = await ctx.db
      .query("conversations")
      .withIndex("by_user2", (q) => q.eq("user2Id", me._id))
      .collect();

    const all = [...asUser1, ...asUser2].sort((a, b) => b.lastMessageAt - a.lastMessageAt);

    const enriched = await Promise.all(
      all.map(async (c) => {
        const otherId = c.user1Id === me._id ? c.user2Id : c.user1Id;
        const other = await ctx.db.get("users", otherId);
        if (!other) return null;

        const unread = c.user1Id === me._id ? c.unread1 : c.unread2;

        return {
          _id: c._id,
          otherUserId: otherId,
          otherName: other.name ?? "—",
          otherUserNumber: other.userNumber ?? null,
          otherAvatar: other.avatarUrl ?? (other.avatarId ? await ctx.storage.getUrl(other.avatarId) : null),
          otherVerified: other.verificationStatus === "approved",
          otherVip: activeVipLevel(other),
          lastMessageAt: c.lastMessageAt,
          lastMessageText: c.lastMessageText ?? "",
          lastMessageFromMe: c.lastMessageFrom === me._id,
          unread,
        };
      })
    );
    return enriched.filter(Boolean);
  },
});

// ============================================================
// قراءة رسائل محادثة
// ============================================================
export const getThread = query({
  args: {
    conversationId: v.id("conversations"),
    tokenOverride: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    if (!me) return null;

    const conv = await ctx.db.get("conversations", args.conversationId);
    if (!conv) return null;
    if (conv.user1Id !== me._id && conv.user2Id !== me._id) throw new Error("غير مصرح");

    const otherId = conv.user1Id === me._id ? conv.user2Id : conv.user1Id;
    const other = await ctx.db.get("users", otherId);

    const messages = await ctx.db
      .query("directMessages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .order("asc")
      .take(200);

    return {
      other: other ? {
        userId: otherId,
        name: other.name ?? "—",
        userNumber: other.userNumber ?? null,
        avatarUrl: other.avatarUrl ?? (other.avatarId ? await ctx.storage.getUrl(other.avatarId) : null),
        verified: other.verificationStatus === "approved",
        vip: activeVipLevel(other),
      } : null,
      messages: messages.map((m) => ({
        _id: m._id,
        fromMe: m.fromUserId === me._id,
        text: m.text,
        imageUrl: m.imageUrl,
        createdAt: m.createdAt,
      })),
    };
  },
});

// ============================================================
// إرسال رسالة
// ============================================================
export const send = mutation({
  args: {
    conversationId: v.id("conversations"),
    text: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    tokenOverride: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    if (!me) throw new Error("غير مصرح");

    const conv = await ctx.db.get("conversations", args.conversationId);
    if (!conv) throw new Error("المحادثة غير موجودة");
    if (conv.user1Id !== me._id && conv.user2Id !== me._id) throw new Error("غير مصرح");

    const text = args.text?.trim() || undefined;
    if (!text && !args.imageUrl) throw new Error("الرسالة فارغة");

    const otherId = conv.user1Id === me._id ? conv.user2Id : conv.user1Id;
    const now = Date.now();

    await ctx.db.insert("directMessages", {
      conversationId: args.conversationId,
      fromUserId: me._id,
      toUserId: otherId,
      text,
      imageUrl: args.imageUrl,
      createdAt: now,
    });

    // تحديث المحادثة
    const isUser1 = conv.user1Id === me._id;
    await ctx.db.patch("conversations", args.conversationId, {
      lastMessageAt: now,
      lastMessageText: text ?? "📷 صورة",
      lastMessageFrom: me._id,
      unread1: isUser1 ? conv.unread1 : conv.unread1 + 1,
      unread2: isUser1 ? conv.unread2 + 1 : conv.unread2,
    });

    return { ok: true };
  },
});

// ============================================================
// تعليم مقروء
// ============================================================
export const markRead = mutation({
  args: {
    conversationId: v.id("conversations"),
    tokenOverride: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    if (!me) return { ok: false };

    const conv = await ctx.db.get("conversations", args.conversationId);
    if (!conv) return { ok: false };

    const isUser1 = conv.user1Id === me._id;
    await ctx.db.patch("conversations", args.conversationId, {
      unread1: isUser1 ? 0 : conv.unread1,
      unread2: isUser1 ? conv.unread2 : 0,
    });

    const unread = await ctx.db
      .query("directMessages")
      .withIndex("by_to_unread", (q) => q.eq("toUserId", me._id).eq("readAt", undefined))
      .collect();
    for (const m of unread) {
      if (m.conversationId === args.conversationId) {
        await ctx.db.patch("directMessages", m._id, { readAt: Date.now() });
      }
    }
    return { ok: true };
  },
});

// ============================================================
// عدد الرسائل غير المقروءة (Badge)
// ============================================================
export const unreadCount = query({
  args: { tokenOverride: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    if (!me) return 0;

    const unreadMsgs = await ctx.db
      .query("directMessages")
      .withIndex("by_to_unread", (q) => q.eq("toUserId", me._id).eq("readAt", undefined))
      .collect();
    const unreadNotifs = await ctx.db
      .query("systemNotifications")
      .withIndex("by_user_unread", (q) => q.eq("userId", me._id).eq("readAt", undefined))
      .collect();
    const pendingFriends = await ctx.db
      .query("friendRequests")
      .withIndex("by_to", (q) => q.eq("toUserId", me._id).eq("status", "pending"))
      .collect();

    return unreadMsgs.length + unreadNotifs.length + pendingFriends.length;
  },
});
