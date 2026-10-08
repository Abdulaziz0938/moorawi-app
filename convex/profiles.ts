import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser } from "./lib/auth";
import { vipLevelFromTotalReceived } from "./lib/vip";

const COUNTRIES = [
  "سوريا", "مصر", "السعودية", "الإمارات", "الأردن", "لبنان", "العراق",
  "فلسطين", "الكويت", "قطر", "البحرين", "عمان", "اليمن", "المغرب",
  "الجزائر", "تونس", "ليبيا", "السودان", "موريتانيا", "الصومال", "جيبوتي",
  "دولة أخرى",
];

const INTERESTS = [
  "موسيقى", "رياضة", "سفر", "تقنية", "فنون", "ألعاب", "أفلام",
  "قراءة", "طبخ", "تصوير", "تصميم", "برمجة", "ريادة أعمال",
  "رياضيات", "لغات", "سيارات", "موضة", "صحة", "تعليم", "تاريخ",
];

// Get the current user's full profile
export const me = query({
  args: { tokenOverride: v.optional(v.string()) },
  handler: async (ctx, args) => {
    try {
      const user = await requireUser(ctx, args.tokenOverride);
      const avatarUrl = user.avatarUrl ?? (user.avatarId ? await ctx.storage.getUrl(user.avatarId) : null);
      return {
        _id: user._id,
        userNumber: user.userNumber ?? null,
        username: user.username ?? null,
        name: user.name ?? null,
        avatarUrl,
        age: user.age ?? null,
        gender: user.gender ?? null,
        country: user.country ?? null,
        interests: user.interests ?? [],
        bio: user.bio ?? null,
        profileComplete: user.profileComplete ?? false,
        isAdmin: user.isAdmin ?? false,
        adminRole: user.adminRole ?? null,
      };
    } catch {
      return null;
    }
  },
});

// [moorawi] Get public profile of any user by ID
export const getById = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const u = await ctx.db.get("users", args.userId);
    if (!u) return null;

    const avatarUrl = u.avatarUrl ?? (u.avatarId ? await ctx.storage.getUrl(u.avatarId) : null);

    // VIP level based on totalSent (7 tiers)
    const vipThresholds = [1000, 5000, 20000, 50000, 100000, 250000, 500000];
    const vip = vipThresholds.filter((x) => (u.totalSent ?? 0) >= x).length;

    return {
      _id: u._id,
      userNumber: u.userNumber ?? null,
      username: u.username ?? null,
      name: u.name ?? "ضيف",
      avatarUrl,
      age: u.age ?? null,
      gender: u.gender ?? null,
      country: u.country ?? null,
      interests: u.interests ?? [],
      bio: u.bio ?? null,
      profileComplete: u.profileComplete ?? false,
      charms: u.charms ?? 0,
      totalSent: u.totalSent ?? 0,
      totalReceived: u.totalReceived ?? 0,
      vip,
      charmLevel: vipLevelFromTotalReceived(u.totalReceived ?? 0),
      isAdmin: u.isAdmin ?? false,
      adminRole: u.adminRole ?? null,
      banned: u.banned ?? false,
    };
  },
});

// Check if a username is available
export const isUsernameAvailable = query({
  args: { username: v.string() },
  handler: async (ctx, args) => {
    const clean = args.username.trim().toLowerCase();
    if (clean.length < 3) return { available: false, reason: "الاسم قصير جداً" };
    if (!/^[a-z0-9_]+$/.test(clean)) {
      return { available: false, reason: "فقط أحرف إنجليزية وأرقام و _" };
    }
    const existing = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", clean))
      .unique();
    return { available: !existing, reason: existing ? "الاسم محجوز" : "متاح" };
  },
});

// Generate upload URL for avatar
// (تم حذف generateAvatarUploadUrl — نستخدم Cloudinary)

// Save the avatar after upload
export const saveAvatar = mutation({
  args: {
    avatarUrl: v.string(),
    tokenOverride: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.tokenOverride);
    await ctx.db.patch("users", user._id, { avatarUrl: args.avatarUrl });
    return args.avatarUrl;
  },
});

// Complete the profile setup
export const completeProfile = mutation({
  args: {
    name: v.string(),
    username: v.string(),
    age: v.number(),
    gender: v.union(v.literal("male"), v.literal("female"), v.literal("other")),
    country: v.string(),
    interests: v.array(v.string()),
    bio: v.optional(v.string()),
    tokenOverride: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.tokenOverride);
    const name = args.name.trim();
    const username = args.username.trim().toLowerCase();

    if (name.length < 2 || name.length > 30) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "الاسم يجب أن يكون بين 2 و 30 حرفاً" });
    }
    if (username.length < 3 || username.length > 20) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "اسم المستخدم يجب أن يكون بين 3 و 20 حرفاً" });
    }
    if (!/^[a-z0-9_]+$/.test(username)) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "اسم المستخدم يحتوي على رموز غير مسموحة" });
    }
    if (args.age < 13 || args.age > 100) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "العمر يجب أن يكون بين 13 و 100" });
    }
    if (args.interests.length < 3) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "اختر 3 اهتمامات على الأقل" });
    }

    // Check username uniqueness (excluding current user)
    const existing = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", username))
      .unique();
    if (existing && existing._id !== user._id) {
      throw new ConvexError({ code: "CONFLICT", message: "اسم المستخدم محجوز، اختر غيره" });
    }

    await ctx.db.patch("users", user._id, {
      name,
      username,
      age: args.age,
      gender: args.gender,
      country: args.country,
      interests: args.interests,
      bio: args.bio?.trim() || undefined,
      profileComplete: true,
    });
    return null;
  },
});

// Get all available options (for the UI)
export const getOptions = query({
  args: {},
  handler: async () => {
    return { countries: COUNTRIES, interests: INTERESTS };
  },
});

// [moorawi] حذف صورة الأفاتار
export const removeAvatar = mutation({
  args: { tokenOverride: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.tokenOverride);
    await ctx.db.patch("users", user._id, {
      avatarUrl: undefined,
      avatarId: undefined,
    });
    return null;
  },
});

