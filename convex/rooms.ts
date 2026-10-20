import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getMember, requireUser } from "./lib/auth";
import { levelFromValue } from "./lib/levels";
import { activeVipLevel } from "./lib/vip";
import { weekKey } from "./lib/week";
import type { Id } from "./_generated/dataModel";

const ROOM_NUMBER_START = 100000; // 6 digits default

async function getNextRoomNumber(ctx: any): Promise<number> {
  const counter = await ctx.db
    .query("counters")
    .withIndex("by_name", (q: any) => q.eq("name", "roomNumber"))
    .unique();
  if (!counter) {
    await ctx.db.insert("counters", { name: "roomNumber", value: ROOM_NUMBER_START + 1 });
    return ROOM_NUMBER_START;
  }
  const current = counter.value;
  await ctx.db.patch("counters", counter._id, { value: current + 1 });
  return current;
}

const DEFAULT_STAFF_PERMISSIONS = {
  roomImage: true,
  roomName: true,
  announcement: true,
  welcomeMessage: true,
  staffSettings: true,
  blacklist: true,
  micManagement: true,
  roomBackground: false,
  roomLock: false,
  agencyMode: false,
  screenClear: false,
};

export const listPublic = query({
  args: {},
  handler: async (ctx) => {
    const rooms = await ctx.db.query("rooms").withIndex("by_isPrivate", (q) => q.eq("isPrivate", false)).order("desc").take(50);
    const enriched = await Promise.all(rooms.map(async (r) => {
      const coverUrl = r.coverUrl ?? (r.coverImageId ? await ctx.storage.getUrl(r.coverImageId) : null);
      return { ...r, coverUrl };
    }));
    return enriched;
  },
});

// [moorawi-rooms] Get current user's own room (max 1)
export const myRoom = query({
  args: { tokenOverride: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (!args.tokenOverride) return null;
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", args.tokenOverride!))
      .unique();
    if (!user) return null;
    const rooms = await ctx.db
      .query("rooms")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .take(1);
    if (rooms.length === 0) return null;
    const r = rooms[0];
    const coverUrl = r.coverUrl ?? (r.coverImageId ? await ctx.storage.getUrl(r.coverImageId) : null);
    return { ...r, coverUrl };
  },
});

export const get = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    const room = await ctx.db.get("rooms", args.roomId);
    if (!room) return null;
    const coverUrl = room.coverUrl ?? (room.coverImageId ? await ctx.storage.getUrl(room.coverImageId) : null);
    const backgroundUrl = room.backgroundUrl ?? (room.backgroundImageId ? await ctx.storage.getUrl(room.backgroundImageId) : null);
    return { ...room, coverUrl, backgroundUrl };
  },
});

export const create = mutation({
  args: { name: v.string(), description: v.optional(v.string()), isPrivate: v.boolean(), tokenOverride: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.tokenOverride);

    // [moorawi-rooms] منع تعدد الغرف: إن كان للمستخدم غرفة → أعدها
    const existing = await ctx.db
      .query("rooms")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .take(1);
    if (existing.length > 0) {
      return existing[0]._id;
    }

    const name = args.name.trim();
    if (name.length < 2 || name.length > 40) throw new ConvexError({ code: "BAD_REQUEST", message: "Room name must be 2-40 chars" });
    const roomNumber = await getNextRoomNumber(ctx);
    const roomId = await ctx.db.insert("rooms", {
      name, description: args.description?.trim() || undefined, ownerId: user._id,
      isPrivate: args.isPrivate, micCount: 20, memberCount: 1,
      roomNumber,
      staffPermissions: DEFAULT_STAFF_PERMISSIONS,
    });
    await ctx.db.insert("roomMembers", { roomId, userId: user._id, role: "owner" });
    for (let i = 0; i < 20; i++) await ctx.db.insert("micSeats", { roomId, seatIndex: i, locked: false, muted: false });
    return roomId;
  },
});

export const join = mutation({
  args: { roomId: v.id("rooms"), tokenOverride: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.tokenOverride);
    const room = await ctx.db.get("rooms", args.roomId);
    if (!room) throw new ConvexError({ code: "NOT_FOUND", message: "Room not found" });
    const existing = await getMember(ctx, args.roomId, user._id);
    if (existing?.banned) throw new ConvexError({ code: "FORBIDDEN", message: "You are banned" });
    if (existing) return null;

    // [ezo-lock] فحص القفل — المالك/المشرف/السوبر يتخطون القفل
    const isOwner = room.ownerId === user._id;
    const isSuper = user.adminRole === "super" || user.userNumber === 1;
    if (room.isLocked && !isOwner && !isSuper) {
      throw new ConvexError({ code: "LOCKED", message: "الغرفة مقفلة — تحتاج كلمة مرور" });
    }

    await ctx.db.insert("roomMembers", { roomId: args.roomId, userId: user._id, role: "listener" });
    await ctx.db.patch("rooms", args.roomId, { memberCount: room.memberCount + 1 });
    return null;
  },
});

