// [ezo-agents] نظام وكلاء شحن — ينشئهم الأدمن ويشحنون المستخدمين بالـ UID
import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { requireUser } from "./lib/auth";

function isAdmin(user: any): boolean {
  return !!user && (user.isAdmin === true || user.adminRole === "super");
}

function recordTx(
  ctx: any,
  agentId: any,
  targetUserId: any,
  targetUid: string,
  coins: number,
  type: "topup" | "recharge",
  actorId: any,
  note?: string,
) {
  return ctx.db.insert("agentTransactions", {
    agentId,
    targetUserId,
    targetUid,
    coins,
    type,
    actorId,
    note,
    createdAt: Date.now(),
  });
}

// ═══════════════════════════════════════════════════════════
// Queries
// ═══════════════════════════════════════════════════════════

// وكالتي (إن كنت وكيلاً)
export const myAgent = query({
  args: { tokenOverride: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    const agent = await ctx.db
      .query("agents")
      .withIndex("by_user", (q) => q.eq("userId", me._id))
      .first();
    if (!agent) return null;
    return {
      agentId: agent._id,
      name: agent.name,
      balance: agent.balance,
      totalRecharged: agent.totalRecharged,
      commissionPct: agent.commissionPct,
      active: agent.active,
      createdAt: agent.createdAt,
    };
  },
});

// قائمة الوكلاء — أدمن
export const listAgents = query({
  args: { tokenOverride: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    if (!isAdmin(me)) return [];
    const agents = await ctx.db.query("agents").collect();
    return agents.map((a) => ({
      agentId: a._id,
      userId: a.userId,
      name: a.name,
      balance: a.balance,
      totalRecharged: a.totalRecharged,
      commissionPct: a.commissionPct,
      active: a.active,
      createdAt: a.createdAt,
    }));
  },
});

// سجل عمليات وكيل معين — أدمن أو الوكيل نفسه
export const agentHistory = query({
  args: { agentId: v.id("agents"), limit: v.optional(v.number()), tokenOverride: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    const agent = await ctx.db.get("agents", args.agentId);
    if (!agent) return [];
    if (!isAdmin(me) && agent.userId !== me._id) {
      throw new ConvexError({ code: "FORBIDDEN" });
    }
    const limit = Math.min(args.limit ?? 50, 200);
    return await ctx.db
      .query("agentTransactions")
      .withIndex("by_agent_and_createdAt", (q) => q.eq("agentId", args.agentId))
      .order("desc")
      .take(limit);
  },
});

// ═══════════════════════════════════════════════════════════
// Mutations — أدمن
// ═══════════════════════════════════════════════════════════

// إنشاء وكيل جديد (userId موجود + commissionPct)
export const createAgent = mutation({
  args: {
    userId: v.id("users"),
    name: v.string(),
    commissionPct: v.optional(v.number()),
    tokenOverride: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    if (!isAdmin(me)) throw new ConvexError({ code: "FORBIDDEN", message: "أدمن فقط" });

    const target = await ctx.db.get("users", args.userId);
    if (!target) throw new ConvexError({ code: "NOT_FOUND", message: "المستخدم غير موجود" });

    const existing = await ctx.db
      .query("agents")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
    if (existing) throw new ConvexError({ code: "CONFLICT", message: "هذا المستخدم وكيل بالفعل" });

    const pct = Math.max(0, Math.min(100, args.commissionPct ?? 10));
    const now = Date.now();
    const id = await ctx.db.insert("agents", {
      userId: args.userId,
      name: args.name.trim(),
      balance: 0,
      totalRecharged: 0,
      commissionPct: pct,
      active: true,
      createdBy: me._id,
      createdAt: now,
      updatedAt: now,
    });
    return { ok: true, agentId: id };
  },
});

