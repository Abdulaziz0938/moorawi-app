import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser } from "./lib/auth";

// Returns the current user's profile info (for display)
export const me = query({
  args: { tokenOverride: v.optional(v.string()) },
  handler: async (ctx, args) => {
    try {
      const user = await requireUser(ctx, args.tokenOverride);
      return {
        _id: user._id,
        userNumber: user.userNumber ?? null,
        name: user.name ?? "ضيف",
        bio: user.bio ?? null,
        isAdmin: user.isAdmin ?? false,
      };
    } catch {
      return null;
    }
  },
});

// Update the user's display name
export const updateName = mutation({
  args: { name: v.string(), tokenOverride: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.tokenOverride);
    const name = args.name.trim();
    if (name.length < 2 || name.length > 30) {
      throw new Error("الاسم يجب أن يكون بين 2 و 30 حرفاً");
    }
    await ctx.db.patch("users", user._id, { name });
    return null;
  },
});

// [moorawi-fix] تصحيح: إزالة admin من كل المستخدمين ما عدا المالك الحقيقي (userNumber = 1000)
export const fixAllAdmins = mutation({
  args: { tokenOverride: v.optional(v.string()) },
  handler: async (ctx) => {
    const all = await ctx.db.query("users").take(500);
    let fixed = 0;
    for (const u of all) {
      // نُبقي admin للمالك الأصلي (userNumber = 1000)
      const isRealOwner = u.userNumber === 1000;
      if (!isRealOwner && (u.isAdmin === true || u.adminRole !== undefined)) {
        await ctx.db.patch("users", u._id, {
          isAdmin: false,
          adminRole: undefined,
        });
        fixed++;
      }
    }
    return { total: all.length, fixed };
  },
});

// [moorawi] تغيير ID المالك من 1000 إلى 1 (مرة واحدة)
export const changeOwnerId = mutation({
  args: {},
  handler: async (ctx) => {
    const hero = await ctx.db
      .query("users")
      .withIndex("by_userNumber", (q) => q.eq("userNumber", 1000))
      .unique();
    if (!hero) return { ok: false, message: "المالك (1000) غير موجود" };

    await ctx.db.patch("users", hero._id, {
      userNumber: 1,
      isAdmin: true,
      adminRole: "super",
    });
    return { ok: true, userId: hero._id, newNumber: 1 };
  },
});

// ═══════════════════════════════════════════════════════════
// [ezo-uid] البحث بالـ UID (مستخدم + غرفته)
// ═══════════════════════════════════════════════════════════
export const searchByUid = query({
  args: { uid: v.string() },
  handler: async (ctx, args) => {
    const uid = args.uid.trim();
    if (!uid) return null;
    const user = await ctx.db
      .query("users")
      .withIndex("by_uid", (q) => q.eq("uid", uid))
      .unique();
    if (!user) return null;
    return {
      userId: user._id,
      uid: user.uid ?? null,
      userNumber: user.userNumber ?? null,
      name: user.name ?? null,
      username: user.username ?? null,
      avatarUrl: user.avatarUrl ?? null,
      gender: user.gender ?? null,
      country: user.country ?? null,
      bio: user.bio ?? null,
      vipLevel: (user as any).vipLevel ?? 0,
      banned: user.banned ?? false,
    };
  },
});

// بحث حر: اسم أو UID أو username (يعيد أول 20)
export const search = query({
  args: { q: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const q = args.q.trim().toLowerCase();
    if (q.length < 2) return [];
    const limit = Math.min(args.limit ?? 20, 50);
    const all = await ctx.db.query("users").take(2000);
    const hits = all.filter((u) => {
      const uid = (u.uid ?? "").toLowerCase();
      const name = (u.name ?? "").toLowerCase();
      const uname = (u.username ?? "").toLowerCase();
      return uid.includes(q) || name.includes(q) || uname.includes(q);
    }).slice(0, limit);
    return hits.map((u) => ({
      userId: u._id,
      uid: u.uid ?? null,
      userNumber: u.userNumber ?? null,
      name: u.name ?? null,
      username: u.username ?? null,
      avatarUrl: u.avatarUrl ?? null,
      gender: u.gender ?? null,
      vipLevel: (u as any).vipLevel ?? 0,
    }));
  },
});