export const members = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    const members = await ctx.db.query("roomMembers").withIndex("by_room", (q) => q.eq("roomId", args.roomId)).take(100);
    return await Promise.all(members.map(async (m) => {
      const user = await ctx.db.get("users", m.userId);
      const avatarUrl = user?.avatarUrl ?? (user?.avatarId ? await ctx.storage.getUrl(user.avatarId) : null);
      return {
        _id: m._id,
        userId: m.userId,
        role: m.role,
          verified: user?.verificationStatus === "approved",
        name: user?.name ?? "ضيف",
        username: user?.username ?? null,
        userNumber: user?.userNumber ?? null,
        avatarUrl,
        vip: activeVipLevel(user),
        charmLevel: levelFromValue(user?.totalReceived ?? 0),
        charmValue: user?.charms ?? 0,
        wealthValue: user?.totalSent ?? 0,
        adminRole: user?.adminRole ?? null,
        charms: user?.charms ?? 0,
      };
    }));
  },
});

export const updateLayout = mutation({
  args: { roomId: v.id("rooms"), micLayout: v.string(), tokenOverride: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.tokenOverride);
    const room = await ctx.db.get("rooms", args.roomId);
    if (!room) throw new ConvexError({ code: "NOT_FOUND", message: "Room not found" });
    const member = await getMember(ctx, args.roomId, user._id);
    if (!member || (member.role !== "owner" && member.role !== "moderator")) throw new ConvexError({ code: "FORBIDDEN", message: "Only owner" });
    await ctx.db.patch("rooms", args.roomId, { micLayout: args.micLayout });
    return null;
  },
});

// (تم حذف generateRoomUploadUrl — نستخدم Cloudinary)

export const updateRoomInfo = mutation({
  args: { roomId: v.id("rooms"), name: v.optional(v.string()), welcomeMessage: v.optional(v.string()), coverUrl: v.optional(v.string()), tokenOverride: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.tokenOverride);
    const room = await ctx.db.get("rooms", args.roomId);
    if (!room) throw new ConvexError({ code: "NOT_FOUND", message: "Room not found" });
    const member = await getMember(ctx, args.roomId, user._id);
    if (!member || (member.role !== "owner" && member.role !== "moderator")) throw new ConvexError({ code: "FORBIDDEN", message: "Only owner" });
    const patch: any = {};
    if (args.name !== undefined) {
      const n = args.name.trim();
      if (n.length < 2 || n.length > 40) throw new ConvexError({ code: "BAD_REQUEST", message: "اسم غير صالح" });
      patch.name = n;
    }
    if (args.welcomeMessage !== undefined) patch.welcomeMessage = args.welcomeMessage.trim().slice(0, 200);
    if (args.coverUrl) patch.coverUrl = args.coverUrl;
    await ctx.db.patch("rooms", args.roomId, patch);
    return null;
  },
});

export const updateRoomBackground = mutation({
  args: { roomId: v.id("rooms"), backgroundUrl: v.optional(v.string()), tokenOverride: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.tokenOverride);
    const room = await ctx.db.get("rooms", args.roomId);
    if (!room) throw new ConvexError({ code: "NOT_FOUND", message: "Room not found" });
    const member = await getMember(ctx, args.roomId, user._id);
    if (!member || (member.role !== "owner" && member.role !== "moderator")) throw new ConvexError({ code: "FORBIDDEN", message: "Only owner" });
    await ctx.db.patch("rooms", args.roomId, { backgroundUrl: args.backgroundUrl });
    return null;
  },
});

// [moorawi-trophy] Get room's weekly spent coins (lazy reset)
export const weeklyTotal = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    const room = await ctx.db.get("rooms", args.roomId);
    if (!room) return { total: 0, tier: 0, cycleKey: "" };

    // Lazy reset — if stored cycleKey is old, current week total = 0
    const current = weekKey();
    if (room.weeklyCycleKey !== current) {
      return { total: 0, tier: 0, cycleKey: current };
    }

    const total = room.weeklyTotal ?? 0;
    // Compute tier: 0, 1, 3, 6 (million)
    const millions = total / 1_000_000;
    let tier = 0;
    if (millions >= 6) tier = 6;
    else if (millions >= 3) tier = 3;
    else if (millions >= 1) tier = 1;

    return { total, tier, cycleKey: current };
  },
});

// [moorawi-staff] Get staff permissions for a room (owner/mod only)
export const getStaffPermissions = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    const room = await ctx.db.get("rooms", args.roomId);
    if (!room) return null;
    return room.staffPermissions ?? {
      roomImage: true, roomName: true, announcement: true, welcomeMessage: true,
      staffSettings: true, blacklist: true, micManagement: true,
      roomBackground: false, roomLock: false, agencyMode: false, screenClear: false,
    };
  },
});

