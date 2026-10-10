import { mutation, query, internalMutation } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { requireUser } from "./lib/auth";
import { randomHex, hashPassword } from "./auth";

// ============================================================
// [moorawi-admin] Admin Panel — للمالك فقط (adminRole === "super")
// ============================================================

async function requireSuperAdmin(ctx: any, tokenOverride?: string) {
  const me = await requireUser(ctx, tokenOverride);
  if (me.adminRole !== "super" && me.userNumber !== 1) {
    throw new ConvexError({ code: "FORBIDDEN", message: "صلاحيات المالك مطلوبة" });
  }
  return me;
}

// ============================================================
// Queries
// ============================================================

// List users (paginated, searchable)
export const listUsers = query({
  args: {
    tokenOverride: v.optional(v.string()),
    search: v.optional(v.string()),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx, args.tokenOverride);
    const limit = Math.min(args.limit ?? 30, 100);
    const offset = args.offset ?? 0;

    const search = args.search?.trim().toLowerCase() ?? "";

    let allUsers;
    if (search) {
      // Search by username or userNumber
      if (/^\d+$/.test(search)) {
        const byNum = await ctx.db
          .query("users")
          .withIndex("by_userNumber", (q) => q.eq("userNumber", parseInt(search, 10)))
          .unique();
        allUsers = byNum ? [byNum] : [];
      } else {
        const byName = await ctx.db
          .query("users")
          .withIndex("by_username", (q) => q.eq("username", search))
          .unique();
        allUsers = byName ? [byName] : [];
      }
    } else {
      allUsers = await ctx.db.query("users").order("desc").take(500);
    }

    const total = allUsers.length;
    const slice = allUsers.slice(offset, offset + limit);

    // Enrich with minimal display data
    const enriched = slice.map((u) => ({
      _id: u._id,
      userNumber: u.userNumber ?? null,
      username: u.username ?? null,
      name: u.name ?? null,
      avatarUrl: u.avatarUrl ?? null,
      coins: u.coins ?? 0,
      diamonds: u.diamonds ?? 0,
      totalSent: u.totalSent ?? 0,
      totalReceived: u.totalReceived ?? 0,
      adminRole: u.adminRole ?? null,
      banned: u.banned ?? false,
      vipLevel: u.vipLevel ?? 0,
      verified: u.verificationStatus === "approved",
      createdAt: u._creationTime,
    }));

    return { users: enriched, total, offset, limit };
  },
});

// Stats
export const stats = query({
  args: { tokenOverride: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx, args.tokenOverride);
    const users = await ctx.db.query("users").collect();
    const rooms = await ctx.db.query("rooms").collect();
    const shopItems = await ctx.db.query("shopItems").collect();
    const tx = await ctx.db.query("walletTransactions").order("desc").take(200);

    let totalCoins = 0;
    let totalDiamonds = 0;
    let bannedCount = 0;
    for (const u of users) {
      totalCoins += u.coins ?? 0;
      totalDiamonds += u.diamonds ?? 0;
      if (u.banned) bannedCount++;
    }

    return {
      usersCount: users.length,
      roomsCount: rooms.length,
      shopItemsCount: shopItems.length,
      bannedCount,
      totalCoins,
      totalDiamonds,
      recentTxCount: tx.length,
    };
  },
});

// ============================================================
// Mutations
// ============================================================

// Update user (coins, diamonds, vipManual, adminRole, banned)
export const updateUser = mutation({
  args: {
    tokenOverride: v.optional(v.string()),
    userId: v.id("users"),
    coins: v.optional(v.number()),
    diamonds: v.optional(v.number()),
    vipLevel: v.optional(v.number()),
    adminRole: v.optional(v.union(v.literal("super"), v.literal("moderator"), v.null())),
    banned: v.optional(v.boolean()),
    verified: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const me = await requireSuperAdmin(ctx, args.tokenOverride);
    const target = await ctx.db.get("users", args.userId);
    if (!target) throw new ConvexError({ code: "NOT_FOUND", message: "المستخدم غير موجود" });

    // Prevent modifying self's adminRole
    if (target._id === me._id && args.adminRole !== undefined && args.adminRole !== "super") {
      throw new ConvexError({ code: "FORBIDDEN", message: "لا يمكنك إزالة صلاحياتك" });
    }

    const patch: any = {};
    if (args.coins !== undefined) patch.coins = args.coins;
    if (args.diamonds !== undefined) patch.diamonds = args.diamonds;
    if (args.vipLevel !== undefined) patch.vipLevel = args.vipLevel;
    if (args.adminRole !== undefined) {
      patch.adminRole = args.adminRole === null ? undefined : args.adminRole;
      patch.isAdmin = args.adminRole !== null;
    }
    if (args.banned !== undefined) patch.banned = args.banned;
    if (args.verified !== undefined) {
      patch.verificationStatus = args.verified ? "approved" : "none";
    }

    // Log coin/diamond changes to wallet
    if (args.coins !== undefined && args.coins !== target.coins) {
      const diff = args.coins - (target.coins ?? 0);
      await ctx.db.insert("walletTransactions", {
        userId: target._id,
        type: "admin_grant",
        amount: diff,
        balanceAfter: args.coins,
        meta: `تعديل بواسطة الإدارة`,
        createdAt: Date.now(),
      });
    }

    await ctx.db.patch("users", args.userId, patch);

    // Audit log
    await ctx.db.insert("auditLogs", {
      adminId: me._id,
      adminName: me.name ?? me.username ?? "المالك",
      action: "updateUser",
      target: `user:${target.userNumber} (${target.username})`,
    });

    return { ok: true };
  },
});

