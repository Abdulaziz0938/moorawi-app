// [ezo-presence] ظ†ط¸ط§ظ… ط­ط¶ظˆط± ط§ظ„ظ…ط³طھط®ط¯ظ…ظٹظ† â€” ظ…ط·ط§ط¨ظ‚ ظ„ظ€ Yalla/Bigo/SUGO
//
// ط§ظ„ظ…ط¹ظ…ط§ط±:
//   - ط§ظ„ط¹ظ…ظٹظ„ ظٹظڈط±ط³ظ„ heartbeat ظƒظ„ 25 ط«ط§ظ†ظٹط©
//   - Member ظٹظڈط¹طھط¨ط± ظ†ط´ط·ط§ظ‹ ط¥ط°ط§ lastSeenAt > now - 90_000 (3x interval)
//   - ط¹ظ†ط¯ ط§ظ„ط®ط±ظˆط¬: leave mutation ط£ظˆ sendBeacon (ظپظˆط±ظٹ)
//   - ظƒظ„ ط¯ظ‚ظٹظ‚ط©: sweepInactive ظٹط­ط°ظپ ط§ظ„ط£ط¹ط¶ط§ط، ط§ظ„ظ…ظٹطھظٹظ† + ظٹظپط±ظ‘ط؛ ظ…ط§ظٹظƒط§طھظ‡ظ…
//
// Session:
//   - ظƒظ„ ط¯ط®ظˆظ„ ظ„ط؛ط±ظپط© = sessionId ط¬ط¯ظٹط¯
//   - ط§ظ„ط¬ظ„ط³ط© طھظ†طھظ‡ظٹ ط¹ظ†ط¯ ط§ظ„ط®ط±ظˆط¬ ط£ظˆ sweep
//   - sessionCharms = ط§ظ„ط¬ط§ط°ط¨ظٹط© ظپظٹ ط§ظ„ط¬ظ„ط³ط© ط§ظ„ط­ط§ظ„ظٹط© ظپظ‚ط·

import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { requireUser } from "./lib/auth";

const HEARTBEAT_INTERVAL_MS = 25_000;
const STALE_THRESHOLD_MS = 600_000; // 3 minutes â€” ظƒط§ظپظچ ظ„ظ€ Android Doze + reconnect
const MAX_SEATS = 24;