// [moorawi-staff] Update staff permissions (owner only)
export const updateStaffPermissions = mutation({
  args: {
    roomId: v.id("rooms"),
    permissions: v.object({
      roomImage: v.boolean(),
      roomName: v.boolean(),
      announcement: v.boolean(),
      welcomeMessage: v.boolean(),
      staffSettings: v.boolean(),
      blacklist: v.boolean(),
      micManagement: v.boolean(),
      roomBackground: v.boolean(),
      roomLock: v.boolean(),
      agencyMode: v.boolean(),
      screenClear: v.boolean(),
    }),
    tokenOverride: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.tokenOverride);
    const room = await ctx.db.get("rooms", args.roomId);
    if (!room) throw new ConvexError({ code: "NOT_FOUND", message: "الغرفة غير موجودة" });
    if (room.ownerId !== user._id) {
      throw new ConvexError({ code: "FORBIDDEN", message: "للمالك فقط" });
    }
    await ctx.db.patch("rooms", args.roomId, { staffPermissions: args.permissions });
    return { ok: true };
  },
});

// ============================================================
// [moorawi-rooms] Discovery queries — Ezo rooms tab
// ============================================================

// Recently visited rooms (from roomMembers — rooms user joined)
export const listRecent = query({
  args: { tokenOverride: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);

    const memberships = await ctx.db
      .query("roomMembers")
      .withIndex("by_user", (q: any) => q.eq("userId", me._id))
      .order("desc")
      .take(30);

    // Dedupe by roomId
    const seen = new Set<string>();
    const roomIds: any[] = [];
    for (const m of memberships) {
      const key = m.roomId as string;
      if (seen.has(key)) continue;
      seen.add(key);
      roomIds.push(m.roomId);
      if (roomIds.length >= 20) break;
    }

    const rooms = [];
    for (const rid of roomIds) {
      const r = await ctx.db.get("rooms", rid);
      if (!r || r.isPrivate) continue;
      const owner = await ctx.db.get("users", r.ownerId);
      const ownerAvatar = owner?.avatarUrl ?? (owner?.avatarId ? await ctx.storage.getUrl(owner.avatarId) : null);
      rooms.push({
        _id: r._id,
        name: r.name,
        coverUrl: r.coverUrl ?? null,
        welcomeMessage: r.welcomeMessage ?? "",
        memberCount: r.memberCount,
        roomNumber: r.roomNumber ?? null,
        ownerName: owner?.name ?? "—",
        ownerAvatar,
        ownerUserNumber: owner?.userNumber ?? null,
      });
    }
    return rooms;
  },
});

// Rooms of people I follow
export const listFollowing = query({
  args: { tokenOverride: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    // Get who I follow
    const follows = await ctx.db
      .query("follows")
      .withIndex("by_follower", (q: any) => q.eq("followerId", me._id))
      .take(200);

    const followedIds = new Set(follows.map((f: any) => f.followingId as string));
    if (followedIds.size === 0) return [];

    // Get their rooms
    const allRooms = await ctx.db.query("rooms").take(300);
    const rooms = [];
    for (const r of allRooms) {
      if (!followedIds.has(r.ownerId as string)) continue;
      const owner = await ctx.db.get("users", r.ownerId);
      const ownerAvatar = owner?.avatarUrl ?? (owner?.avatarId ? await ctx.storage.getUrl(owner.avatarId) : null);
      rooms.push({
        _id: r._id,
        name: r.name,
        coverUrl: r.coverUrl ?? null,
        welcomeMessage: r.welcomeMessage ?? "",
        memberCount: r.memberCount,
        roomNumber: r.roomNumber ?? null,
        ownerName: owner?.name ?? "—",
        ownerAvatar,
        ownerUserNumber: owner?.userNumber ?? null,
      });
    }
    return rooms;
  },
});

// Trending — sorted by activity (weeklyTotal + memberCount)
export const listTrending = query({
  args: {},
  handler: async (ctx) => {
    const rooms = await ctx.db.query("rooms").take(100);
    // Sort by memberCount desc
    const sorted = rooms.sort((a, b) => (b.memberCount ?? 0) - (a.memberCount ?? 0));
    const result = [];
    for (const r of sorted.slice(0, 30)) {
      const owner = await ctx.db.get("users", r.ownerId);
      const ownerAvatar = owner?.avatarUrl ?? (owner?.avatarId ? await ctx.storage.getUrl(owner.avatarId) : null);
      result.push({
        _id: r._id,
        name: r.name,
        coverUrl: r.coverUrl ?? null,
        welcomeMessage: r.welcomeMessage ?? "",
        memberCount: r.memberCount,
        roomNumber: r.roomNumber ?? null,
        ownerName: owner?.name ?? "—",
        ownerAvatar,
        ownerUserNumber: owner?.userNumber ?? null,
      });
    }
    return result;
  },
});

