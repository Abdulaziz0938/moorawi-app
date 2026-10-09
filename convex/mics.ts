import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getMember, requireUser } from "./lib/auth";
import { vipLevelFromTotalSent, vipLevelFromTotalReceived } from "./lib/vip";

const MAX_SEATS = 20;

export const state = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    const seats = await ctx.db
      .query("micSeats")
      .withIndex("by_room_and_seatIndex", (q) => q.eq("roomId", args.roomId))
      .take(MAX_SEATS);
    const enriched = await Promise.all(
      seats.map(async (s) => {
        if (!s.userId) return { ...s, userName: null, avatarUrl: null, charms: 0, frame: null, userVip: 0, adminRole: null };
        const user = await ctx.db.get("users", s.userId);
        const avatarUrl = user?.avatarUrl ?? (user?.avatarId ? await ctx.storage.getUrl(user.avatarId) : null);
        return {
          ...s,
          userName: user?.name ?? "ضيف",
          userNumber: user?.userNumber ?? null,
          avatarUrl,
          charms: user?.totalReceived ?? 0,  // [moorawi] 1 coin received = 1 charm
          frame: null,
          userVip: vipLevelFromTotalSent(user?.totalSent ?? 0),
          userCharmLevel: vipLevelFromTotalReceived(user?.totalReceived ?? 0),
          adminRole: user?.adminRole ?? null,
        };
      }),
    );
    return enriched.sort((a, b) => a.seatIndex - b.seatIndex);
  },
});

export const myInfo = query({
  args: { roomId: v.id("rooms"), tokenOverride: v.optional(v.string()) },
  handler: async (ctx, args) => {
    try {
      const user = await requireUser(ctx, args.tokenOverride);
      const member = await getMember(ctx, args.roomId, user._id);
      return {
        userId: user._id,
        userName: user.name ?? "ضيف",
        role: member?.role ?? null,
      };
    } catch { return null; }
  },
});

export const takeSeat = mutation({
  args: { roomId: v.id("rooms"), seatIndex: v.number(), tokenOverride: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.tokenOverride);
    if (args.seatIndex < 0 || args.seatIndex >= MAX_SEATS) throw new ConvexError({ code: "BAD_REQUEST", message: "رقم المايك غير صحيح" });
    const allSeats = await ctx.db.query("micSeats").withIndex("by_room_and_seatIndex", (q) => q.eq("roomId", args.roomId)).take(MAX_SEATS);
    const currentSeat = allSeats.find((s) => s.userId === user._id);
    if (currentSeat && currentSeat.seatIndex === args.seatIndex) return null;
    if (currentSeat) await ctx.db.patch("micSeats", currentSeat._id, { userId: undefined });
    const seat = allSeats.find((s) => s.seatIndex === args.seatIndex);
    if (!seat) throw new ConvexError({ code: "NOT_FOUND", message: "المايك غير موجود" });
    if (seat.locked || seat.userId) throw new ConvexError({ code: "CONFLICT", message: "المايك محجوز" });
    await ctx.db.patch("micSeats", seat._id, { userId: user._id, muted: false, adminMuted: false });
    const member = await getMember(ctx, args.roomId, user._id);
    if (member && member.role === "listener") await ctx.db.patch("roomMembers", member._id, { role: "speaker" });
    return null;
  },
});

export const leaveSeat = mutation({
  args: { roomId: v.id("rooms"), tokenOverride: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.tokenOverride);
    const seats = await ctx.db.query("micSeats").withIndex("by_room_and_seatIndex", (q) => q.eq("roomId", args.roomId)).take(MAX_SEATS);
    const mine = seats.find((s) => s.userId === user._id);
    if (!mine) return null;
    await ctx.db.patch("micSeats", mine._id, { userId: undefined, muted: false, adminMuted: false });
    const member = await getMember(ctx, args.roomId, user._id);
    if (member && member.role === "speaker") await ctx.db.patch("roomMembers", member._id, { role: "listener" });
    return null;
  },
});

export const clearMySeats = mutation({
  args: { roomId: v.id("rooms"), tokenOverride: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.tokenOverride);
    const seats = await ctx.db.query("micSeats").withIndex("by_room_and_seatIndex", (q) => q.eq("roomId", args.roomId)).take(MAX_SEATS);
    for (const s of seats) if (s.userId === user._id) await ctx.db.patch("micSeats", s._id, { userId: undefined, muted: false, adminMuted: false });
    return null;
  },
});

