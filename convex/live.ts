// [ezo-live] البث المباشر — TikTok-style
import { ConvexError, v } from "convex/values";
import {
  mutation,
  query,
  action,
  internalMutation,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { requireUser } from "./lib/auth";
import { activeVipLevel } from "./lib/vip";

// ═══════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════

// هل المستخدم مؤهل للبث؟ (أنثى + موثقة)
async function canGoLive(
  ctx: any,
  user: any
): Promise<{ ok: boolean; reason?: string }> {
  if (!user) return { ok: false, reason: "غير مصرح" };
  if (user.banned) return { ok: false, reason: "حسابك محظور" };
  if (user.gender !== "female")
    return { ok: false, reason: "البث المباشر متاح للإناث فقط" };
  if (user.verificationStatus !== "approved")
    return { ok: false, reason: "يجب توثيق حسابك للبث المباشر" };
  return { ok: true };
}

// ═══════════════════════════════════════════════════════════
// Queries
// ═══════════════════════════════════════════════════════════

// قائمة البث المباشر النشط
export const listLive = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit ?? 50, 100);
    const rows = await ctx.db
      .query("liveStreams")
      .withIndex("by_status_started", (q) => q.eq("status", "live"))
      .order("desc")
      .take(limit);
    return rows;
  },
});

// جلب حالة بث واحد
export const getStream = query({
  args: { streamId: v.id("liveStreams") },
  handler: async (ctx, args) => {
    return await ctx.db.get("liveStreams", args.streamId);
  },
});

// البث النشط الخاص بمستخدم معين
export const myLive = query({
  args: { tokenOverride: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    if (!me) return null;
    const rows = await ctx.db
      .query("liveStreams")
      .withIndex("by_host_status", (q) =>
        q.eq("hostId", me._id).eq("status", "live")
      )
      .collect();
    return rows[0] ?? null;
  },
});

// تعليقات البث
export const listComments = query({
  args: {
    streamId: v.id("liveStreams"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit ?? 50, 100);
    const rows = await ctx.db
      .query("liveComments")
      .withIndex("by_stream_created", (q) =>
        q.eq("streamId", args.streamId)
      )
      .order("desc")
      .take(limit);
    return rows.reverse();
  },
});

// هدايا البث
export const listGifts = query({
  args: {
    streamId: v.id("liveStreams"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit ?? 30, 100);
    return await ctx.db
      .query("liveGifts")
      .withIndex("by_stream_created", (q) =>
        q.eq("streamId", args.streamId)
      )
      .order("desc")
      .take(limit);
  },
});

// ═══════════════════════════════════════════════════════════
// Mutations — Host side
// ═══════════════════════════════════════════════════════════

// بدء بث مباشر
export const createStream = mutation({
  args: {
    title: v.string(),
    coverUrl: v.optional(v.string()),
    tokenOverride: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    const check = await canGoLive(ctx, me);
    if (!check.ok) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: check.reason ?? "غير مصرح",
      });
    }

    // هل لدي بث نشط؟
    const active = await ctx.db
      .query("liveStreams")
      .withIndex("by_host_status", (q) =>
        q.eq("hostId", me!._id).eq("status", "live")
      )
      .first();
    if (active) {
      throw new ConvexError({
        code: "CONFLICT",
        message: "لديك بث مباشر نشط بالفعل",
      });
    }

    const now = Date.now();
    const channelName = `live_${me!._id}_${now}`;
    const vipLevel = activeVipLevel(me);

    const id = await ctx.db.insert("liveStreams", {
      hostId: me!._id,
      hostName: me!.name ?? "مذيعة",
      hostAvatarUrl: me!.avatarUrl,
      hostVipLevel: vipLevel,

      pkActive: false,
      hostScore: 0,
      coHostScore: 0,

      channelName,
      title: args.title.trim().slice(0, 60) || "بث مباشر",
      coverUrl: args.coverUrl,
      status: "live",

      viewerCount: 0,
      peakViewers: 0,
      totalLikes: 0,
      totalGiftValue: 0,

      startedAt: now,
      updatedAt: now,
    });

    return { ok: true, streamId: id, channelName };
  },
});