// شحن رصيد الوكيل من الإدارة
export const topUpAgent = mutation({
  args: {
    agentId: v.id("agents"),
    coins: v.number(),
    note: v.optional(v.string()),
    tokenOverride: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    if (!isAdmin(me)) throw new ConvexError({ code: "FORBIDDEN", message: "أدمن فقط" });
    if (args.coins <= 0) throw new ConvexError({ code: "BAD_REQUEST", message: "المبلغ موجب" });

    const agent = await ctx.db.get("agents", args.agentId);
    if (!agent) throw new ConvexError({ code: "NOT_FOUND" });
    if (!agent.active) throw new ConvexError({ code: "FORBIDDEN", message: "الوكيل معطّل" });

    const newBalance = agent.balance + args.coins;
    await ctx.db.patch("agents", agent._id, {
      balance: newBalance,
      updatedAt: Date.now(),
    });

    await recordTx(
      ctx,
      agent._id,
      agent.userId,
      "admin",
      args.coins,
      "topup",
      me._id,
      args.note,
    );

    return { ok: true, newBalance };
  },
});

// تعطيل / تفعيل وكيل
export const setAgentActive = mutation({
  args: {
    agentId: v.id("agents"),
    active: v.boolean(),
    tokenOverride: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    if (!isAdmin(me)) throw new ConvexError({ code: "FORBIDDEN" });
    await ctx.db.patch("agents", args.agentId, {
      active: args.active,
      updatedAt: Date.now(),
    });
    return { ok: true };
  },
});

// حذف وكيل (مع بقاء السجل للتدقيق)
export const removeAgent = mutation({
  args: { agentId: v.id("agents"), tokenOverride: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    if (!isAdmin(me)) throw new ConvexError({ code: "FORBIDDEN" });
    const agent = await ctx.db.get("agents", args.agentId);
    if (!agent) throw new ConvexError({ code: "NOT_FOUND" });
    if (agent.balance > 0) {
      throw new ConvexError({
        code: "CONFLICT",
        message: `الوكيل لديه رصيد ${agent.balance}. صفّره أو حوّله أولاً`,
      });
    }
    await ctx.db.delete("agents", args.agentId);
    return { ok: true };
  },
});

// ═══════════════════════════════════════════════════════════
// Mutations — الوكيل يشحن مستخدماً بالـ UID
// ═══════════════════════════════════════════════════════════
export const agentRecharge = mutation({
  args: {
    targetUid: v.string(),
    coins: v.number(),
    tokenOverride: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    const agent = await ctx.db
      .query("agents")
      .withIndex("by_user", (q) => q.eq("userId", me._id))
      .first();
    if (!agent) throw new ConvexError({ code: "FORBIDDEN", message: "لست وكيلاً" });
    if (!agent.active) throw new ConvexError({ code: "FORBIDDEN", message: "وكالتك معطّلة" });
    if (args.coins <= 0) throw new ConvexError({ code: "BAD_REQUEST", message: "المبلغ موجب" });
    if (agent.balance < args.coins) {
      throw new ConvexError({
        code: "INSUFFICIENT",
        message: `رصيدك ${agent.balance}. اتصل بالإدارة للشحن`,
      });
    }

    const target = await ctx.db
      .query("users")
      .withIndex("by_uid", (q) => q.eq("uid", args.targetUid.trim()))
      .unique();
    if (!target) throw new ConvexError({ code: "NOT_FOUND", message: "UID غير موجود" });

    // خصم من الوكيل
    await ctx.db.patch("agents", agent._id, {
      balance: agent.balance - args.coins,
      totalRecharged: agent.totalRecharged + args.coins,
      updatedAt: Date.now(),
    });

    // إضافة للمستخدم
    const newUserCoins = (target.coins ?? 0) + args.coins;
    await ctx.db.patch("users", target._id, {
      coins: newUserCoins,
      totalRecharged: (target.totalRecharged ?? 0) + args.coins,
    });

    // سجل
    await ctx.db.insert("walletTransactions", {
      userId: target._id,
      type: "recharge",
      amount: args.coins,
      balanceAfter: newUserCoins,
      meta: `شحن عبر وكيل ${agent.name}`,
      createdAt: Date.now(),
    });
    await recordTx(
      ctx,
      agent._id,
      target._id,
      target.uid ?? args.targetUid,
      args.coins,
      "recharge",
      me._id,
    );

    return {
      ok: true,
      newAgentBalance: agent.balance - args.coins,
      newUserBalance: newUserCoins,
      targetName: target.name ?? null,
      targetUid: target.uid ?? null,
    };
  },
});