// New — sorted by creation time desc
export const listNew = query({
  args: {},
  handler: async (ctx) => {
    const rooms = await ctx.db.query("rooms").order("desc").take(30);
    const result = [];
    for (const r of rooms) {
      const owner = await ctx.db.get("users", r.ownerId);
      const ownerAvatar = owner?.avatarUrl ?? (owner?.avatarId ? await ctx.storage.getUrl(owner.avatarId) : null);
      result.push({
        _id: r._id,
        name: r.name,
        coverUrl: r.coverUrl ?? null,
        welcomeMessage: r.welcomeMessage ?? "",
        memberCount: r.memberCount,
        roomNumber: r.roomNumber ?? null,
        ownerName: owner?.name ?? "—",
        ownerAvatar,
        ownerUserNumber: owner?.userNumber ?? null,
      });
    }
    return result;
  },
});

// ============================================================
// ============================================================
// [ezo-rankings] wealthRanking — ترتيب المنفقين (حقيقي، بفترات زمنية)
// ============================================================
export const wealthRanking = query({
  args: {
    period: v.optional(v.union(v.literal("week"), v.literal("month"), v.literal("all"))),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const period = args.period ?? "month";
    const limit = Math.min(args.limit ?? 100, 200);
    const now = Date.now();

    let since = 0;
    if (period === "week") since = now - 7 * 24 * 60 * 60 * 1000;
    else if (period === "month") since = now - 30 * 24 * 60 * 60 * 1000;
    // "all" → since = 0

    const totals: Record<string, number> = {};

    if (period === "all") {
      // استخدم users.totalSent مباشرة (أسرع + دقيق)
      const users = await ctx.db
        .query("users")
        .withIndex("by_totalSent")
        .order("desc")
        .take(limit);
      for (const u of users) {
        const t = u.totalSent ?? 0;
        if (t > 0) totals[u._id as string] = t;
      }
    } else {
      // اقرأ آخر 5000 معاملة وفلتر زمنياً (bounded)
      const txs = await ctx.db
        .query("giftTransactions")
        .order("desc")
        .take(5000);
      for (const t of txs) {
        if (t._creationTime < since) continue;
        const k = t.fromUserId as string;
        totals[k] = (totals[k] ?? 0) + t.totalPrice;
      }
    }

    const sorted = Object.entries(totals)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit);

    const enriched = await Promise.all(
      sorted.map(async ([userId, total], idx) => {
        const u = await ctx.db.get("users", userId as Id<"users">);
        if (!u) return null;
        const avatarUrl =
          u.avatarUrl ?? (u.avatarId ? await ctx.storage.getUrl(u.avatarId) : null);
        return {
          rank: idx + 1,
          userId,
          name: u.name ?? "ضيف",
          userNumber: u.userNumber ?? null,
          avatarUrl,
          total,
          level: levelFromValue(total),
          vip: activeVipLevel(u),
          isTop3: idx < 3,
          isTop100: idx < 100,
        };
      })
    );

    return enriched.filter((x): x is NonNullable<typeof x> => x !== null);
  },
});

// ============================================================
// [ezo-rankings] mySupporterRank — ترتيب المستخدم الحالي
// ============================================================
export const mySupporterRank = query({
  args: {
    tokenOverride: v.optional(v.string()),
    period: v.optional(v.union(v.literal("week"), v.literal("month"), v.literal("all"))),
  },
  handler: async (ctx, args) => {
    if (!args.tokenOverride) return null;
    const me = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", args.tokenOverride!))
      .unique();
    if (!me) return null;

    const period = args.period ?? "month";
    const now = Date.now();

    let since = 0;
    if (period === "week") since = now - 7 * 24 * 60 * 60 * 1000;
    else if (period === "month") since = now - 30 * 24 * 60 * 60 * 1000;

    const totals: Record<string, number> = {};

    if (period === "all") {
      const users = await ctx.db
        .query("users")
        .withIndex("by_totalSent")
        .order("desc")
        .take(500);
      for (const u of users) {
        const t = u.totalSent ?? 0;
        if (t > 0) totals[u._id as string] = t;
      }
    } else {
      const txs = await ctx.db
        .query("giftTransactions")
        .order("desc")
        .take(5000);
      for (const t of txs) {
        if (t._creationTime < since) continue;
        const k = t.fromUserId as string;
        totals[k] = (totals[k] ?? 0) + t.totalPrice;
      }
    }

    const sorted = Object.entries(totals)
      .sort(([, a], [, b]) => b - a);

    const myIdx = sorted.findIndex(([uid]) => uid === me._id);
    if (myIdx < 0) return null;

    const myTotal = sorted[myIdx][1];
    return {
      rank: myIdx + 1,
      total: myTotal,
      level: levelFromValue(myTotal),
      isTop3: myIdx < 3,
      isTop100: myIdx < 100,
    };
  },
});

