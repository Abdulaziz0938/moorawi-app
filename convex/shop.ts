import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { requireUser } from "./lib/auth";

// ============================================================
// [moorawi-shop] Shop queries + mutations
// ============================================================

const CATEGORIES = [
  "frame", "vehicle", "entryEffect", "chatBubble",
  "soundWave", "profileCard", "decoration", "vipId", "skin",
] as const;

type Category = typeof CATEGORIES[number];

// ============================================================
// Queries
// ============================================================

// List items by category (only active)
export const listByCategory = query({
  args: {
    category: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit ?? 50, 100);
    return await ctx.db
      .query("shopItems")
      .withIndex("by_category_active", (q) =>
        q.eq("category", args.category as any).eq("active", true),
      )
      .order("asc")
      .take(limit);
  },
});

// Get single item
export const itemById = query({
  args: { itemId: v.id("shopItems") },
  handler: async (ctx, args) => {
    return await ctx.db.get("shopItems", args.itemId);
  },
});

// My inventory
export const myInventory = query({
  args: {
    tokenOverride: v.optional(v.string()),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!args.tokenOverride) return [];
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", args.tokenOverride!))
      .unique();
    if (!user) return [];

    if (args.category) {
      return await ctx.db
        .query("userInventory")
        .withIndex("by_user_and_category", (q) =>
          q.eq("userId", user._id).eq("category", args.category!),
        )
        .collect();
    }
    return await ctx.db
      .query("userInventory")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
  },
});

// Check if user owns item
export const ownsItem = query({
  args: {
    tokenOverride: v.optional(v.string()),
    itemId: v.id("shopItems"),
  },
  handler: async (ctx, args) => {
    if (!args.tokenOverride) return false;
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", args.tokenOverride!))
      .unique();
    if (!user) return false;
    const inv = await ctx.db
      .query("userInventory")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    return inv.some((i) => i.itemId === args.itemId);
  },
});

// ============================================================
// Mutations
// ============================================================

// Buy item (deduct coins + add to inventory)
export const buyItem = mutation({
  args: {
    itemId: v.id("shopItems"),
    tokenOverride: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.tokenOverride);
    const item = await ctx.db.get("shopItems", args.itemId);
    if (!item) throw new ConvexError({ code: "NOT_FOUND", message: "المنتج غير موجود" });
    if (!item.active) throw new ConvexError({ code: "INACTIVE", message: "المنتج غير متوفر" });

    // Check balance
    const balance = user.coins ?? 0;
    if (balance < item.price) {
      throw new ConvexError({
        code: "INSUFFICIENT_BALANCE",
        message: `رصيدك ${balance.toLocaleString()} — تحتاج ${item.price.toLocaleString()}`,
      });
    }

    // Check if already owns (only if permanent — no durationDays)
    if (!item.durationDays) {
      const inv = await ctx.db
        .query("userInventory")
        .withIndex("by_user_and_category", (q) =>
          q.eq("userId", user._id).eq("category", item.category),
        )
        .collect();
      if (inv.some((i) => i.itemId === item._id)) {
        throw new ConvexError({ code: "ALREADY_OWNED", message: "تملك هذا المنتج" });
      }
    }

    // Deduct coins
    const newBalance = balance - item.price;
    await ctx.db.patch("users", user._id, { coins: newBalance });

    // Record transaction
    await ctx.db.insert("walletTransactions", {
      userId: user._id,
      type: "purchase",
      amount: -item.price,
      balanceAfter: newBalance,
      meta: `شراء ${item.name}`,
      createdAt: Date.now(),
    });

    // Add to inventory
    const expiresAt = item.durationDays
      ? Date.now() + item.durationDays * 24 * 60 * 60 * 1000
      : undefined;

    const invId = await ctx.db.insert("userInventory", {
      userId: user._id,
      itemId: item._id,
      category: item.category,
      acquiredAt: Date.now(),
      expiresAt,
      isEquipped: false,
      purchaseType: "buy",
    });

    return { ok: true, inventoryId: invId, newBalance };
  },
});

// Send item to another user
export const sendItem = mutation({
  args: {
    itemId: v.id("shopItems"),
    toUserId: v.id("users"),
    tokenOverride: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const sender = await requireUser(ctx, args.tokenOverride);
    const item = await ctx.db.get("shopItems", args.itemId);
    if (!item) throw new ConvexError({ code: "NOT_FOUND", message: "المنتج غير موجود" });
    if (!item.active) throw new ConvexError({ code: "INACTIVE", message: "المنتج غير متوفر" });

    const recipient = await ctx.db.get("users", args.toUserId);
    if (!recipient) throw new ConvexError({ code: "NOT_FOUND", message: "المستلم غير موجود" });
    if (recipient._id === sender._id) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "لا يمكنك إرساله لنفسك" });
    }

    const balance = sender.coins ?? 0;
    if (balance < item.price) {
      throw new ConvexError({
        code: "INSUFFICIENT_BALANCE",
        message: `رصيدك ${balance.toLocaleString()} — تحتاج ${item.price.toLocaleString()}`,
      });
    }

    // Deduct from sender
    const newBalance = balance - item.price;
    await ctx.db.patch("users", sender._id, { coins: newBalance });

    await ctx.db.insert("walletTransactions", {
      userId: sender._id,
      type: "spend",
      amount: -item.price,
      balanceAfter: newBalance,
      meta: `إرسال ${item.name} إلى ${recipient.name ?? recipient.username}`,
      createdAt: Date.now(),
    });

    // Add to recipient inventory
    const expiresAt = item.durationDays
      ? Date.now() + item.durationDays * 24 * 60 * 60 * 1000
      : undefined;

    await ctx.db.insert("userInventory", {
      userId: recipient._id,
      itemId: item._id,
      category: item.category,
      acquiredAt: Date.now(),
      expiresAt,
      isEquipped: false,
      purchaseType: "gift_received",
      fromUserId: sender._id,
    });

    return { ok: true, newBalance };
  },
});