export const toggleLock = mutation({
  args: { roomId: v.id("rooms"), seatIndex: v.number(), tokenOverride: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireUser(ctx, args.tokenOverride);
    const seat = await ctx.db.query("micSeats").withIndex("by_room_and_seatIndex", (q) => q.eq("roomId", args.roomId).eq("seatIndex", args.seatIndex)).unique();
    if (!seat) throw new ConvexError({ code: "NOT_FOUND", message: "المايك غير موجود" });
    await ctx.db.patch("micSeats", seat._id, { locked: !seat.locked });
    return null;
  },
});

export const toggleMuteSeat = mutation({
  args: { roomId: v.id("rooms"), seatIndex: v.number(), tokenOverride: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.tokenOverride);
    const seat = await ctx.db.query("micSeats").withIndex("by_room_and_seatIndex", (q) => q.eq("roomId", args.roomId).eq("seatIndex", args.seatIndex)).unique();
    if (!seat) throw new ConvexError({ code: "NOT_FOUND", message: "المايك غير موجود" });

    const isOwn = seat.userId === user._id;
    const member = await getMember(ctx, args.roomId, user._id);
    const isAdmin = member && (member.role === "owner" || member.role === "moderator");

    // [moorawi] منع المستخدم من إلغاء الكتم الإداري
    if (isOwn && !isAdmin && seat.adminMuted === true) {
      throw new ConvexError({ code: "FORBIDDEN", message: "أنت مكتوم من الإدارة" });
    }

    await ctx.db.patch("micSeats", seat._id, { muted: !seat.muted });
    return null;
  },
});

// [moorawi] الكتم الإداري — owner/mod فقط
export const toggleAdminMute = mutation({
  args: { roomId: v.id("rooms"), seatIndex: v.number(), tokenOverride: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.tokenOverride);
    const seat = await ctx.db.query("micSeats").withIndex("by_room_and_seatIndex", (q) => q.eq("roomId", args.roomId).eq("seatIndex", args.seatIndex)).unique();
    if (!seat) throw new ConvexError({ code: "NOT_FOUND", message: "المايك غير موجود" });

    const member = await getMember(ctx, args.roomId, user._id);
    if (!member || (member.role !== "owner" && member.role !== "moderator")) {
      throw new ConvexError({ code: "FORBIDDEN", message: "صلاحيات غير كافية" });
    }

    const next = !seat.adminMuted;
    await ctx.db.patch("micSeats", seat._id, { adminMuted: next, muted: next });
    return null;
  },
});

export const listeners = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    const members = await ctx.db.query("roomMembers").withIndex("by_room", (q) => q.eq("roomId", args.roomId)).take(100);
    const seats = await ctx.db.query("micSeats").withIndex("by_room_and_seatIndex", (q) => q.eq("roomId", args.roomId)).take(MAX_SEATS);
    const onMicIds = new Set(seats.map((s) => s.userId).filter(Boolean));
    const listeners = members.filter((m) => !onMicIds.has(m.userId) && m.role !== "owner");
    const enriched = await Promise.all(
      listeners.map(async (m) => {
        const user = await ctx.db.get("users", m.userId);
        const avatarUrl = user?.avatarUrl ?? (user?.avatarId ? await ctx.storage.getUrl(user.avatarId) : null);
        // [moorawi-levels] raw values for badges everywhere
        const vip = [1000, 5000, 20000, 50000, 100000, 250000, 500000].filter((x) => (user?.totalSent ?? 0) >= x).length;
        return {
          _id: m._id,
          userId: m.userId,
          name: user?.name ?? "ضيف",
          username: user?.username ?? null,
          userNumber: user?.userNumber ?? null,
          avatarUrl,
          role: m.role,
          charmValue: user?.charms ?? 0,
          wealthValue: user?.totalSent ?? 0,
          vip,
          adminRole: user?.adminRole ?? null,
        };
      }),
    );
    return enriched;
  },
});

export const inviteToSeat = mutation({
  args: { roomId: v.id("rooms"), toUserId: v.id("users"), seatIndex: v.number(), tokenOverride: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.tokenOverride);
    await ctx.db.insert("micInvites", {
      roomId: args.roomId,
      toUserId: args.toUserId,
      fromUserId: user._id,
      fromName: user.name ?? "مستخدم",
      seatIndex: args.seatIndex,
      status: "pending",
    });
    return null;
  },
});