// ============================================================
// [moorawi-rankings] cpRanking — top CP pairs by loveScore
// ============================================================
export const cpRanking = query({
  args: {},
  handler: async (ctx) => {
    const rels = await ctx.db.query("relationships").collect();
    const cps = rels.filter((r) => (r.type === "cp" || r.type === "trueLove") && r.status === "active");
    const sorted = cps.sort((a, b) => (b.loveScore ?? 0) - (a.loveScore ?? 0)).slice(0, 2);

    const enriched = await Promise.all(
      sorted.map(async (r) => {
        const u1 = await ctx.db.get("users", r.userId1);
        const u2 = await ctx.db.get("users", r.userId2);
        return {
          _id: r._id,
          type: r.type,
          loveScore: r.loveScore,
          since: r.since,
          user1: {
            userId: r.userId1,
            name: u1?.name ?? "ضيف",
            userNumber: u1?.userNumber ?? null,
            avatarUrl: u1?.avatarUrl ?? (u1?.avatarId ? await ctx.storage.getUrl(u1.avatarId) : null),
            vip: activeVipLevel(u1),
          },
          user2: {
            userId: r.userId2,
            name: u2?.name ?? "ضيف",
            userNumber: u2?.userNumber ?? null,
            avatarUrl: u2?.avatarUrl ?? (u2?.avatarId ? await ctx.storage.getUrl(u2.avatarId) : null),
            vip: activeVipLevel(u2),
          },
        };
      })
    );
    return enriched;
  },
});

// ============================================================
// [moorawi-rankings] publicRoomsWithStats — rooms sorted by activity
// Each room enriched with onlineCount + top3 rank (if top 3)
// ============================================================
export const publicRoomsWithStats = query({
  args: {},
  handler: async (ctx) => {
    const sorted = await ctx.db
      .query("rooms")
      .withIndex("by_weeklyTotal")
      .order("desc")
      .filter((q) => q.eq(q.field("isPrivate"), false))
      .take(40);


    const enriched = await Promise.all(
      sorted.slice(0, 30).map(async (r, idx) => {
        const owner = await ctx.db.get("users", r.ownerId);
        const members = await ctx.db
          .query("roomMembers")
          .withIndex("by_room", (q) => q.eq("roomId", r._id))
          .collect();

        return {
          _id: r._id,
          name: r.name,
          coverUrl: r.coverUrl ?? null,
          welcomeMessage: r.welcomeMessage ?? "",
          memberCount: r.memberCount ?? 0,
          onlineCount: members.length,
          roomNumber: r.roomNumber ?? null,
          weeklyTotal: r.weeklyTotal ?? 0,
          rank: idx + 1,
          ownerName: owner?.name ?? "—",
          ownerAvatar: owner?.avatarUrl ?? (owner?.avatarId ? await ctx.storage.getUrl(owner.avatarId) : null),
          ownerUserNumber: owner?.userNumber ?? null,
        };
      })
    );
    return enriched;
  },
});

// ============================================================
// [moorawi-rooms] search — by name or roomNumber
// ============================================================
export const search = query({
  args: { q: v.string() },
  handler: async (ctx, args) => {
    const q = args.q.trim().toLowerCase();
    if (q.length < 1) return [];

    // Bounded read: at most 500 rooms to search through
    const rooms = await ctx.db.query("rooms").take(500);
    const isNum = /^\d+$/.test(q);

    const matched = rooms.filter((r) => {
      if (r.isPrivate) return false;
      const nameMatch = (r.name ?? "").toLowerCase().includes(q);
      const numMatch = isNum && r.roomNumber !== undefined && String(r.roomNumber).includes(q);
      return nameMatch || numMatch;
    }).slice(0, 30);

    const enriched = await Promise.all(
      matched.map(async (r) => {
        const owner = await ctx.db.get("users", r.ownerId);
        const members = await ctx.db
          .query("roomMembers")
          .withIndex("by_room", (q2) => q2.eq("roomId", r._id))
          .collect();
        return {
          _id: r._id,
          name: r.name,
          coverUrl: r.coverUrl ?? null,
          welcomeMessage: r.welcomeMessage ?? "",
          memberCount: r.memberCount ?? 0,
          onlineCount: members.length,
          roomNumber: r.roomNumber ?? null,
          ownerName: owner?.name ?? "—",
          ownerUserNumber: owner?.userNumber ?? null,
        };
      })
    );
    return enriched;
  },
});