// إنهاء البث
export const endStream = mutation({
  args: {
    streamId: v.id("liveStreams"),
    tokenOverride: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    if (!me) throw new ConvexError({ code: "UNAUTHORIZED" });
    const stream = await ctx.db.get("liveStreams", args.streamId);
    if (!stream) throw new ConvexError({ code: "NOT_FOUND" });
    if (stream.hostId !== me._id) {
      throw new ConvexError({ code: "FORBIDDEN" });
    }
    await ctx.db.patch("liveStreams", args.streamId, {
      status: "ended",
      endedAt: Date.now(),
      updatedAt: Date.now(),
    });
    return { ok: true };
  },
});

// ═══════════════════════════════════════════════════════════
// Mutations — Viewer side
// ═══════════════════════════════════════════════════════════

// انضمام مشاهد
export const joinAsViewer = mutation({
  args: {
    streamId: v.id("liveStreams"),
    tokenOverride: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    if (!me) throw new ConvexError({ code: "UNAUTHORIZED" });
    const stream = await ctx.db.get("liveStreams", args.streamId);
    if (!stream || stream.status !== "live") {
      throw new ConvexError({ code: "NOT_FOUND", message: "البث غير متوفر" });
    }
    const newCount = stream.viewerCount + 1;
    await ctx.db.patch("liveStreams", args.streamId, {
      viewerCount: newCount,
      peakViewers: Math.max(stream.peakViewers, newCount),
      updatedAt: Date.now(),
    });
    return { ok: true };
  },
});

// مغادرة مشاهد
export const leaveViewer = mutation({
  args: {
    streamId: v.id("liveStreams"),
    tokenOverride: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    if (!me) return { ok: false };
    const stream = await ctx.db.get("liveStreams", args.streamId);
    if (!stream) return { ok: false };
    await ctx.db.patch("liveStreams", args.streamId, {
      viewerCount: Math.max(0, stream.viewerCount - 1),
      updatedAt: Date.now(),
    });
    return { ok: true };
  },
});

// إرسال تعليق
export const sendComment = mutation({
  args: {
    streamId: v.id("liveStreams"),
    text: v.string(),
    tokenOverride: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    if (!me) throw new ConvexError({ code: "UNAUTHORIZED" });
    const text = args.text.trim().slice(0, 200);
    if (!text) throw new ConvexError({ code: "BAD_REQUEST" });
    const vipLevel = activeVipLevel(me);
    await ctx.db.insert("liveComments", {
      streamId: args.streamId,
      userId: me._id,
      userName: me.name ?? "ضيف",
      userAvatarUrl: me.avatarUrl,
      userVipLevel: vipLevel,
      text,
      createdAt: Date.now(),
    });
    return { ok: true };
  },
});

// إرسال قلوب (double-tap)
export const sendLikes = mutation({
  args: {
    streamId: v.id("liveStreams"),
    count: v.number(),
    tokenOverride: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    if (!me) throw new ConvexError({ code: "UNAUTHORIZED" });
    const stream = await ctx.db.get("liveStreams", args.streamId);
    if (!stream) throw new ConvexError({ code: "NOT_FOUND" });
    const add = Math.min(Math.max(1, args.count), 50);
    await ctx.db.patch("liveStreams", args.streamId, {
      totalLikes: stream.totalLikes + add,
      updatedAt: Date.now(),
    });
    return { ok: true };
  },
});

// ═══════════════════════════════════════════════════════════
// PK — منافسة بين مذيعتين
// ═══════════════════════════════════════════════════════════

// دعوة للمنافسة (تُرسل من المضيف الحالي لمذيعة أخرى)
export const invitePK = mutation({
  args: {
    streamId: v.id("liveStreams"),
    coHostId: v.id("users"),
    tokenOverride: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    if (!me) throw new ConvexError({ code: "UNAUTHORIZED" });
    const stream = await ctx.db.get("liveStreams", args.streamId);
    if (!stream || stream.hostId !== me._id) {
      throw new ConvexError({ code: "FORBIDDEN" });
    }
    const coHost = await ctx.db.get("users", args.coHostId);
    const check = await canGoLive(ctx, coHost);
    if (!check.ok) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: check.reason ?? "المذيعة غير مؤهلة",
      });
    }
    // ملاحظة: التكامل الحقيقي يحتاج قناة إشعارات أو قبول فوري
    // هنا نضعها كدعوة معطّلة حتى يقبل الطرف الآخر
    await ctx.db.insert("systemNotifications", {
      userId: args.coHostId,
      type: "system",
      title: "دعوة PK",
      body: `${me.name ?? "مذيعة"} تدعوك لمنافسة PK`,
      actionType: "pk_invite",
      actionPayload: stream._id,
      createdAt: Date.now(),
    });
    return { ok: true };
  },
});

