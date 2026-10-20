// [ezo-daily-login] إعدادات المكافأة اليومية
import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { requireUser, isAssetManager } from "./lib/auth";

// ============================================================
// Public — 7 صفوف مرتبة
// ============================================================
export const list = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db
      .query("dailyLoginConfig")
      .withIndex("by_dayIndex")
      .collect();
    return rows
      .filter((r) => r.active)
      .sort((a, b) => a.dayIndex - b.dayIndex);
  },
});

// Admin — كل الصفوف (بما فيها المخفيّة)
export const listAll = query({
  args: { tokenOverride: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    if (!isAssetManager(me)) return [];
    const rows = await ctx.db.query("dailyLoginConfig").collect();
    return rows.sort((a, b) => a.dayIndex - b.dayIndex);
  },
});

// ============================================================
// Admin — تعديل يوم واحد
// ============================================================
export const upsertDay = mutation({
  args: {
    dayIndex: v.number(),
    coins: v.number(),
    imageUrl: v.string(),
    label: v.string(),
    bonusType: v.optional(v.union(
      v.literal("none"),
      v.literal("vip"),
      v.literal("frame"),
      v.literal("vehicle"),
      v.literal("gift"),
    )),
    bonusRef: v.optional(v.string()),
    active: v.optional(v.boolean()),
    tokenOverride: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    if (!isAssetManager(me)) throw new Error("غير مصرح");

    const d = Math.floor(args.dayIndex);
    if (d < 0 || d > 6) throw new Error("dayIndex يجب أن يكون 0-6");
    if (args.coins < 0) throw new Error("العملات موجبة");
    if (!args.imageUrl.trim()) throw new Error("اختر صورة");

    const existing = await ctx.db
      .query("dailyLoginConfig")
      .withIndex("by_dayIndex", (q) => q.eq("dayIndex", d))
      .first();

    const data = {
      dayIndex: d,
      coins: Math.floor(args.coins),
      imageUrl: args.imageUrl.trim(),
      label: args.label.trim() || `اليوم ${d + 1}`,
      bonusType: args.bonusType,
      bonusRef: args.bonusRef,
      active: args.active ?? true,
      updatedAt: Date.now(),
    };

    if (existing) {
      await ctx.db.patch("dailyLoginConfig", existing._id, data);
      return { ok: true, id: existing._id };
    }
    const id = await ctx.db.insert("dailyLoginConfig", data);
    return { ok: true, id };
  },
});

// ============================================================
// Seed defaults — 7 صفوف بقيم معقولة وصور موجودة
// ============================================================
export const seedDefaults = internalMutation({
  args: {},
  handler: async (ctx) => {
    const old = await ctx.db.query("dailyLoginConfig").collect();
    for (const o of old) await ctx.db.delete("dailyLoginConfig", o._id);

    const defaults = [
      { dayIndex: 0, coins: 50,   imageUrl: "/rewards/coins-small.png",  label: "اليوم الأول",   bonusType: "none" as const },
      { dayIndex: 1, coins: 75,   imageUrl: "/rewards/coins-small.png",  label: "اليوم الثاني",  bonusType: "none" as const },
      { dayIndex: 2, coins: 100,  imageUrl: "/rewards/coins-medium.png", label: "اليوم الثالث",  bonusType: "none" as const },
      { dayIndex: 3, coins: 150,  imageUrl: "/rewards/vip1.png",         label: "اليوم الرابع",  bonusType: "vip" as const },
      { dayIndex: 4, coins: 200,  imageUrl: "/rewards/coins-medium.png", label: "اليوم الخامس",  bonusType: "none" as const },
      { dayIndex: 5, coins: 300,  imageUrl: "/rewards/frame-gold.png",   label: "اليوم السادس",  bonusType: "frame" as const },
      { dayIndex: 6, coins: 1000, imageUrl: "/rewards/coins-large.png",  label: "اليوم السابع",  bonusType: "none" as const },
    ];
    for (const d of defaults) {
      await ctx.db.insert("dailyLoginConfig", { ...d, active: true, updatedAt: Date.now() });
    }
    return { ok: true, created: defaults.length };
  },
});