// ============================================================
// [moorawi-rankings] legendTop — أعلى 3 حسب الفئة
// ============================================================
export const legendTop = query({
  args: { category: v.union(v.literal("wealth"), v.literal("charm"), v.literal("gifters")) },
  handler: async (ctx, args) => {
    // Use indexes to fetch only top 3 without scanning the whole users table.
    let top: any[] = [];
    let valueOf: (u: any) => number = () => 0;
    if (args.category === "wealth") {
      top = await ctx.db.query("users").withIndex("by_totalSent").order("desc").take(3);
      valueOf = (u) => u.totalSent ?? 0;
    } else if (args.category === "charm") {
      top = await ctx.db.query("users").withIndex("by_charms").order("desc").take(3);
      valueOf = (u) => u.charms ?? 0;
    } else {
      top = await ctx.db.query("users").withIndex("by_totalReceived").order("desc").take(3);
      valueOf = (u) => u.totalReceived ?? 0;
    }
    const enriched = await Promise.all(
      top.map(async (u) => {
        return {
          userId: u._id,
          name: u.name ?? "—",
          userNumber: u.userNumber ?? null,
          avatarUrl: u.avatarUrl ?? (u.avatarId ? await ctx.storage.getUrl(u.avatarId) : null),
          value: valueOf(u),
        };
      })
    );
    return enriched;
  },
});

// ================================================================
// [ezo-lock] قفل الغرفة
// ================================================================
export const toggleRoomLock = mutation({
  args: {
    roomId: v.id("rooms"),
    locked: v.boolean(),
    password: v.optional(v.string()),
    tokenOverride: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    const room = await ctx.db.get("rooms", args.roomId);
    if (!room) throw new Error("الغرفة غير موجودة");

    // فقط owner أو مشرف مع صلاحية roomLock
    const member = await ctx.db
      .query("roomMembers")
      .withIndex("by_room_and_user", (q) => q.eq("roomId", args.roomId).eq("userId", me._id))
      .unique();
    if (!member || (member.role !== "owner" && member.role !== "moderator")) {
      throw new Error("غير مصرح");
    }
    if (member.role === "moderator" && !room.staffPermissions?.roomLock) {
      throw new Error("ليس لديك صلاحية قفل الغرفة");
    }

    const patch: any = { isLocked: args.locked };
    if (args.locked && args.password && args.password.length > 0) {
      patch.lockPassword = args.password;
    } else if (!args.locked) {
      patch.lockPassword = undefined;
    }
    await ctx.db.patch("rooms", args.roomId, patch);
    return { ok: true };
  },
});

// فحص كلمة مرور الغرفة
export const verifyRoomPassword = mutation({
  args: {
    roomId: v.id("rooms"),
    password: v.string(),
    tokenOverride: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db.get("rooms", args.roomId);
    if (!room) throw new Error("الغرفة غير موجودة");
    if (!room.isLocked) return { ok: true };
    if (room.lockPassword && room.lockPassword !== args.password) {
      throw new Error("كلمة المرور خاطئة");
    }
    return { ok: true };
  },
});

// ================================================================
// [ezo-music] تشغيل الموسيقى في الغرفة
// ================================================================
export const playRoomMusic = mutation({
  args: {
    roomId: v.id("rooms"),
    musicId: v.id("userMusic"),
    tokenOverride: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    const room = await ctx.db.get("rooms", args.roomId);
    if (!room) throw new Error("الغرفة غير موجودة");

    const member = await ctx.db
      .query("roomMembers")
      .withIndex("by_room_and_user", (q) => q.eq("roomId", args.roomId).eq("userId", me._id))
      .unique();
    if (!member || (member.role !== "owner" && member.role !== "moderator")) {
      throw new Error("غير مصرح");
    }

    const music = await ctx.db.get("userMusic", args.musicId);
    if (!music) throw new Error("الأغنية غير موجودة");

    await ctx.db.patch("rooms", args.roomId, {
      currentMusicId: args.musicId,
      currentMusicUrl: music.url,
      currentMusicName: music.name,
      currentMusicStartedBy: me._id,
      currentMusicStartedAt: Date.now(),
      currentMusicPausedAt: undefined,
      currentMusicIsPaused: false,
    });
    return { ok: true };
  },
});

export const pauseRoomMusic = mutation({
  args: {
    roomId: v.id("rooms"),
    positionSec: v.number(),
    tokenOverride: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    const room = await ctx.db.get("rooms", args.roomId);
    if (!room) throw new Error("الغرفة غير موجودة");
    const member = await ctx.db
      .query("roomMembers")
      .withIndex("by_room_and_user", (q) => q.eq("roomId", args.roomId).eq("userId", me._id))
      .unique();
    if (!member || (member.role !== "owner" && member.role !== "moderator")) {
      throw new Error("غير مصرح");
    }
    await ctx.db.patch("rooms", args.roomId, {
      currentMusicPausedAt: args.positionSec,
      currentMusicIsPaused: true,
    });
    return { ok: true };
  },
});