export const myInvite = query({
  args: { roomId: v.id("rooms"), tokenOverride: v.optional(v.string()) },
  handler: async (ctx, args) => {
    try {
      const user = await requireUser(ctx, args.tokenOverride);
      const invites = await ctx.db.query("micInvites").withIndex("by_to_and_status", (q) => q.eq("toUserId", user._id).eq("status", "pending")).take(10);
      const roomInvite = invites.find((i) => i.roomId === args.roomId);
      if (!roomInvite) return null;
      return { _id: roomInvite._id, fromName: roomInvite.fromName, seatIndex: roomInvite.seatIndex };
    } catch { return null; }
  },
});

export const respondInvite = mutation({
  args: { inviteId: v.id("micInvites"), accept: v.boolean(), tokenOverride: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.tokenOverride);
    const invite = await ctx.db.get("micInvites", args.inviteId);
    if (!invite || invite.toUserId !== user._id) return null;
    await ctx.db.patch("micInvites", args.inviteId, { status: args.accept ? "accepted" : "declined" });
    if (args.accept) {
      const seat = await ctx.db.query("micSeats").withIndex("by_room_and_seatIndex", (q) => q.eq("roomId", invite.roomId).eq("seatIndex", invite.seatIndex)).unique();
      if (seat && !seat.locked && !seat.userId) {
        await ctx.db.patch("micSeats", seat._id, { userId: user._id, muted: false, adminMuted: false });
        const member = await getMember(ctx, invite.roomId, user._id);
        if (member && member.role === "listener") await ctx.db.patch("roomMembers", member._id, { role: "speaker" });
      }
    }
    return null;
  },
});

// Send a charm (+1) to a user (for testing gifts; will be replaced by gift system)
export const sendCharm = mutation({
  args: { toUserId: v.id("users"), amount: v.optional(v.number()), tokenOverride: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireUser(ctx, args.tokenOverride);
    const target = await ctx.db.get("users", args.toUserId);
    if (!target) return null;
    const amount = args.amount ?? 1;
    await ctx.db.patch("users", args.toUserId, { charms: (target.charms ?? 0) + amount });
    return null;
  },
});

// ============ [moorawi] نظام طلب المايك ============

// Owner/Mod يفعّل أو يعطّل نظام الطلبات
export const setMicRequestsEnabled = mutation({
  args: { roomId: v.id("rooms"), enabled: v.boolean(), tokenOverride: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.tokenOverride);
    const member = await getMember(ctx, args.roomId, user._id);
    if (!member || (member.role !== "owner" && member.role !== "moderator")) {
      throw new ConvexError({ code: "FORBIDDEN", message: "صلاحيات غير كافية" });
    }
    await ctx.db.patch("rooms", args.roomId, { micRequestsEnabled: args.enabled });
    return null;
  },
});

// Listener يطلب المايك
export const requestMic = mutation({
  args: { roomId: v.id("rooms"), tokenOverride: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.tokenOverride);
    const room = await ctx.db.get("rooms", args.roomId);
    if (!room) throw new ConvexError({ code: "NOT_FOUND", message: "الغرفة غير موجودة" });
    if (!room.micRequestsEnabled) {
      throw new ConvexError({ code: "FORBIDDEN", message: "طلب المايك معطّل" });
    }

    // فحص هل المستخدم أصلاً على مايك
    const seats = await ctx.db.query("micSeats").withIndex("by_room_and_seatIndex", (q) => q.eq("roomId", args.roomId)).take(MAX_SEATS);
    if (seats.some((s) => s.userId === user._id)) return null;

    // فحص هل هناك طلب موجود
    const existing = await ctx.db
      .query("micRequests")
      .withIndex("by_user_and_room", (q) => q.eq("userId", user._id).eq("roomId", args.roomId))
      .first();
    if (existing) return existing._id;

    const avatarUrl = user.avatarUrl ?? (user.avatarId ? await ctx.storage.getUrl(user.avatarId) : null);

    const id = await ctx.db.insert("micRequests", {
      roomId: args.roomId,
      userId: user._id,
      userName: user.name ?? "ضيف",
      avatarUrl: avatarUrl ?? undefined,
      userNumber: user.userNumber ?? undefined,
      status: "pending",
    });
    return id;
  },
});

// المستخدم يلغي طلبه (أو يُحذف بعد رؤية الإشعار)
export const cancelMyRequest = mutation({
  args: { roomId: v.id("rooms"), tokenOverride: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.tokenOverride);
    const req = await ctx.db
      .query("micRequests")
      .withIndex("by_user_and_room", (q) => q.eq("userId", user._id).eq("roomId", args.roomId))
      .first();
    if (req) await ctx.db.delete(req._id);
    return null;
  },
});

