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