export const resumeRoomMusic = mutation({
  args: { roomId: v.id("rooms"), tokenOverride: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    const room = await ctx.db.get("rooms", args.roomId);
    if (!room) throw new Error("الغرفة غير موجودة");
    const member = await ctx.db
      .query("roomMembers")
      .withIndex("by_room_and_user", (q) => q.eq("roomId", args.roomId).eq("userId", me._id))
      .unique();
    if (!member || (member.role !== "owner" && member.role !== "moderator")) {
      throw new Error("غير مصرح");
    }
    await ctx.db.patch("rooms", args.roomId, { currentMusicIsPaused: false });
    return { ok: true };
  },
});

export const stopRoomMusic = mutation({
  args: { roomId: v.id("rooms"), tokenOverride: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    const room = await ctx.db.get("rooms", args.roomId);
    if (!room) throw new Error("الغرفة غير موجودة");
    const member = await ctx.db
      .query("roomMembers")
      .withIndex("by_room_and_user", (q) => q.eq("roomId", args.roomId).eq("userId", me._id))
      .unique();
    if (!member || (member.role !== "owner" && member.role !== "moderator")) {
      throw new Error("غير مصرح");
    }
    await ctx.db.patch("rooms", args.roomId, {
      currentMusicId: undefined,
      currentMusicUrl: undefined,
      currentMusicName: undefined,
      currentMusicStartedBy: undefined,
      currentMusicStartedAt: undefined,
      currentMusicPausedAt: undefined,
      currentMusicIsPaused: undefined,
    });
    return { ok: true };
  },
});

// ================================================================
// [ezo-spend] صرف في الغرفة (دعم المالك + كأس الروم)
// ================================================================
export const spendInRoom = mutation({
  args: {
    roomId: v.id("rooms"),
    amount: v.number(),
    tokenOverride: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    if (args.amount <= 0) throw new Error("المبلغ غير صالح");
    const room = await ctx.db.get("rooms", args.roomId);
    if (!room) throw new Error("الغرفة غير موجودة");

    const myCoins = me.coins ?? 0;
    if (myCoins < args.amount) throw new Error("رصيدك غير كافٍ");

    // خصم مني
    await ctx.db.patch("users", me._id, {
      coins: myCoins - args.amount,
      totalSent: (me.totalSent ?? 0) + args.amount,
    });

    // إضافة للمالك
    const owner = await ctx.db.get("users", room.ownerId);
    if (owner) {
      await ctx.db.patch("users", owner._id, {
        coins: (owner.coins ?? 0) + args.amount,
        totalReceived: (owner.totalReceived ?? 0) + args.amount,
        charms: (owner.charms ?? 0) + args.amount,
      });
    }

    // تحديث كأس الروم
    await ctx.db.patch("rooms", args.roomId, {
      weeklyTotal: (room.weeklyTotal ?? 0) + args.amount,
    });

    // سجل العملية
    await ctx.db.insert("walletTransactions", {
      userId: me._id,
      type: "spend",
      amount: -args.amount,
      balanceAfter: myCoins - args.amount,
      meta: `دعم في غرفة: ${room.name}`,
      createdAt: Date.now(),
    });

    return { ok: true, amount: args.amount };
  },
});

// ================================================================
// [ezo-deco] ديكور الغرفة (إضافة/إزالة عنصر مملوك)
// ================================================================
export const addRoomDecoration = mutation({
  args: {
    roomId: v.id("rooms"),
    itemId: v.id("shopItems"),
    tokenOverride: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    const room = await ctx.db.get("rooms", args.roomId);
    if (!room) throw new Error("الغرفة غير موجودة");
    if (room.ownerId !== me._id) throw new Error("فقط المالك يمكنه إضافة ديكور");

    const item = await ctx.db.get("shopItems", args.itemId);
    if (!item) throw new Error("المنتج غير موجود");
    if (item.category !== "decoration") throw new Error("هذا ليس ديكور");

    // تأكد أن المالك يملك العنصر
    const inv = await ctx.db
      .query("userInventory")
      .withIndex("by_user_and_item", (q) => q.eq("userId", me._id).eq("itemId", args.itemId))
      .first();
    if (!inv) throw new Error("لا تملك هذا الديكور");

    const current = room.roomDecorations ?? [];
    if (current.includes(args.itemId)) return { ok: true, already: true };

    await ctx.db.patch("rooms", args.roomId, {
      roomDecorations: [...current, args.itemId],
    });
    return { ok: true };
  },
});

export const removeRoomDecoration = mutation({
  args: {
    roomId: v.id("rooms"),
    itemId: v.id("shopItems"),
    tokenOverride: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    const room = await ctx.db.get("rooms", args.roomId);
    if (!room) throw new Error("الغرفة غير موجودة");
    if (room.ownerId !== me._id) throw new Error("فقط المالك");

    const current = room.roomDecorations ?? [];
    await ctx.db.patch("rooms", args.roomId, {
      roomDecorations: current.filter((id) => id !== args.itemId),
    });
    return { ok: true };
  },
});