// Equip an item (deactivate others in same category)
export const equipItem = mutation({
  args: {
    inventoryId: v.id("userInventory"),
    tokenOverride: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.tokenOverride);
    const inv = await ctx.db.get("userInventory", args.inventoryId);
    if (!inv) throw new ConvexError({ code: "NOT_FOUND", message: "العنصر غير موجود" });
    if (inv.userId !== user._id) {
      throw new ConvexError({ code: "FORBIDDEN", message: "ليس ملكك" });
    }
    // Check expiry
    if (inv.expiresAt && inv.expiresAt < Date.now()) {
      throw new ConvexError({ code: "EXPIRED", message: "انتهت صلاحية العنصر" });
    }

    const category = inv.category;

    // Deactivate all items in same category
    const all = await ctx.db
      .query("userInventory")
      .withIndex("by_user_and_category", (q) =>
        q.eq("userId", user._id).eq("category", category),
      )
      .collect();
    for (const item of all) {
      await ctx.db.patch("userInventory", item._id, { isEquipped: false });
    }

    // Activate this one
    await ctx.db.patch("userInventory", args.inventoryId, { isEquipped: true });

    // Update user's equipped field (for quick access)
    const fieldMap: Record<string, string> = {
      frame: "equippedFrameId",
      vehicle: "equippedVehicleId",
      entryEffect: "equippedEntryEffectId",
      chatBubble: "equippedChatBubbleId",
      soundWave: "equippedSoundWaveId",
      profileCard: "equippedProfileCardId",
    };
    const field = fieldMap[category];
    if (field) {
      await ctx.db.patch("users", user._id, { [field]: inv.itemId });
    }

    return { ok: true };
  },
});

// Unequip
export const unequipItem = mutation({
  args: {
    inventoryId: v.id("userInventory"),
    tokenOverride: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.tokenOverride);
    const inv = await ctx.db.get("userInventory", args.inventoryId);
    if (!inv) throw new ConvexError({ code: "NOT_FOUND", message: "العنصر غير موجود" });
    if (inv.userId !== user._id) {
      throw new ConvexError({ code: "FORBIDDEN", message: "ليس ملكك" });
    }

    await ctx.db.patch("userInventory", args.inventoryId, { isEquipped: false });

    // Clear user field
    const fieldMap: Record<string, string> = {
      frame: "equippedFrameId",
      vehicle: "equippedVehicleId",
      entryEffect: "equippedEntryEffectId",
      chatBubble: "equippedChatBubbleId",
      soundWave: "equippedSoundWaveId",
      profileCard: "equippedProfileCardId",
    };
    const field = fieldMap[inv.category];
    if (field) {
      await ctx.db.patch("users", user._id, { [field]: undefined });
    }

    return { ok: true };
  },
});

// ============================================================
// [moorawi-shop] updateItem — admin can edit name/image/price
// ============================================================
export const updateItem = mutation({
  args: {
    itemId: v.id("shopItems"),
    name: v.optional(v.string()),
    nameEn: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    previewUrl: v.optional(v.string()),
    price: v.optional(v.number()),
    active: v.optional(v.boolean()),
    tokenOverride: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    if (me.adminRole !== "super" && me.userNumber !== 1) {
      throw new ConvexError({ code: "FORBIDDEN", message: "صلاحيات المالك مطلوبة" });
    }
    const item = await ctx.db.get("shopItems", args.itemId);
    if (!item) throw new ConvexError({ code: "NOT_FOUND", message: "المنتج غير موجود" });

    const patch: any = {};
    if (args.name !== undefined) {
      const t = args.name.trim();
      if (t.length < 1) throw new ConvexError({ code: "BAD_NAME", message: "اسم فارغ" });
      patch.name = t;
    }
    if (args.nameEn !== undefined) patch.nameEn = args.nameEn;
    if (args.imageUrl !== undefined) patch.imageUrl = args.imageUrl;
    if (args.previewUrl !== undefined) patch.previewUrl = args.previewUrl;
    if (args.price !== undefined) patch.price = args.price;
    if (args.active !== undefined) patch.active = args.active;

    if (Object.keys(patch).length > 0) {
      await ctx.db.patch("shopItems", args.itemId, patch);
    }
    return { ok: true };
  },
});

// All items for admin panel
export const listAllAdmin = query({
  args: { tokenOverride: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    if (me.adminRole !== "super" && me.userNumber !== 1) {
      throw new ConvexError({ code: "FORBIDDEN", message: "صلاحيات المالك مطلوبة" });
    }
    return await ctx.db.query("shopItems").collect();
  },
});