// Add coins to user (quick action)
export const grantCoins = mutation({
  args: {
    tokenOverride: v.optional(v.string()),
    userId: v.id("users"),
    amount: v.number(),
  },
  handler: async (ctx, args) => {
    const me = await requireSuperAdmin(ctx, args.tokenOverride);
    const target = await ctx.db.get("users", args.userId);
    if (!target) throw new ConvexError({ code: "NOT_FOUND", message: "المستخدم غير موجود" });
    if (args.amount === 0) throw new ConvexError({ code: "BAD_REQUEST", message: "المبلغ صفر" });

    const newCoins = (target.coins ?? 0) + args.amount;
    await ctx.db.patch("users", args.userId, { coins: newCoins });

    await ctx.db.insert("walletTransactions", {
      userId: target._id,
      type: "admin_grant",
      amount: args.amount,
      balanceAfter: newCoins,
      meta: `منح بواسطة الإدارة`,
      createdAt: Date.now(),
    });

    await ctx.db.insert("auditLogs", {
      adminId: me._id,
      adminName: me.name ?? me.username ?? "المالك",
      action: "grantCoins",
      target: `+${args.amount.toLocaleString()} → user:${target.userNumber}`,
    });

    return { ok: true, newCoins };
  },
});

// Update shop item (image, price, active)
export const updateShopItem = mutation({
  args: {
    tokenOverride: v.optional(v.string()),
    itemId: v.id("shopItems"),
    // [moorawi-9patch] chat bubble slice
    sliceTop: v.optional(v.number()),
    sliceRight: v.optional(v.number()),
    sliceBottom: v.optional(v.number()),
    sliceLeft: v.optional(v.number()),
    imageUrl: v.optional(v.string()),
    previewUrl: v.optional(v.string()),
    price: v.optional(v.number()),
    active: v.optional(v.boolean()),
    isHot: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const me = await requireSuperAdmin(ctx, args.tokenOverride);
    const item = await ctx.db.get("shopItems", args.itemId);
    if (!item) throw new ConvexError({ code: "NOT_FOUND", message: "المنتج غير موجود" });

    const patch: any = {};
    if (args.imageUrl !== undefined) patch.imageUrl = args.imageUrl;
    if (args.previewUrl !== undefined) patch.previewUrl = args.previewUrl;
    if (args.price !== undefined) patch.price = args.price;
    if (args.active !== undefined) patch.active = args.active;
    if (args.isHot !== undefined) patch.isHot = args.isHot;
    // [moorawi-9patch] chat bubble slices
    if (args.sliceTop !== undefined) patch.sliceTop = args.sliceTop;
    if (args.sliceRight !== undefined) patch.sliceRight = args.sliceRight;
    if (args.sliceBottom !== undefined) patch.sliceBottom = args.sliceBottom;
    if (args.sliceLeft !== undefined) patch.sliceLeft = args.sliceLeft;

    await ctx.db.patch("shopItems", args.itemId, patch);

    await ctx.db.insert("auditLogs", {
      adminId: me._id,
      adminName: me.name ?? me.username ?? "المالك",
      action: "updateShopItem",
      target: `item:${item.name}`,
    });

    return { ok: true };
  },
});

// List all shop items (for admin)
export const listShopItems = query({
  args: {
    tokenOverride: v.optional(v.string()),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx, args.tokenOverride);
    let items;
    if (args.category) {
      items = await ctx.db
        .query("shopItems")
        .withIndex("by_category_active", (q) => q.eq("category", args.category as any))
        .collect();
      // Also inactive (withIndex may filter only active — use collect with filter)
      const all = await ctx.db.query("shopItems").collect();
      items = all.filter((i) => i.category === args.category);
    } else {
      items = await ctx.db.query("shopItems").collect();
    }
    return items;
  },
});

// ============================================================
// [moorawi-admin] createStaffUser — internal, run via CLI
// npx convex run adminPanel:createStaffUser '{"...":"..."}' --prod
// ============================================================
export const createStaffUser = internalMutation({
  args: {
    username: v.string(),
    password: v.string(),
    userNumber: v.number(),
    adminRole: v.union(v.literal("super"), v.literal("moderator")),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const username = args.username.trim().toLowerCase();
    if (username.length < 3) throw new ConvexError({ code: "BAD_USERNAME", message: "اسم قصير" });
    if (args.password.length < 8) throw new ConvexError({ code: "BAD_PASSWORD", message: "كلمة المرور قصيرة" });

    // تأكد أن username غير محجوز
    const existing = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", username))
      .unique();
    if (existing) throw new ConvexError({ code: "TAKEN", message: "اسم المستخدم محجوز" });

    // تأكد أن userNumber غير محجوز
    const byNum = await ctx.db
      .query("users")
      .withIndex("by_userNumber", (q) => q.eq("userNumber", args.userNumber))
      .unique();
    if (byNum) throw new ConvexError({ code: "NUM_TAKEN", message: "الرقم محجوز" });

    const salt = randomHex(16);
    const passwordHash = await hashPassword(args.password, salt);
    const token = "sess-" + randomHex(24);
    const now = Date.now();

    const id = await ctx.db.insert("users", {
      tokenIdentifier: token,
      userNumber: args.userNumber,
      username,
      name: args.name ?? username,
      passwordHash,
      passwordSalt: salt,
      authProvider: "password",
      adminRole: args.adminRole,
      isAdmin: true,
      profileComplete: true,
      lastLoginAt: now,
      coins: 0,
      diamonds: 0,
      totalSent: 0,
      totalReceived: 0,
      charms: 0,
    });

    return { ok: true, userId: id, username, userNumber: args.userNumber, adminRole: args.adminRole };
  },
});
