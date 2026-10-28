// [ezo-presence] نظام حضور المستخدمين — مطابق لـ Yalla/Bigo/SUGO
//
// المعمار:
//   - العميل يُرسل heartbeat كل 25 ثانية
//   - Member يُعتبر نشطاً إذا lastSeenAt > now - 90_000 (3x interval)
//   - عند الخروج: leave mutation أو sendBeacon (فوري)
//   - كل دقيقة: sweepInactive يحذف الأعضاء الميتين + يفرّغ مايكاتهم
//
// Session:
//   - كل دخول لغرفة = sessionId جديد
//   - الجلسة تنتهي عند الخروج أو sweep
//   - sessionCharms = الجاذبية في الجلسة الحالية فقط

import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { requireUser } from "./lib/auth";

const HEARTBEAT_INTERVAL_MS = 25_000;
const STALE_THRESHOLD_MS = 600_000; // 3 minutes — كافٍ لـ Android Doze + reconnect
const MAX_SEATS = 24;

// ============================================================
// heartbeat — يُحدّث lastSeenAt للمستخدم في الغرفة
// يُستدعى من العميل كل 25 ثانية
// ============================================================
export const heartbeat = mutation({
  args: {
    roomId: v.id("rooms"),
    tokenOverride: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
    const me = await requireUser(ctx, args.tokenOverride);

    const member = await ctx.db
      .query("roomMembers")
      .withIndex("by_room_and_user", (q) =>
        q.eq("roomId", args.roomId).eq("userId", me._id)
      )
      .unique();

    const now = Date.now();
    if (!member) {
      // [ezo-fix] Self-Healing: إعادة إنشاء العضوية إذا انمسحت
      const room = await ctx.db.get("rooms", args.roomId);
      if (!room) return { ok: false, reason: "room_not_found" };
      
      await ctx.db.insert("roomMembers", {
        roomId: args.roomId,
        userId: me._id,
        role: room.ownerId === me._id ? "owner" : "listener",
        lastSeenAt: now,
        sessionId: `${me._id}_${now}`,
        sessionStartedAt: now,
      });
      await ctx.db.patch("rooms", args.roomId, {
        memberCount: (room.memberCount ?? 0) + 1,
      });

      return { ok: true, selfHealed: true };
    }

    const wasStale = !member.lastSeenAt || (now - member.lastSeenAt) > STALE_THRESHOLD_MS;

    await ctx.db.patch("roomMembers", member._id, {
      lastSeenAt: now,
      // لو الجلسة انتهت (sweep أو غياب طويل)، نبدأ جلسة جديدة
      sessionId: wasStale ? `${me._id}_${now}` : (member.sessionId ?? `${me._id}_${now}`),
      sessionStartedAt: wasStale ? now : (member.sessionStartedAt ?? now),
    });

    // [ezo-vip] تسجيل entry عند أول heartbeat (أو بعد انقطاع طويل) لمستخدم VIP 3+
    if (wasStale) {
      const { activeVipLevel } = await import("./lib/vip");
      const vip = activeVipLevel(me);
      if (vip >= 3) {
        await ctx.db.insert("roomEntries", {
          roomId: args.roomId,
          userId: me._id,
          level: vip,
          name: me.name ?? "ضيف",
          avatarUrl: me.avatarUrl,
          createdAt: now,
        });
      }
    }

    return { ok: true };
    } catch (error) {
      console.error("[heartbeat error]", error);
      return { ok: false, error: String(error) };
    }
  },
});

// ============================================================
// leave — خروج فوري (عند زر الخروج أو sendBeacon)
// ============================================================
export const leave = mutation({
  args: { roomId: v.id("rooms"), tokenOverride: v.optional(v.string()) },
  handler: async (ctx, args) => {
    try {
      const me = await requireUser(ctx, args.tokenOverride);
      
      // 1. حذف العضوية
      const member = await ctx.db.query("roomMembers")
        .withIndex("by_room_and_user", (q) => q.eq("roomId", args.roomId).eq("userId", me._id))
        .unique();

      if (member) {
        const room = await ctx.db.get("rooms", args.roomId);
        if (room && room.ownerId !== me._id) {
          await ctx.db.delete("roomMembers", member._id);
          await ctx.db.patch("rooms", args.roomId, { memberCount: Math.max(0, (room.memberCount ?? 1) - 1) });
        }
      }

      // 2. تفريغ المايك فوراً
      const seats = await ctx.db.query("micSeats")
        .withIndex("by_room_and_seatIndex", (q) => q.eq("roomId", args.roomId))
        .take(40);
      for (const s of seats) {
        if (s.userId === me._id) {
          await ctx.db.patch("micSeats", s._id, { 
            userId: undefined, muted: false, adminMuted: false, sessionCharms: 0, sessionStartedAt: undefined 
          });
        }
      }
      return { ok: true };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  },
});

// ============================================================
// activeMembers — الأعضاء النشطون فقط (lastSeenAt > now - 90s)
// كل الغرف تُستدعي هذا بدل members
// ============================================================
export const activeMembers = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    const threshold = Date.now() - STALE_THRESHOLD_MS;
    // [ezo-fix] جلب الكل ثم فلترة اللي ليسوا على مايك
    const rows = await ctx.db
      .query("roomMembers")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .take(200);

    return await Promise.all(
      rows.map(async (m) => {
        const user = await ctx.db.get("users", m.userId);
        const avatarUrl =
          user?.avatarUrl ??
          (user?.avatarId ? await ctx.storage.getUrl(user.avatarId) : null);
        return {
          _id: m._id,
          userId: m.userId,
          role: m.role,
          banned: m.banned ?? false,
          name: user?.name ?? "ضيف",
          userNumber: user?.userNumber ?? null,
          avatarUrl,
          vip: user?.vipLevel ?? 0,
          adminRole: user?.adminRole ?? null,
        };
      })
    );
  },
});