// حالة طلبي (للمستخدم)
export const myRequestStatus = query({
  args: { roomId: v.id("rooms"), tokenOverride: v.optional(v.string()) },
  handler: async (ctx, args) => {
    try {
      const user = await requireUser(ctx, args.tokenOverride);
      const req = await ctx.db
        .query("micRequests")
        .withIndex("by_user_and_room", (q) => q.eq("userId", user._id).eq("roomId", args.roomId))
        .first();
      if (!req) return null;
      return { _id: req._id, status: req.status };
    } catch {
      return null;
    }
  },
});

// Owner/Mod يجلب قائمة الطلبات
export const listRequests = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    const reqs = await ctx.db
      .query("micRequests")
      .withIndex("by_room_and_status", (q) => q.eq("roomId", args.roomId).eq("status", "pending"))
      .take(50);
    return reqs.map((r) => ({
      _id: r._id,
      userId: r.userId,
      userName: r.userName,
      avatarUrl: r.avatarUrl ?? null,
      userNumber: r.userNumber ?? null,
    }));
  },
});

// Owner/Mod يقبل الطلب → يجلس في أول مايك فارغ
export const approveRequest = mutation({
  args: { requestId: v.id("micRequests"), tokenOverride: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.tokenOverride);
    const req = await ctx.db.get("micRequests", args.requestId);
    if (!req) throw new ConvexError({ code: "NOT_FOUND", message: "الطلب غير موجود" });

    const member = await getMember(ctx, req.roomId, user._id);
    if (!member || (member.role !== "owner" && member.role !== "moderator")) {
      throw new ConvexError({ code: "FORBIDDEN", message: "صلاحيات غير كافية" });
    }

    // أول مايك فارغ غير مقفل
    const seats = await ctx.db
      .query("micSeats")
      .withIndex("by_room_and_seatIndex", (q) => q.eq("roomId", req.roomId))
      .take(MAX_SEATS);
    const freeSeat = seats.find((s) => !s.userId && !s.locked);

    if (freeSeat) {
      await ctx.db.patch("micSeats", freeSeat._id, { userId: req.userId });
      const targetMember = await getMember(ctx, req.roomId, req.userId);
      if (targetMember && targetMember.role === "listener") {
        await ctx.db.patch("roomMembers", targetMember._id, { role: "speaker" });
      }
    }

    // تحديث الطلب → accepted (المستخدم سيراه ويحذفه)
    await ctx.db.patch("micRequests", args.requestId, { status: "accepted" });
    return null;
  },
});

// Owner/Mod يرفض الطلب
export const rejectRequest = mutation({
  args: { requestId: v.id("micRequests"), tokenOverride: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.tokenOverride);
    const req = await ctx.db.get("micRequests", args.requestId);
    if (!req) return null;

    const member = await getMember(ctx, req.roomId, user._id);
    if (!member || (member.role !== "owner" && member.role !== "moderator")) {
      throw new ConvexError({ code: "FORBIDDEN", message: "صلاحيات غير كافية" });
    }
    await ctx.db.patch("micRequests", args.requestId, { status: "rejected" });
    return null;
  },
});

// ============ [moorawi] Admin Actions ============

// طرد من الغرفة (يمكنه العودة)
export const kickFromRoom = mutation({
  args: { roomId: v.id("rooms"), toUserId: v.id("users"), tokenOverride: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.tokenOverride);
    const member = await getMember(ctx, args.roomId, user._id);
    if (!member || (member.role !== "owner" && member.role !== "moderator")) {
      throw new ConvexError({ code: "FORBIDDEN", message: "صلاحيات غير كافية" });
    }
    const targetMember = await getMember(ctx, args.roomId, args.toUserId);
    if (!targetMember) return null;
    if (targetMember.role === "owner") {
      throw new ConvexError({ code: "FORBIDDEN", message: "لا يمكن طرد المالك" });
    }
    if (member.role === "moderator" && targetMember.role === "moderator") {
      throw new ConvexError({ code: "FORBIDDEN", message: "لا يمكنك طرد مشرف آخر" });
    }
    // إفراغ مقعده
    const seats = await ctx.db.query("micSeats").withIndex("by_room_and_seatIndex", (q) => q.eq("roomId", args.roomId)).take(MAX_SEATS);
    for (const s of seats) {
      if (s.userId === args.toUserId) {
        await ctx.db.patch("micSeats", s._id, { userId: undefined, muted: false, adminMuted: false });
      }
    }
    // حذف عضويته
    await ctx.db.delete("roomMembers", targetMember._id);
    return null;
  },
});

