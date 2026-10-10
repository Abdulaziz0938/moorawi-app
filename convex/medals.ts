import { mutation, query, internalMutation } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { requireUser, isFullAdmin } from "./lib/auth";

// ============================================================
// [moorawi-medals] Tier rank — for auto-equip on grant
// ============================================================
const TIER_RANK: Record<string, number> = {
  C: 1, B: 2, A: 3, S: 4, SS: 5, SSS: 6,
};
function tierRank(t: string): number {
  return TIER_RANK[t] ?? 0;
}


// ============================================================
// [moorawi-medals] Medals queries + mutations
// ============================================================

// List all active medals (grouped by category)
export const listAll = query({
  args: { category: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (args.category) {
      return await ctx.db
        .query("medals")
        .withIndex("by_category_active", (q) =>
          q.eq("category", args.category as any).eq("active", true),
        )
        .collect();
    }
    return await ctx.db.query("medals").collect();
  },
});

// Get my medals
export const myMedals = query({
  args: { tokenOverride: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (!args.tokenOverride) return [];
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", args.tokenOverride!))
      .unique();
    if (!user) return [];

    const userMedals = await ctx.db
      .query("userMedals")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Enrich with medal data
    const enriched = await Promise.all(
      userMedals.map(async (um) => {
        const medal = await ctx.db.get("medals", um.medalId);
        return { ...um, medal };
      }),
    );

    return enriched.filter((x) => x.medal);
  },
});

// Get user medals (public)
export const userMedals = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const userMedals = await ctx.db
      .query("userMedals")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const enriched = await Promise.all(
      userMedals.map(async (um) => {
        const medal = await ctx.db.get("medals", um.medalId);
        return { ...um, medal };
      }),
    );

    return enriched.filter((x) => x.medal);
  },
});

// ============================================================
// Mutations
// ============================================================

// Grant a medal to user (admin or auto)
export const grantMedal = mutation({
  args: {
    tokenOverride: v.optional(v.string()),
    userId: v.id("users"),
    medalId: v.id("medals"),
  },
  handler: async (ctx, args) => {
    // Require admin (for now — auto-grant comes later)
    const me = await requireUser(ctx, args.tokenOverride);
    if (!isFullAdmin(me)) {
      throw new ConvexError({ code: "FORBIDDEN", message: "صلاحيات المطلوبة" });
    }

    const user = await ctx.db.get("users", args.userId);
    if (!user) throw new ConvexError({ code: "NOT_FOUND", message: "المستخدم غير موجود" });
    const medal = await ctx.db.get("medals", args.medalId);
    if (!medal) throw new ConvexError({ code: "NOT_FOUND", message: "الوسام غير موجود" });

    // Check if already has
    const existing = await ctx.db
      .query("userMedals")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    if (existing.some((um) => um.medalId === args.medalId)) {
      return { ok: true, alreadyOwned: true };
    }

    // ===== Auto-equip logic (Poppo): if new medal tier > current, equip =====
    const currentEquippedId = user.equippedMedalId;
    let shouldAutoEquip = false;
    let autoEquipReason = "first-medal";

    if (!currentEquippedId) {
      shouldAutoEquip = true;
    } else {
      const currentMedal = await ctx.db.get("medals", currentEquippedId);
      const currentRank = currentMedal ? tierRank(currentMedal.tier) : 0;
      const newRank = tierRank(medal.tier);
      if (newRank > currentRank) {
        shouldAutoEquip = true;
        autoEquipReason = "higher-tier";
        // un-equip old
        const oldUm = existing.find((um) => um.medalId === currentEquippedId);
        if (oldUm) {
          await ctx.db.patch("userMedals", oldUm._id, { equipped: false });
        }
      }
    }

    await ctx.db.insert("userMedals", {
      userId: args.userId,
      medalId: args.medalId,
      earnedAt: Date.now(),
      equipped: shouldAutoEquip,
    });

    // Update user: medalCount + equippedMedalId if auto-equipped
    const patch: any = { medalCount: (user.medalCount ?? 0) + 1 };
    if (shouldAutoEquip) patch.equippedMedalId = args.medalId;
    await ctx.db.patch("users", args.userId, patch);

    return { ok: true, autoEquipped: shouldAutoEquip, reason: shouldAutoEquip ? autoEquipReason : null };
  },
});

