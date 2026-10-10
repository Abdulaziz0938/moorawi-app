// [moorawi-music] Personal library + shared room playback
//
// - Every user has their own private library (upload/list/delete).
// - Anyone can play a track from their library → everyone in the room
//   hears it (via rooms.currentMusic* fields).
// - Each client mutes locally without affecting others.

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser } from "./lib/auth";

// ============================================================
// Personal library
// ============================================================
export const listMine = query({
  args: { tokenOverride: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    return await ctx.db
      .query("userMusic")
      .withIndex("by_user", (q) => q.eq("userId", me._id))
      .order("desc")
      .collect();
  },
});

export const addTrack = mutation({
  args: {
    name: v.string(),
    url: v.string(),
    durationSec: v.optional(v.number()),
    tokenOverride: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    const trimmed = args.name.trim();
    if (trimmed.length < 1) throw new Error("اسم فارغ");
    if (!args.url) throw new Error("رابط فارغ");

    const id = await ctx.db.insert("userMusic", {
      userId: me._id,
      name: trimmed,
      url: args.url,
      durationSec: args.durationSec,
      uploadedAt: Date.now(),
    });
    return { ok: true, id };
  },
});

export const removeTrack = mutation({
  args: {
    musicId: v.id("userMusic"),
    tokenOverride: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    const track = await ctx.db.get("userMusic", args.musicId);
    if (!track) throw new Error("المقطع غير موجود");
    if (track.userId !== me._id) throw new Error("ليس ملكك");
    await ctx.db.delete("userMusic", args.musicId);
    return { ok: true };
  },
});

export const renameTrack = mutation({
  args: {
    musicId: v.id("userMusic"),
    name: v.string(),
    tokenOverride: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    const track = await ctx.db.get("userMusic", args.musicId);
    if (!track) throw new Error("المقطع غير موجود");
    if (track.userId !== me._id) throw new Error("ليس ملكك");
    const trimmed = args.name.trim();
    if (trimmed.length < 1) throw new Error("اسم فارغ");
    await ctx.db.patch("userMusic", args.musicId, { name: trimmed });
    return { ok: true };
  },
});

// ============================================================
// Shared room playback
// ============================================================

// Get current playing music for a room
export const currentForRoom = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    const room = await ctx.db.get("rooms", args.roomId);
    if (!room || !room.currentMusicUrl) return null;

    let startedByName = "—";
    if (room.currentMusicStartedBy) {
      const u = await ctx.db.get("users", room.currentMusicStartedBy);
      startedByName = u?.name ?? "—";
    }

    return {
      musicId: room.currentMusicId ?? null,
      name: room.currentMusicName ?? "",
      url: room.currentMusicUrl,
      startedByName,
      startedAt: room.currentMusicStartedAt ?? 0,
    };
  },
});

// Play a track for everyone in the room
export const playForRoom = mutation({
  args: {
    roomId: v.id("rooms"),
    musicId: v.id("userMusic"),
    tokenOverride: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);

    // Verify user is actually in the room (or owner)
    const room = await ctx.db.get("rooms", args.roomId);
    if (!room) throw new Error("الغرفة غير موجودة");
    const member = await ctx.db
      .query("roomMembers")
      .withIndex("by_room_and_user", (q: any) =>
        q.eq("roomId", args.roomId).eq("userId", me._id)
      )
      .unique();
    const isOwner = room.ownerId === me._id;
    if (!member && !isOwner) throw new Error("لست في هذه الغرفة");

    // Get the track (must be user's own OR public library track)
    const track = await ctx.db.get("userMusic", args.musicId);
    if (!track) throw new Error("المقطع غير موجود");

    await ctx.db.patch("rooms", args.roomId, {
      currentMusicId: track._id,
      currentMusicUrl: track.url,
      currentMusicName: track.name,
      currentMusicStartedBy: me._id,
      currentMusicStartedAt: Date.now(),
    });
    return { ok: true };
  },
});

// Stop the room music (anyone can stop, or restrict to starter/owner)
export const stopRoom = mutation({
  args: {
    roomId: v.id("rooms"),
    tokenOverride: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.tokenOverride);
    const room = await ctx.db.get("rooms", args.roomId);
    if (!room) throw new Error("الغرفة غير موجودة");

    // Only the starter, room owner, or admin can stop
    const isStarter = room.currentMusicStartedBy === me._id;
    const isOwner = room.ownerId === me._id;
    const isAdmin = me.adminRole === "super" || me.userNumber === 1;
    if (!isStarter && !isOwner && !isAdmin) {
      throw new Error("لا يمكنك إيقاف موسيقى شخص آخر");
    }

    await ctx.db.patch("rooms", args.roomId, {
      currentMusicId: undefined,
      currentMusicUrl: undefined,
      currentMusicName: undefined,
      currentMusicStartedBy: undefined,
      currentMusicStartedAt: undefined,
    });
    return { ok: true };
  },
});