// حظر/فك حظر (toggle) — المالك فقط
export const toggleBanUser = mutation({
  args: { roomId: v.id("rooms"), toUserId: v.id("users"), tokenOverride: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.tokenOverride);
    const member = await getMember(ctx, args.roomId, user._id);
    if (!member || member.role !== "owner") {
      throw new ConvexError({ code: "FORBIDDEN", message: "المالك فقط" });
    }
    const targetMember = await getMember(ctx, args.roomId, args.toUserId);
    if (!targetMember) return null;
    if (targetMember.role === "owner") {
      throw new ConvexError({ code: "FORBIDDEN", message: "لا يمكن حظر المالك" });
    }
    const next = !targetMember.banned;
    await ctx.db.patch("roomMembers", targetMember._id, { banned: next });
    // إذا حظر → أفرغ مقعده
    if (next) {
      const seats = await ctx.db.query("micSeats").withIndex("by_room_and_seatIndex", (q) => q.eq("roomId", args.roomId)).take(MAX_SEATS);
      for (const s of seats) {
        if (s.userId === args.toUserId) {
          await ctx.db.patch("micSeats", s._id, { userId: undefined, muted: false, adminMuted: false });
        }
      }
    }
    return null;
  },
});

// ترقية إلى مشرف — المالك فقط
export const promoteToMod = mutation({
  args: { roomId: v.id("rooms"), toUserId: v.id("users"), tokenOverride: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.tokenOverride);
    const member = await getMember(ctx, args.roomId, user._id);
    if (!member || member.role !== "owner") {
      throw new ConvexError({ code: "FORBIDDEN", message: "المالك فقط" });
    }
    const targetMember = await getMember(ctx, args.roomId, args.toUserId);
    if (!targetMember) return null;
    if (targetMember.role === "owner") {
      throw new ConvexError({ code: "FORBIDDEN", message: "لا يمكن تعديل المالك" });
    }
    await ctx.db.patch("roomMembers", targetMember._id, { role: "moderator" });
    return null;
  },
});

// إزالة الإشراف — المالك فقط
export const demoteMod = mutation({
  args: { roomId: v.id("rooms"), toUserId: v.id("users"), tokenOverride: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.tokenOverride);
    const member = await getMember(ctx, args.roomId, user._id);
    if (!member || member.role !== "owner") {
      throw new ConvexError({ code: "FORBIDDEN", message: "المالك فقط" });
    }
    const targetMember = await getMember(ctx, args.roomId, args.toUserId);
    if (!targetMember) return null;
    if (targetMember.role !== "moderator") return null;
    await ctx.db.patch("roomMembers", targetMember._id, { role: "listener" });
    return null;
  },
});

// إنزال شخص آخر من المايك — Owner/Mod
export const removeFromSeat = mutation({
  args: { roomId: v.id("rooms"), toUserId: v.id("users"), tokenOverride: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.tokenOverride);
    const member = await getMember(ctx, args.roomId, user._id);
    if (!member || (member.role !== "owner" && member.role !== "moderator")) {
      throw new ConvexError({ code: "FORBIDDEN", message: "صلاحيات غير كافية" });
    }
    const targetMember = await getMember(ctx, args.roomId, args.toUserId);
    if (targetMember && targetMember.role === "owner") {
      throw new ConvexError({ code: "FORBIDDEN", message: "لا يمكن إنزال المالك" });
    }
    const seats = await ctx.db.query("micSeats").withIndex("by_room_and_seatIndex", (q) => q.eq("roomId", args.roomId)).take(MAX_SEATS);
    for (const s of seats) {
      if (s.userId === args.toUserId) {
        await ctx.db.patch("micSeats", s._id, { userId: undefined, muted: false, adminMuted: false });
      }
    }
    if (targetMember && targetMember.role === "speaker") {
      await ctx.db.patch("roomMembers", targetMember._id, { role: "listener" });
    }
    return null;
  },
});

// [moorawi] قائمة نشاط الغرفة
export const listActivity = query({
  args: { roomId: v.id("rooms"), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 100;
    const actions = await ctx.db
      .query("roomActions")
      .withIndex("by_room_and_createdAt", (q) => q.eq("roomId", args.roomId))
      .order("desc")
      .take(limit);
    return actions;
  },
});

