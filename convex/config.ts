// [moorawi-config] Global configuration (admin editable)
import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { requireUser, isFullAdmin } from "./lib/auth";

// القيم الافتراضية
const DEFAULTS: Record<string, string> = {
  "admin.whatsapp": "+306995026837",
  "admin.roomNumber": "1111",
};

// Public — يقرأ كل الإعدادات
export const getAll = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("config").collect();
    const map: Record<string, string> = { ...DEFAULTS };
    for (const r of rows) map[r.key] = r.value;
    return map;
  },
});

export const get = query({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("config")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique();
    return row?.value ?? DEFAULTS[args.key] ?? null;
  },
});

export const set = mutation({
  args: {
    key: v.string(),
    value: v.string(),
    tokenOverride: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    if (!isFullAdmin(me)) throw new Error("غير مصرح");
    const key = args.key.trim();
    if (key.length < 1) throw new Error("مفتاح فارغ");

    const existing = await ctx.db
      .query("config")
      .withIndex("by_key", (q) => q.eq("key", key))
      .unique();
    if (existing) {
      await ctx.db.patch("config", existing._id, {
        value: args.value,
        updatedAt: Date.now(),
      });
      return { ok: true, updated: true };
    }
    await ctx.db.insert("config", {
      key,
      value: args.value,
      updatedAt: Date.now(),
    });
    return { ok: true, created: true };
  },
});

// seed داخلي — يُحدّث القيم الموجودة أيضاً
export const seedDefaults = internalMutation({
  args: {},
  handler: async (ctx) => {
    let created = 0;
    let updated = 0;
    for (const [key, value] of Object.entries(DEFAULTS)) {
      const existing = await ctx.db
        .query("config")
        .withIndex("by_key", (q) => q.eq("key", key))
        .unique();
      if (!existing) {
        await ctx.db.insert("config", { key, value, updatedAt: Date.now() });
        created++;
      } else if (existing.value !== value) {
        await ctx.db.patch("config", existing._id, {
          value,
          updatedAt: Date.now(),
        });
        updated++;
      }
    }
    return { ok: true, created, updated };
  },
});