// ============================================================
// heartbeat â€” ظٹظڈط­ط¯ظ‘ط« lastSeenAt ظ„ظ„ظ…ط³طھط®ط¯ظ… ظپظٹ ط§ظ„ط؛ط±ظپط©
// ظٹظڈط³طھط¯ط¹ظ‰ ظ…ظ† ط§ظ„ط¹ظ…ظٹظ„ ظƒظ„ 25 ط«ط§ظ†ظٹط©
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
      // [ezo-fix] Self-Healing: ط¥ط¹ط§ط¯ط© ط¥ظ†ط´ط§ط، ط§ظ„ط¹ط¶ظˆظٹط© ط¥ط°ط§ ط§ظ†ظ…ط³ط­طھ
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
      // ظ„ظˆ ط§ظ„ط¬ظ„ط³ط© ط§ظ†طھظ‡طھ (sweep ط£ظˆ ط؛ظٹط§ط¨ ط·ظˆظٹظ„)طŒ ظ†ط¨ط¯ط£ ط¬ظ„ط³ط© ط¬ط¯ظٹط¯ط©
      sessionId: wasStale ? `${me._id}_${now}` : (member.sessionId ?? `${me._id}_${now}`),
      sessionStartedAt: wasStale ? now : (member.sessionStartedAt ?? now),
    });

    // [ezo-vip] طھط³ط¬ظٹظ„ entry ط¹ظ†ط¯ ط£ظˆظ„ heartbeat (ط£ظˆ ط¨ط¹ط¯ ط§ظ†ظ‚ط·ط§ط¹ ط·ظˆظٹظ„) ظ„ظ…ط³طھط®ط¯ظ… VIP 3+
    if (wasStale) {
      const { activeVipLevel } = await import("./lib/vip");
      const vip = activeVipLevel(me);
      if (vip >= 3) {
        await ctx.db.insert("roomEntries", {
          roomId: args.roomId,
          userId: me._id,
          level: vip,
          name: me.name ?? "ط¶ظٹظپ",
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
// leave â€” ط®ط±ظˆط¬ ظپظˆط±ظٹ (ط¹ظ†ط¯ ط²ط± ط§ظ„ط®ط±ظˆط¬ ط£ظˆ sendBeacon)
// ============================================================
export const leave = mutation({
  args: { roomId: v.id("rooms"), tokenOverride: v.optional(v.string()) },
  handler: async (ctx, args) => {
    try {
      const me = await requireUser(ctx, args.tokenOverride);
      
      // 1. ط­ط°ظپ ط§ظ„ط¹ط¶ظˆظٹط©
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

      // 2. طھظپط±ظٹط؛ ط§ظ„ظ…ط§ظٹظƒ ظپظˆط±ط§ظ‹
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
// activeMembers â€” ط§ظ„ط£ط¹ط¶ط§ط، ط§ظ„ظ†ط´ط·ظˆظ† ظپظ‚ط· (lastSeenAt > now - 90s)
// ظƒظ„ ط§ظ„ط؛ط±ظپ طھظڈط³طھط¯ط¹ظٹ ظ‡ط°ط§ ط¨ط¯ظ„ members
// ============================================================
export const activeMembers = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    const threshold = Date.now() - STALE_THRESHOLD_MS;
    // [ezo-fix] ط¬ظ„ط¨ ط§ظ„ظƒظ„ ط«ظ… ظپظ„طھط±ط© ط§ظ„ظ„ظٹ ظ„ظٹط³ظˆط§ ط¹ظ„ظ‰ ظ…ط§ظٹظƒ
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
          name: user?.name ?? "ط¶ظٹظپ",
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
// activeCount â€” ط¹ط¯ط¯ ط§ظ„ظ…طھطµظ„ظٹظ† ظپظٹ ط§ظ„ط؛ط±ظپط© (ط³ط±ظٹط¹)
// ============================================================
export const activeCount = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    const threshold = Date.now() - STALE_THRESHOLD_MS;
    // [ezo-fix] ط¬ظ„ط¨ ط§ظ„ظƒظ„ ط«ظ… ظپظ„طھط±ط© ط§ظ„ظ„ظٹ ظ„ظٹط³ظˆط§ ط¹ظ„ظ‰ ظ…ط§ظٹظƒ
    const rows = await ctx.db
      .query("roomMembers")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .take(200);
    return rows.length;
  },
});

// ============================================================
// sweepInactive â€” طھظ†ط¸ظٹظپ ط¯ظˆط±ظٹ (ظƒظ„ 60 ط«ط§ظ†ظٹط© ط¹ط¨ط± cron)
// ظٹط­ط°ظپ ط§ظ„ط£ط¹ط¶ط§ط، ط§ظ„ظ…ظٹطھظٹظ† + ظٹظپط±ظ‘ط؛ ظ…ط§ظٹظƒط§طھظ‡ظ…
// ============================================================
export const sweepInactive = internalMutation({
  args: {},
  handler: async (ctx) => {
    const threshold = Date.now() - STALE_THRESHOLD_MS;

    // 1) ط§ظ„ط£ط¹ط¶ط§ط، ط§ظ„ظ…ظٹطھظˆظ† â€” ظ…ط±طھظٹظ†:
    //    (ط£) ط¹ط¨ط± index (lastSeenAt < threshold) â€” ط³ط±ظٹط¹ ظˆظپط¹ظ‘ط§ظ„
    //    (ط¨) ط§ظ„طھظ‚ط§ط· ط§ظ„ط³ط¬ظ„ط§طھ ط¨ط¯ظˆظ† lastSeenAt (ط¨ظٹط§ظ†ط§طھ ظ…ط§ ظ‚ط¨ظ„ presence)
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

      // ط§ظ„ظ…ط§ظ„ظƒ ظٹط¨ظ‚ظ‰ â€” ظ„ظƒظ† ظ†ظڈط¹ط·ظٹظ‡ lastSeenAt ط¬ط¯ظٹط¯ (ط´ط±ط· ط£ط³ط§ط³ظٹ)
      const room = await ctx.db.get("rooms", m.roomId);
      if (room && room.ownerId === m.userId) {
        if (!m.lastSeenAt) {
          await ctx.db.patch("roomMembers", m._id, { lastSeenAt: Date.now() });
        }
        continue;
      }
      // [ezo-fix] ط¥ط°ط§ ظƒط§ظ† ط§ظ„ظ…ط³طھط®ط¯ظ… ظ‚ط§ط¹ط¯ ط¹ظ„ظ‰ ظ…ط§ظٹظƒطŒ ظ„ط§ ظ†ظ…ط³ط­ظ‡ ظ…ظ† ط§ظ„ط؛ط±ظپط© ط£ط¨ط¯ط§ظ‹
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

    // 2) ظپط±ظ‘ط؛ ط§ظ„ظ…ط§ظٹظƒط§طھ ط§ظ„طھظٹ ط£طµط­ط§ط¨ظ‡ط§ ط®ط±ط¬ظˆط§
    const deadSeats = await ctx.db
      .query("micSeats")
      .take(500);

    let clearedSeats = 0;
    for (const s of deadSeats) {
      if (!s.userId) continue;
      // ظ‡ظ„ ظ‡ط°ط§ ط§ظ„ظ…ط³طھط®ط¯ظ… ظ†ط´ط· ظپظٹ ظ‡ط°ظ‡ ط§ظ„ط؛ط±ظپط©طں
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

    // 3) ظ†ط¸ظ‘ظپ roomEntries ط§ظ„ط£ظ‚ط¯ظ… ظ…ظ† ط³ط§ط¹ط©
    const oldEntries = await ctx.db
      .query("roomEntries")
      .filter((q) => q.lt(q.field("createdAt"), Date.now() - 60 * 60 * 1000))
      .take(500);
    for (const e of oldEntries) await ctx.db.delete("roomEntries", e._id);

    return { ok: true, removed, clearedSeats, entriesCleaned: oldEntries.length };
  },
});

// ============================================================
// roomCharmTotals â€” ط¹ط¯ظ‘ط§ط¯ ط§ظ„ط¬ط§ط°ط¨ظٹط© ظپظٹ ط§ظ„ط¬ظ„ط³ط© ظ„ظƒظ„ ظ…ط§ظٹظƒ
// ============================================================
export const roomCharmTotals = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    const seats = await ctx.db
      .query("micSeats")
      .withIndex("by_room_and_seatIndex", (q) => q.eq("roomId", args.roomId))
      .take(MAX_SEATS);

    // map: seatIndex â†’ sessionCharms
    const totals: Record<number, number> = {};
    for (const s of seats) {
      totals[s.seatIndex] = s.sessionCharms ?? 0;
    }
    return totals;
  },
});

// ============================================================
// recentEntries â€” ط£ط­ط¯ط§ط« ط¯ط®ظˆظ„ VIP ط­ط¯ظٹط«ط© (ط®ظ„ط§ظ„ ط¢ط®ط± 10 ط«ظˆط§ظ†ظچ)
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