// قبول PK + بدء العد
export const startPK = mutation({
  args: {
    streamId: v.id("liveStreams"),
    coHostId: v.id("users"),
    durationSec: v.optional(v.number()),
    tokenOverride: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    if (!me) throw new ConvexError({ code: "UNAUTHORIZED" });
    const stream = await ctx.db.get("liveStreams", args.streamId);
    if (!stream) throw new ConvexError({ code: "NOT_FOUND" });
    // إما المضيف أو الضيفة يبدأ
    if (stream.hostId !== me._id && args.coHostId !== me._id) {
      throw new ConvexError({ code: "FORBIDDEN" });
    }
    const coHost = await ctx.db.get("users", args.coHostId);
    const check = await canGoLive(ctx, coHost);
    if (!check.ok) throw new ConvexError({ code: "FORBIDDEN" });

    const now = Date.now();
    const duration = Math.min(
      Math.max(60, args.durationSec ?? 300),
      900
    );

    await ctx.db.patch("liveStreams", args.streamId, {
      coHostId: args.coHostId,
      coHostName: coHost!.name ?? "ضيفة",
      coHostAvatarUrl: coHost!.avatarUrl,
      coHostVipLevel: activeVipLevel(coHost),
      pkActive: true,
      pkStartedAt: now,
      pkDurationSec: duration,
      hostScore: 0,
      coHostScore: 0,
      updatedAt: now,
    });
    return { ok: true, endAt: now + duration * 1000 };
  },
});

// إنهاء PK
export const endPK = mutation({
  args: {
    streamId: v.id("liveStreams"),
    tokenOverride: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    if (!me) throw new ConvexError({ code: "UNAUTHORIZED" });
    const stream = await ctx.db.get("liveStreams", args.streamId);
    if (!stream) throw new ConvexError({ code: "NOT_FOUND" });
    if (
      stream.hostId !== me._id &&
      stream.coHostId !== me._id
    ) {
      throw new ConvexError({ code: "FORBIDDEN" });
    }
    await ctx.db.patch("liveStreams", args.streamId, {
      pkActive: false,
      coHostId: undefined,
      coHostName: undefined,
      coHostAvatarUrl: undefined,
      coHostVipLevel: undefined,
      pkStartedAt: undefined,
      pkDurationSec: undefined,
      updatedAt: Date.now(),
    });
    return { ok: true };
  },
});

// ═══════════════════════════════════════════════════════════
// Hooks — يُستدعى من gift sending
// ═══════════════════════════════════════════════════════════

// تحديث إحصاءات البث عند إرسال هدية
export const onGiftReceived = internalMutation({
  args: {
    streamId: v.id("liveStreams"),
    toUserId: v.id("users"),
    value: v.number(),
  },
  handler: async (ctx, args) => {
    const stream = await ctx.db.get("liveStreams", args.streamId);
    if (!stream) return;
    const patch: any = {
      totalGiftValue: stream.totalGiftValue + args.value,
      updatedAt: Date.now(),
    };
    if (stream.pkActive && stream.coHostId) {
      if (args.toUserId === stream.hostId) {
        patch.hostScore = stream.hostScore + args.value;
      } else if (args.toUserId === stream.coHostId) {
        patch.coHostScore = stream.coHostScore + args.value;
      }
    }
    await ctx.db.patch("liveStreams", args.streamId, patch);
  },
});

// ═══════════════════════════════════════════════════════════
// إنهاء أي بث نشط للمستخدم الحالي
// ═══════════════════════════════════════════════════════════
export const endMyActiveStream = mutation({
  args: { tokenOverride: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    if (!me) throw new ConvexError({ code: "UNAUTHORIZED" });
    const rows = await ctx.db
      .query("liveStreams")
      .withIndex("by_host_status", (q) =>
        q.eq("hostId", me._id).eq("status", "live")
      )
      .collect();
    for (const r of rows) {
      await ctx.db.patch("liveStreams", r._id, {
        status: "ended",
        endedAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
    return { ok: true, ended: rows.length };
  },
});
