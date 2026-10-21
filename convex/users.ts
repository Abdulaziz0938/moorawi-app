import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
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

// [ezo-fix] تصحيح: إزالة admin من كل المستخدمين ما عدا المالك الحقيقي (userNumber = 1000)
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

// [ezo] تغيير ID المالك من 1000 إلى 1 (مرة واحدة)
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


// ═══════════════════════════════════════════════════════════
// [ezo-custom-id] تعيين ID مخصص للحساب والغرفة (من 1 إلى 99999)
// ═══════════════════════════════════════════════════════════
export const setCustomId = mutation({
  args: {
    userId: v.id("users"),
    newId: v.number(),
    tokenOverride: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    if (!me) throw new Error("UNAUTHORIZED");
    // التحقق من أن المستخدم أدمن أو أن هذا شراء من المتجر (يمكنك إضافة التحقق من الرصيد هنا لاحقاً)
    const isAdmin = me.adminRole === "super" || me.userNumber === 1;
    
    // التحقق من أن الرقم من 1 إلى 99999
    if (args.newId < 1 || args.newId > 99999999) {
      throw new Error("يجب أن يكون الرقم المخصص صحيحاً");
    }

    // التحقق من عدم استخدام الرقم مسبقاً
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_userNumber", (q) => q.eq("userNumber", args.newId))
      .first();
    if (existingUser && existingUser._id !== args.userId) {
      throw new Error("هذا الرقم مستخدم بالفعل");
    }

    // تحديث حساب المستخدم (الرقم والنص معاً لضمان التطابق في كل الواجهات)
    await ctx.db.patch("users", args.userId, { 
      userNumber: args.newId,
      uid: String(args.newId) 
    });

    // تحديث غرفة المستخدم (إن وجدت) لتطابق الأيدي
    const userRoom = await ctx.db
      .query("rooms")
      .withIndex("by_owner", (q) => q.eq("ownerId", args.userId))
      .first();
      
    if (userRoom) {
      await ctx.db.patch("rooms", userRoom._id, { roomNumber: args.newId });
    }

    return { ok: true };
  },
});


// ═══════════════════════════════════════════════════════════
// [ezo-migration] تحديث جميع أرقام الحسابات لتكون 6 خانات
// ═══════════════════════════════════════════════════════════
export const updateAllUserIdsToSixDigits = internalMutation({
  args: {},
  handler: async (ctx) => {
    const usersList = await ctx.db.query("users").collect();
    let updatedCount = 0;
    
    for (const user of usersList) {
      if (user.userNumber === undefined) continue;
      
      // استثناء المالك (1) والأدمن (10)
      if (user.userNumber === 1 || user.userNumber === 10) continue;
      
      // إذا كان الرقم أقل من 100000 (يعني ليس 6 خانات) وأكبر من أو يساوي 1000
      if (user.userNumber < 10000000 && user.userNumber >= 1000) {
        // نضيف 99000 ليصبح 1022 => 100022
        const newNum = user.userNumber + 99000;
        
        // التأكد أن الرقم الجديد غير مستخدم من قبل شخص آخر
        const existing = await ctx.db.query("users").withIndex("by_userNumber", q => q.eq("userNumber", newNum)).first();
        if (!existing) {
          await ctx.db.patch("users", user._id, {
            userNumber: newNum,
            uid: String(newNum)
          });
          
          // تحديث غرفة المستخدم إن وجدت
          const room = await ctx.db.query("rooms").withIndex("by_owner", q => q.eq("ownerId", user._id)).first();
          if (room) {
            await ctx.db.patch("rooms", room._id, {
              roomNumber: newNum
            });
          }
          updatedCount++;
        }
      }
    }
    return { updatedCount };
  },
});