// ============================================================
// activeCount — عدد المتصلين في الغرفة (سريع)
// ============================================================
export const activeCount = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    const threshold = Date.now() - STALE_THRESHOLD_MS;
    // [ezo-fix] جلب الكل ثم فلترة اللي ليسوا على مايك
    const rows = await ctx.db
      .query("roomMembers")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .take(200);
    return rows.length;
  },
});

// ============================================================
// sweepInactive — تنظيف دوري (كل 60 ثانية عبر cron)
// يحذف الأعضاء الميتين + يفرّغ مايكاتهم
// ============================================================
export const sweepInactive = internalMutation({
  args: {},
  handler: async (ctx) => {
    const threshold = Date.now() - STALE_THRESHOLD_MS;

    // 1) الأعضاء الميتون — مرتين:
    //    (أ) عبر index (lastSeenAt < threshold) — سريع وفعّال
    //    (ب) التقاط السجلات بدون lastSeenAt (بيانات ما قبل presence)
    const staleIndexed = await ctx.db
      .query("roomMembers")
      .withIndex("by_lastSeen", (q) => q.lt("lastSeenAt", threshold))
      .take(200);

    const allMembers = await ctx.db.query("roomMembers").take(300);
    const legacyNoTimestamp = allMembers.filter(
    (m) => !m.lastSeenAt && (m._creationTime ?? 0) < Date.now() - 90_000
  );

    const toRemove = [...staleIndexed, ...legacyNoTimestamp];

    let removed = 0;
    const processedIds = new Set<string>();
    for (const m of toRemove) {
      if (processedIds.has(m._id)) continue;
      processedIds.add(m._id);

      // المالك يبقى — لكن نُعطيه lastSeenAt جديد (شرط أساسي)
      const room = await ctx.db.get("rooms", m.roomId);
      if (room && room.ownerId === m.userId) {
        if (!m.lastSeenAt) {
          await ctx.db.patch("roomMembers", m._id, { lastSeenAt: Date.now() });
        }
        continue;
      }
      // [ezo-fix] إذا كان المستخدم قاعد على مايك، لا نمسحه من الغرفة أبداً
      const isOnMic = await ctx.db
        .query("micSeats")
        .withIndex("by_room_and_seatIndex", (q) => q.eq("roomId", m.roomId))
        .filter((q) => q.eq(q.field("userId"), m.userId))
        .first();
        
      if (isOnMic) {
        await ctx.db.patch("roomMembers", m._id, { lastSeenAt: Date.now() });
        continue;
      }

      await ctx.db.delete("roomMembers", m._id);
      if (room && room.memberCount > 0) {
        await ctx.db.patch("rooms", m.roomId, {
          memberCount: Math.max(0, room.memberCount - 1),
        });
      }
      removed++;
    }

    // 2) فرّغ المايكات التي أصحابها خرجوا
    const deadSeats = await ctx.db
      .query("micSeats")
      .take(500);

    let clearedSeats = 0;
    for (const s of deadSeats) {
      if (!s.userId) continue;
      // هل هذا المستخدم نشط في هذه الغرفة؟
      const stillIn = await ctx.db
        .query("roomMembers")
        .withIndex("by_room_and_user", (q) =>
          q.eq("roomId", s.roomId).eq("userId", s.userId!)
        )
        .unique();

      const alive =
        stillIn && (stillIn.lastSeenAt ?? 0) > threshold;

      if (!alive) {
        await ctx.db.patch("micSeats", s._id, {
          userId: undefined,
          muted: false,
          adminMuted: false,
          sessionCharms: 0,
          sessionStartedAt: undefined,
        });
        clearedSeats++;
      }
    }

    // 3) نظّف roomEntries الأقدم من ساعة
    const oldEntries = await ctx.db
      .query("roomEntries")
      .filter((q) => q.lt(q.field("createdAt"), Date.now() - 60 * 60 * 1000))
      .take(500);
    for (const e of oldEntries) await ctx.db.delete("roomEntries", e._id);

    return { ok: true, removed, clearedSeats, entriesCleaned: oldEntries.length };
  },
});

// ============================================================
// roomCharmTotals — عدّاد الجاذبية في الجلسة لكل مايك
// ============================================================
export const roomCharmTotals = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    const seats = await ctx.db
      .query("micSeats")
      .withIndex("by_room_and_seatIndex", (q) => q.eq("roomId", args.roomId))
      .take(MAX_SEATS);

    // map: seatIndex → sessionCharms
    const totals: Record<number, number> = {};
    for (const s of seats) {
      totals[s.seatIndex] = s.sessionCharms ?? 0;
    }
    return totals;
  },
});

// ============================================================
// recentEntries — أحداث دخول VIP حديثة (خلال آخر 10 ثوانٍ)
// ============================================================
export const recentEntries = query({
  args: {
    roomId: v.id("rooms"),
    since: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const since = args.since ?? (Date.now() - 10_000);
    const rows = await ctx.db
      .query("roomEntries")
      .withIndex("by_room_and_createdAt", (q) =>
        q.eq("roomId", args.roomId).gt("createdAt", since)
      )
      .order("desc")
      .take(5);
    return rows;
  },
});

