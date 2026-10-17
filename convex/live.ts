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
import { isRechargeAgent } from "./lib/agents";

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
  // [ezo-agents] وكلاء الشحن لا يمكنهم البث
  try {
    if (await isRechargeAgent(ctx, user._id)) {
      return { ok: false, reason: "حسابات وكلاء الشحن لا يمكنها البث المباشر" };
    }
  } catch (e) {
    console.warn("[canGoLive] isRechargeAgent failed:", e);
    // don't block if check fails
  }
    return { ok: false, reason: "حسابات وكلاء الشحن لا يمكنها البث المباشر" };
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
    const vipLevel = Number(activeVipLevel(me)) || 0;

    let id;
    try {
      id = await ctx.db.insert("liveStreams", {
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
    } catch (e: any) {
      throw new ConvexError({
        code: "INTERNAL",
        message: `فشل بدء البث: ${e?.message ?? String(e)}`,
      });
    }

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

    // جدولة تنظيف النتيجة بعد 8 ثوانٍ لضمان إغلاق المودال لدى الجميع
    await ctx.scheduler.runAfter(8000, internal.live.clearPKResult, {
      streamId: args.streamId,
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
    mode: v.optional(v.union(v.literal("casual"), v.literal("pk"))),
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
    const mode = args.mode ?? "pk";
    const isPK = mode === "pk";
    await ctx.db.insert("systemNotifications", {
      userId: args.coHostId,
      type: "system",
      title: isPK ? "دعوة منافسة PK" : "دعوة للجلوس",
      body: isPK
        ? `${me.name ?? "مذيعة"} تدعوك لمنافسة PK`
        : `${me.name ?? "مذيعة"} تدعوك للجلوس معها في بثها`,
      actionType: isPK ? "pk_invite" : "cohost_invite",
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
    // حفظ النتيجة النهائية متزامنة لكل المشاهدين والمذيعين
    const hostScore = stream.hostScore ?? 0;
    const coHostScore = stream.coHostScore ?? 0;
    const hostWon = hostScore > coHostScore;
    const isDraw = hostScore === coHostScore;

    const winnerId = isDraw ? null : (hostWon ? stream.hostId : (stream.coHostId ?? null));

    await ctx.db.patch("liveStreams", args.streamId, {
      pkActive: false,
      pkResult: {
        hostName: stream.hostName ?? "المضيف",
        hostAvatarUrl: stream.hostAvatarUrl,
        hostVipLevel: stream.hostVipLevel ?? 0,
        hostScore,
        coHostName: stream.coHostName ?? "الضيف",
        coHostAvatarUrl: stream.coHostAvatarUrl,
        coHostVipLevel: stream.coHostVipLevel ?? 0,
        coHostScore,
        winnerId,
        isDraw,
        endedAt: Date.now(),
      },
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

// ═══════════════════════════════════════════════════════════
// [ezo-live-gift] إرسال هدية في البث
// ═══════════════════════════════════════════════════════════
export const sendGiftToLive = mutation({
  args: {
    streamId: v.id("liveStreams"),
    giftId: v.id("gifts"),
    quantity: v.number(),
    toUserId: v.id("users"), // host أو co-host
    tokenOverride: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    if (!me) throw new ConvexError({ code: "UNAUTHORIZED" });

    const stream = await ctx.db.get("liveStreams", args.streamId);
    if (!stream || stream.status !== "live") {
      throw new ConvexError({ code: "NOT_FOUND", message: "البث غير متوفر" });
    }

    // التحقق أن المستلم هو host أو co-host
    if (
      args.toUserId !== stream.hostId &&
      args.toUserId !== stream.coHostId
    ) {
      throw new ConvexError({ code: "FORBIDDEN", message: "المستلم ليس مذيعاً" });
    }

    const gift = await ctx.db.get("gifts", args.giftId);
    if (!gift || !gift.active) {
      throw new ConvexError({ code: "NOT_FOUND", message: "الهدية غير متوفرة" });
    }

    const qty = Math.max(1, Math.min(args.quantity, 99));
    const total = gift.price * qty;
    const myCoins = me.coins ?? 0;
    if (myCoins < total) {
      throw new ConvexError({
        code: "INSUFFICIENT_BALANCE",
        message: `تحتاج ${total.toLocaleString()} عملة — رصيدك ${myCoins.toLocaleString()}`,
      });
    }

    const now = Date.now();

    // 1) خصم من المرسل
    await ctx.db.patch("users", me._id, {
      coins: myCoins - total,
      totalSent: (me.totalSent ?? 0) + total,
    });

    // 2) إضافة للمستلم
    const recipient = await ctx.db.get("users", args.toUserId);
    if (recipient) {
      await ctx.db.patch("users", args.toUserId, {
        charms: (recipient.charms ?? 0) + total,
        totalReceived: (recipient.totalReceived ?? 0) + total,
        diamonds: (recipient.diamonds ?? 0) + Math.floor(total * 0.7),
      });
    }

    // 3) تسجيل هدية البث
    await ctx.db.insert("liveGifts", {
      streamId: args.streamId,
      fromUserId: me._id,
      fromName: me.name ?? "ضيف",
      toUserId: args.toUserId,
      giftId: gift._id,
      giftName: gift.name,
      giftIcon: gift.mediaUrl ?? "",
      price: gift.price,
      quantity: qty,
      totalValue: total,
      isPK: stream.pkActive,
      createdAt: now,
    });

    // 4) تحديث إحصاءات البث
    const patch: any = {
      totalGiftValue: stream.totalGiftValue + total,
      updatedAt: now,
    };
    if (stream.pkActive && stream.coHostId) {
      if (args.toUserId === stream.hostId) {
        patch.hostScore = stream.hostScore + total;
      } else if (args.toUserId === stream.coHostId) {
        patch.coHostScore = stream.coHostScore + total;
      }
    }
    await ctx.db.patch("liveStreams", args.streamId, patch);

    return {
      ok: true,
      totalValue: total,
      remaining: myCoins - total,
    };
  },
});

// ═══════════════════════════════════════════════════════════
// [ezo-live] أحدث هدية — يبث تلقائياً لكل المشاهدين
// ═══════════════════════════════════════════════════════════
export const latestGift = query({
  args: { streamId: v.id("liveStreams") },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("liveGifts")
      .withIndex("by_stream_created", (q) => q.eq("streamId", args.streamId))
      .order("desc")
      .take(1);
    const recent = rows[0];
    if (!recent) return null;
    return {
      _id: recent._id,
      giftName: recent.giftName,
      giftIcon: recent.giftIcon,
      fromName: recent.fromName,
      fromUserId: recent.fromUserId,
      toUserId: recent.toUserId,
      price: recent.price,
      quantity: recent.quantity,
      totalValue: recent.totalValue,
      createdAt: recent.createdAt,
    };
  },
});

// دالة تنظيف نتائج الـ PK بعد انتهاء فترة العرض (8 ثوانٍ)
export const clearPKResult = internalMutation({
  args: { streamId: v.id("liveStreams") },
  handler: async (ctx, args) => {
    const stream = await ctx.db.get("liveStreams", args.streamId);
    if (!stream || !stream.pkResult) return;
    // مسح النتيجة فقط إذا مضى عليها أكثر من 6 ثوانٍ ولم تبدأ جولة جديدة
    if (!stream.pkActive && Date.now() - (stream.pkResult.endedAt || 0) >= 6000) {
      await ctx.db.patch("liveStreams", args.streamId, {
        pkResult: undefined,
        hostScore: 0,
        coHostScore: 0,
      });
    }
  },
});

// ═══════════════════════════════════════════════════════════
// [ezo-live-pk] إنهاء PK المنتهية تلقائياً — يُستدعى من cron
// ═══════════════════════════════════════════════════════════
export const autoEndExpiredPKs = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const streams = await ctx.db
      .query("liveStreams")
      .withIndex("by_status_started", (q) => q.eq("status", "live"))
      .collect();
    
    let ended = 0;
    for (const stream of streams) {
      if (!stream.pkActive) continue;
      if (!stream.pkStartedAt || !stream.pkDurationSec) continue;
      const endsAt = stream.pkStartedAt + stream.pkDurationSec * 1000;
      if (now < endsAt) continue;

      // الوقت انتهى → أنهِ PK + سجّل الفائز
      const hostWon = stream.hostScore >= stream.coHostScore;
      await ctx.db.patch("liveStreams", stream._id, {
        pkActive: false,
        pkStartedAt: undefined,
        pkDurationSec: undefined,
        updatedAt: now,
      });

      // احتفظ بالنتيجة في حقل مؤقت للإعلام
      await ctx.db.insert("systemNotifications", {
        userId: stream.hostId,
        type: "system",
        title: "انتهت PK",
        body: hostWon
          ? `فزتِ! ${stream.hostScore} - ${stream.coHostScore}`
          : `خسرتِ — ${stream.hostScore} - ${stream.coHostScore}`,
        createdAt: now,
      });
      if (stream.coHostId) {
        await ctx.db.insert("systemNotifications", {
          userId: stream.coHostId,
          type: "system",
          title: "انتهت PK",
          body: !hostWon
            ? `فزتِ! ${stream.coHostScore} - ${stream.hostScore}`
            : `خسرتِ — ${stream.coHostScore} - ${stream.hostScore}`,
          createdAt: now,
        });
      }

      ended += 1;
    }
    return { ended };
  },
});

// ═══════════════════════════════════════════════════════════
// [ezo-live-pk] قبول دعوة PK — تُستدعى من الضيفة
// ═══════════════════════════════════════════════════════════
export const acceptPK = mutation({
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
    if (stream.hostId === me._id) {
      throw new ConvexError({ code: "FORBIDDEN", message: "لا يمكنك قبول دعوتك" });
    }
    if (stream.coHostId) {
      throw new ConvexError({ code: "CONFLICT", message: "البث مشغول بالفعل" });
    }

    const notifs = await ctx.db
      .query("systemNotifications")
      .withIndex("by_user", (q) => q.eq("userId", me._id))
      .collect();
    const invite = notifs.find(
      (n: any) =>
        (n.actionType === "pk_invite" || n.actionType === "cohost_invite") &&
        String(n.actionPayload) === String(args.streamId) &&
        !n.readAt
    );
    if (!invite) {
      throw new ConvexError({ code: "FORBIDDEN", message: "لا توجد دعوة صالحة" });
    }

    const check = await canGoLive(ctx, me);
    if (!check.ok) {
      throw new ConvexError({ code: "FORBIDDEN", message: check.reason ?? "غير مؤهلة" });
    }

    const myStream = await ctx.db
      .query("liveStreams")
      .filter((q) =>
        q.and(q.eq(q.field("hostId"), me._id), q.eq(q.field("status"), "live"))
      )
      .first();
    if (myStream) {
      await ctx.db.patch("liveStreams", myStream._id, {
        status: "ended",
        updatedAt: Date.now(),
      });
    }

    const now = Date.now();
    const isPK = invite.actionType === "pk_invite";
    const duration = isPK ? 300 : 0;

    const patch: any = {
      coHostId: me._id,
      coHostName: me.name ?? "ضيفة",
      coHostAvatarUrl: me.avatarUrl,
      coHostVipLevel: activeVipLevel(me),
      updatedAt: now,
    };
    if (isPK) {
      patch.pkActive = true;
      patch.pkStartedAt = now;
      patch.pkDurationSec = duration;
      patch.hostScore = 0;
      patch.coHostScore = 0;
    } else {
      patch.pkActive = false;
      patch.pkStartedAt = undefined;
      patch.pkDurationSec = undefined;
    }
    await ctx.db.patch("liveStreams", args.streamId, patch);

    await ctx.db.patch("systemNotifications", invite._id, { readAt: now });

    return { ok: true, endAt: isPK ? now + duration * 1000 : 0 };
  },
});

// ═══════════════════════════════════════════════════════════
// [ezo-live-pk] رفض دعوة PK
// ═══════════════════════════════════════════════════════════
export const declinePK = mutation({
  args: {
    streamId: v.id("liveStreams"),
    tokenOverride: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    if (!me) throw new ConvexError({ code: "UNAUTHORIZED" });
    const notifs = await ctx.db
      .query("systemNotifications")
      .withIndex("by_user", (q) => q.eq("userId", me._id))
      .collect();
    const invite = notifs.find(
      (n: any) =>
        n.actionType === "pk_invite" &&
        String(n.actionPayload) === String(args.streamId) &&
        !n.readAt
    );
    if (invite) {
      await ctx.db.patch("systemNotifications", invite._id, { readAt: Date.now() });
    }
    return { ok: true };
  },
});

// ═══════════════════════════════════════════════════════════
// [ezo-live-binmo] إنهاء جلسة الجلوس العادي (بدون PK)
// ═══════════════════════════════════════════════════════════
export const endCoHost = mutation({
  args: {
    streamId: v.id("liveStreams"),
    tokenOverride: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    if (!me) throw new ConvexError({ code: "UNAUTHORIZED" });
    const stream = await ctx.db.get("liveStreams", args.streamId);
    if (!stream) throw new ConvexError({ code: "NOT_FOUND" });
    if (stream.hostId !== me._id && stream.coHostId !== me._id) {
      throw new ConvexError({ code: "FORBIDDEN" });
    }
    if (stream.pkActive) {
      throw new ConvexError({ code: "CONFLICT", message: "أنهِ PK أولاً" });
    }
    await ctx.db.patch("liveStreams", args.streamId, {
      coHostId: undefined,
      coHostName: undefined,
      coHostAvatarUrl: undefined,
      coHostVipLevel: undefined,
      updatedAt: Date.now(),
    });
    return { ok: true };
  },
});

// ═══════════════════════════════════════════════════════════
// [ezo-live-binmo] بدء PK أثناء جلوس عادي (coHost موجود)
// ═══════════════════════════════════════════════════════════
export const startPKFromCoHost = mutation({
  args: {
    streamId: v.id("liveStreams"),
    tokenOverride: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    if (!me) throw new ConvexError({ code: "UNAUTHORIZED" });
    const stream = await ctx.db.get("liveStreams", args.streamId);
    if (!stream) throw new ConvexError({ code: "NOT_FOUND" });
    if (stream.hostId !== me._id) throw new ConvexError({ code: "FORBIDDEN" });
    if (!stream.coHostId)
      throw new ConvexError({ code: "CONFLICT", message: "لا توجد ضيفة" });
    if (stream.pkActive)
      throw new ConvexError({ code: "CONFLICT", message: "PK نشط بالفعل" });
    const now = Date.now();
    await ctx.db.patch("liveStreams", args.streamId, {
      pkActive: true,
      pkStartedAt: now,
      pkDurationSec: 300,
      hostScore: 0,
      coHostScore: 0,
      updatedAt: now,
    });
    return { ok: true, endAt: now + 300 * 1000 };
  },
});