// Toggle equip medal (only one equipped at a time)
export const equipMedal = mutation({
  args: {
    tokenOverride: v.optional(v.string()),
    userMedalId: v.id("userMedals"),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    const um = await ctx.db.get("userMedals", args.userMedalId);
    if (!um) throw new ConvexError({ code: "NOT_FOUND", message: "غير موجود" });
    if (um.userId !== me._id) {
      throw new ConvexError({ code: "FORBIDDEN", message: "ليس لك" });
    }

    // Unequip all user's medals
    const all = await ctx.db
      .query("userMedals")
      .withIndex("by_user", (q) => q.eq("userId", me._id))
      .collect();
    for (const m of all) {
      await ctx.db.patch("userMedals", m._id, { equipped: false });
    }

    // Equip this one
    await ctx.db.patch("userMedals", args.userMedalId, { equipped: true });

    // Update user
    await ctx.db.patch("users", me._id, { equippedMedalId: um.medalId });

    return { ok: true };
  },
});

// Unequip
export const unequipMedal = mutation({
  args: {
    tokenOverride: v.optional(v.string()),
    userMedalId: v.id("userMedals"),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    const um = await ctx.db.get("userMedals", args.userMedalId);
    if (!um || um.userId !== me._id) {
      throw new ConvexError({ code: "FORBIDDEN", message: "ليس لك" });
    }
    await ctx.db.patch("userMedals", args.userMedalId, { equipped: false });
    await ctx.db.patch("users", me._id, { equippedMedalId: undefined });
    return { ok: true };
  },
});

// ============================================================
// [moorawi-medals] Auto-grant medals based on thresholds
// ============================================================
export async function checkAndGrantMedals(ctx: any, userId: any) {
  const user = await ctx.db.get("users", userId);
  if (!user) return 0;

  const allMedals = await ctx.db.query("medals").collect();
  const owned = await ctx.db
    .query("userMedals")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .collect();
  const ownedIds = new Set(owned.map((um: any) => um.medalId));

  let granted = 0;

  for (const medal of allMedals) {
    if (ownedIds.has(medal._id)) continue;

    let value = 0;
    if (medal.category === "wealth") value = user.totalSent ?? 0;
    else if (medal.category === "charm") value = user.totalReceived ?? 0;
    // activity/monthly/weekly/special — handled separately (skipped for now)

    if (value > 0 && value >= (medal.value ?? 0)) {
      await ctx.db.insert("userMedals", {
        userId,
        medalId: medal._id,
        earnedAt: Date.now(),
        equipped: false,
      });
      granted++;
    }
  }

  if (granted > 0) {
    const fresh = await ctx.db.get("users", userId);
    await ctx.db.patch("users", userId, {
      medalCount: (fresh?.medalCount ?? 0) + granted,
    });
  }

  return granted;
}

// ============================================================
// [moorawi-medals] updateMedal — admin can edit name/image
// ============================================================
export const updateMedal = mutation({
  args: {
    medalId: v.id("medals"),
    name: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    description: v.optional(v.string()),
    tokenOverride: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    if (!isFullAdmin(me)) {
      throw new ConvexError({ code: "FORBIDDEN", message: "صلاحيات المالك مطلوبة" });
    }
    const medal = await ctx.db.get("medals", args.medalId);
    if (!medal) throw new ConvexError({ code: "NOT_FOUND", message: "الوسم غير موجود" });

    const patch: any = {};
    if (args.name !== undefined) {
      const trimmed = args.name.trim();
      if (trimmed.length < 1) throw new ConvexError({ code: "BAD_NAME", message: "اسم فارغ" });
      patch.name = trimmed;
    }
    if (args.imageUrl !== undefined) patch.imageUrl = args.imageUrl;
    if (args.description !== undefined) patch.description = args.description;

    if (Object.keys(patch).length > 0) {
      await ctx.db.patch("medals", args.medalId, patch);
    }
    return { ok: true };
  },
});

// ============================================================
// [moorawi-medals] migrateAutoEquip — one-time: equip top-tier
// medal for users who have userMedals but nothing equipped
// ============================================================
export const migrateAutoEquip = internalMutation({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    let fixed = 0;

    for (const u of users) {
      if (u.equippedMedalId) continue; // already has one

      const ums = await ctx.db
        .query("userMedals")
        .withIndex("by_user", (q) => q.eq("userId", u._id))
        .collect();
      if (ums.length === 0) continue;

      // Find highest tier
      let best: any = null;
      let bestRank = -1;
      for (const um of ums) {
        const m = await ctx.db.get("medals", um.medalId);
        if (!m) continue;
        const r = tierRank(m.tier);
        if (r > bestRank) {
          bestRank = r;
          best = { um, medal: m };
        }
      }
      if (!best) continue;

      // Set equipped on chosen
      await ctx.db.patch("userMedals", best.um._id, { equipped: true });
      await ctx.db.patch("users", u._id, { equippedMedalId: best.medal._id });
      fixed += 1;
    }

    return { ok: true, fixed };
  },
});
