// [ezo-moments] نظام اللحظات
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser } from "./lib/auth";
import { activeVipLevel } from "./lib/vip";

// ============================================================
// إنشاء منشور
// ============================================================
export const create = mutation({
  args: {
    text: v.optional(v.string()),
    imageUrls: v.array(v.string()),
    visibility: v.optional(v.union(v.literal("public"), v.literal("friends"))),
    tokenOverride: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    if (!me) throw new Error("غير مصرح");

    const text = args.text?.trim() || undefined;
    if (!text && args.imageUrls.length === 0) throw new Error("المنشور فارغ");
    if (args.imageUrls.length > 9) throw new Error("بحد أقصى 9 صور");

    const id = await ctx.db.insert("moments", {
      userId: me._id,
      text,
      imageUrls: args.imageUrls,
      likeCount: 0,
      commentCount: 0,
      visibility: args.visibility ?? "public",
      createdAt: Date.now(),
    });
    return { ok: true, momentId: id };
  },
});

// ============================================================
// حذف منشور (المالك فقط)
// ============================================================
export const remove = mutation({
  args: {
    momentId: v.id("moments"),
    tokenOverride: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    const m = await ctx.db.get("moments", args.momentId);
    if (!m) throw new Error("غير موجود");
    if (m.userId !== me._id) throw new Error("غير مصرح");
    await ctx.db.delete("moments", args.momentId);
    return { ok: true };
  },
});

// ============================================================
// قائمة اللحظات العامة (Feed)
// ============================================================
export const feed = query({
  args: {
    limit: v.optional(v.number()),
    userId: v.optional(v.id("users")),
    tokenOverride: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    const limit = Math.min(args.limit ?? 30, 50);

    let raw;
    if (args.userId) {
      raw = await ctx.db
        .query("moments")
        .withIndex("by_user", (q) => q.eq("userId", args.userId!))
        .order("desc")
        .take(limit);
    } else {
      raw = await ctx.db
        .query("moments")
        .withIndex("by_created")
        .order("desc")
        .take(limit);
    }

    // filter public + my own
    const filtered = raw.filter((m) => m.visibility === "public" || m.userId === me?._id);

    const enriched = await Promise.all(
      filtered.map(async (m) => {
        const author = await ctx.db.get("users", m.userId);
        // هل أنا معجب؟
        let liked = false;
        if (me) {
          const l = await ctx.db
            .query("momentLikes")
            .withIndex("by_user_and_moment", (q) => q.eq("userId", me._id).eq("momentId", m._id))
            .first();
          liked = !!l;
        }

        return {
          _id: m._id,
          userId: m.userId,
          text: m.text,
          imageUrls: m.imageUrls,
          likeCount: m.likeCount,
          commentCount: m.commentCount,
          createdAt: m.createdAt,
          isMine: m.userId === me?._id,
          liked,
          author: author ? {
            name: author.name ?? "—",
            userNumber: author.userNumber ?? null,
            avatarUrl: author.avatarUrl ?? (author.avatarId ? await ctx.storage.getUrl(author.avatarId) : null),
            verified: author.verificationStatus === "approved",
            vip: activeVipLevel(author),
          } : null,
        };
      })
    );
    return enriched;
  },
});

// ============================================================
// منشور واحد
// ============================================================
export const getById = query({
  args: { momentId: v.id("moments"), tokenOverride: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const m = await ctx.db.get("moments", args.momentId);
    if (!m) return null;
    const author = await ctx.db.get("users", m.userId);
    const comments = await ctx.db
      .query("momentComments")
      .withIndex("by_moment", (q) => q.eq("momentId", args.momentId))
      .order("asc")
      .take(100);

    const enrichedComments = await Promise.all(
      comments.map(async (c) => {
        const u = await ctx.db.get("users", c.userId);
        return {
          _id: c._id,
          text: c.text,
          createdAt: c.createdAt,
          author: u ? {
            userId: c.userId,
            name: u.name ?? "—",
            userNumber: u.userNumber ?? null,
            avatarUrl: u.avatarUrl ?? (u.avatarId ? await ctx.storage.getUrl(u.avatarId) : null),
            verified: u.verificationStatus === "approved",
          } : null,
        };
      })
    );

    return {
      ...m,
      author: author ? {
        userId: m.userId,
        name: author.name ?? "—",
        userNumber: author.userNumber ?? null,
        avatarUrl: author.avatarUrl ?? (author.avatarId ? await ctx.storage.getUrl(author.avatarId) : null),
        verified: author.verificationStatus === "approved",
        vip: activeVipLevel(author),
      } : null,
      comments: enrichedComments,
    };
  },
});

// ============================================================
// إعجاب toggle
// ============================================================
export const toggleLike = mutation({
  args: { momentId: v.id("moments"), tokenOverride: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    const m = await ctx.db.get("moments", args.momentId);
    if (!m) throw new Error("غير موجود");

    const existing = await ctx.db
      .query("momentLikes")
      .withIndex("by_user_and_moment", (q) => q.eq("userId", me._id).eq("momentId", args.momentId))
      .first();

    if (existing) {
      await ctx.db.delete("momentLikes", existing._id);
      await ctx.db.patch("moments", args.momentId, {
        likeCount: Math.max(0, m.likeCount - 1),
      });
      return { ok: true, liked: false };
    }

    await ctx.db.insert("momentLikes", {
      momentId: args.momentId,
      userId: me._id,
      createdAt: Date.now(),
    });
    await ctx.db.patch("moments", args.momentId, {
      likeCount: m.likeCount + 1,
    });

    // [ezo-notifications] إشعار لصاحب المنشور (إن لم يكن نفسه)
    if (m.userId !== me._id) {
      await ctx.db.insert("systemNotifications", {
        userId: m.userId,
        type: "system",
        title: "إعجاب جديد ❤️",
        body: `${me.name ?? "مستخدم"} أعجب بمنشورك`,
        actionType: "open_moment",
        actionPayload: args.momentId as string,
        createdAt: Date.now(),
      });
    }

    return { ok: true, liked: true };
  },
});

// ============================================================
// إضافة تعليق
// ============================================================
export const addComment = mutation({
  args: {
    momentId: v.id("moments"),
    text: v.string(),
    tokenOverride: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    const m = await ctx.db.get("moments", args.momentId);
    if (!m) throw new Error("غير موجود");

    const text = args.text.trim();
    if (text.length < 1) throw new Error("التعليق فارغ");

    await ctx.db.insert("momentComments", {
      momentId: args.momentId,
      userId: me._id,
      text,
      createdAt: Date.now(),
    });

    await ctx.db.patch("moments", args.momentId, {
      commentCount: m.commentCount + 1,
    });

    // [ezo-notifications] إشعار لصاحب المنشور
    if (m.userId !== me._id) {
      await ctx.db.insert("systemNotifications", {
        userId: m.userId,
        type: "system",
        title: "تعليق جديد 💬",
        body: `${me.name ?? "مستخدم"}: ${text.slice(0, 80)}`,
        actionType: "open_moment",
        actionPayload: args.momentId as string,
        createdAt: Date.now(),
      });
    }

    return { ok: true };
  },
});

// ============================================================
// عدد اللحظات (Badge)
// ============================================================
export const countMine = query({
  args: { tokenOverride: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    if (!me) return 0;
    const all = await ctx.db
      .query("moments")
      .withIndex("by_user", (q) => q.eq("userId", me._id))
      .collect();
    return all.length;
  },
});