// ================================================================
// [ezo-effects] تأثيرات الغرفة (خلفية/مركبة/هدية/صوت)
// ================================================================
export const setScreenEffect = mutation({
  args: {
    roomId: v.id("rooms"),
    effect: v.union(
      v.literal("none"),
      v.literal("blur"),
      v.literal("dim"),
      v.literal("warm"),
      v.literal("cool"),
    ),
    tokenOverride: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    const room = await ctx.db.get("rooms", args.roomId);
    if (!room) throw new Error("الغرفة غير موجودة");
    const member = await ctx.db
      .query("roomMembers")
      .withIndex("by_room_and_user", (q) => q.eq("roomId", args.roomId).eq("userId", me._id))
      .unique();
    if (!member || (member.role !== "owner" && member.role !== "moderator")) {
      throw new Error("غير مصرح");
    }
    await ctx.db.patch("rooms", args.roomId, { screenEffect: args.effect });
    return { ok: true };
  },
});

export const triggerVehicleEffect = mutation({
  args: {
    roomId: v.id("rooms"),
    itemId: v.id("shopItems"),
    tokenOverride: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    const room = await ctx.db.get("rooms", args.roomId);
    if (!room) throw new Error("الغرفة غير موجودة");

    const item = await ctx.db.get("shopItems", args.itemId);
    if (!item) throw new Error("العنصر غير موجود");
    if (item.category !== "vehicle" && item.category !== "entryEffect") {
      throw new Error("هذا ليس مركبة/دخول");
    }

    const inv = await ctx.db
      .query("userInventory")
      .withIndex("by_user_and_item", (q) => q.eq("userId", me._id).eq("itemId", args.itemId))
      .first();
    if (!inv) throw new Error("لا تملك هذا العنصر");

    await ctx.db.patch("rooms", args.roomId, {
      vehicleEffectId: args.itemId,
      vehicleEffectStartedAt: Date.now(),
    });
    return { ok: true };
  },
});

export const triggerGiftEffect = mutation({
  args: {
    roomId: v.id("rooms"),
    itemId: v.id("shopItems"),
    tokenOverride: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    const room = await ctx.db.get("rooms", args.roomId);
    if (!room) throw new Error("الغرفة غير موجودة");

    const item = await ctx.db.get("shopItems", args.itemId);
    if (!item) throw new Error("العنصر غير موجود");
    if (item.category !== "entryEffect") throw new Error("هذا ليس تأثير هدية");

    const inv = await ctx.db
      .query("userInventory")
      .withIndex("by_user_and_item", (q) => q.eq("userId", me._id).eq("itemId", args.itemId))
      .first();
    if (!inv) throw new Error("لا تملك هذا العنصر");

    await ctx.db.patch("rooms", args.roomId, {
      giftEffectId: args.itemId,
      giftEffectStartedAt: Date.now(),
    });
    return { ok: true };
  },
});

export const setVoiceChanger = mutation({
  args: {
    roomId: v.id("rooms"),
    effect: v.union(
      v.literal("none"),
      v.literal("robot"),
      v.literal("chipmunk"),
      v.literal("deep"),
      v.literal("echo"),
    ),
    tokenOverride: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    const room = await ctx.db.get("rooms", args.roomId);
    if (!room) throw new Error("الغرفة غير موجودة");
    await ctx.db.patch("rooms", args.roomId, { voiceChangerEffect: args.effect });
    return { ok: true };
  },
});

export const toggleMiniChat = mutation({
  args: {
    roomId: v.id("rooms"),
    enabled: v.boolean(),
    tokenOverride: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    const room = await ctx.db.get("rooms", args.roomId);
    if (!room) throw new Error("الغرفة غير موجودة");
    const member = await ctx.db
      .query("roomMembers")
      .withIndex("by_room_and_user", (q) => q.eq("roomId", args.roomId).eq("userId", me._id))
      .unique();
    if (!member || (member.role !== "owner" && member.role !== "moderator")) {
      throw new Error("غير مصرح");
    }
    await ctx.db.patch("rooms", args.roomId, { miniChatEnabled: args.enabled });
    return { ok: true };
  },
});

// ═══════════════════════════════════════════════════════════
// [ezo-room-presence] الغرفة النشطة للمستخدم الآن (آخر 90 ثانية)
// ═══════════════════════════════════════════════════════════
export const getUserActiveRoom = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const threshold = Date.now() - 90_000;
    const memberships = await ctx.db
      .query("roomMembers")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    const active = memberships.find(
      (m) => (m.lastSeenAt ?? 0) > threshold
    );
    if (!active) return null;
    const room = await ctx.db.get("rooms", active.roomId);
    if (!room) return null;
    const coverUrl =
      room.coverUrl ??
      (room.coverImageId ? await ctx.storage.getUrl(room.coverImageId) : null);
    return {
      roomId: room._id,
      roomName: room.name,
      roomCoverUrl: coverUrl,
      memberCount: room.memberCount ?? 0,
    };
  },
});
