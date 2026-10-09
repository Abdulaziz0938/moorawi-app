import { query } from "./_generated/server";
import { v } from "convex/values";
import { vipLevelFromTotalSent, vipLevelFromTotalReceived } from "./lib/vip";

// ============================================================
// [moorawi-profile] Single Source of Truth for user display
// Returns EVERYTHING needed to render a profile in ONE query
// ============================================================

export const getFull = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get("users", args.userId);
    if (!user) return null;

    // --- 1) Basic info ---
    const avatarUrl =
      user.avatarUrl ??
      (user.avatarId ? await ctx.storage.getUrl(user.avatarId) : null);

    // --- 2) Levels (from DB, computed) ---
    const wealthLevel = vipLevelFromTotalSent(user.totalSent ?? 0);
    const charmLevel = vipLevelFromTotalReceived(user.totalReceived ?? 0);

    // --- 3) VIP (real) ---
    const vip = user.vipLevel ?? 0;
    const vipActive = vip > 0 && (!user.vipExpiresAt || user.vipExpiresAt > Date.now());

    // --- 4) Equipped assets (only if owned) ---
    let frame = null;
    if (user.equippedFrameId) {
      const f = await ctx.db.get("shopItems", user.equippedFrameId);
      if (f) frame = { _id: f._id, imageUrl: f.imageUrl, name: f.name };
    }

    let vehicle = null;
    if (user.equippedVehicleId) {
      const veh = await ctx.db.get("shopItems", user.equippedVehicleId);
      if (veh) vehicle = { _id: veh._id, imageUrl: veh.imageUrl, previewUrl: veh.previewUrl, previewType: veh.previewType, name: veh.name };
    }

    let equippedMedal = null;
    if (user.equippedMedalId) {
      const m = await ctx.db.get("medals", user.equippedMedalId);
      if (m) equippedMedal = { _id: m._id, name: m.name, imageUrl: m.imageUrl, tier: m.tier };
    }

    // --- 5) Stats (from DB, not hardcoded) ---
    const stats = {
      visitors: user.visitorCount ?? 0,
      fans: user.fanCount ?? 0,
      followers: user.followerCount ?? 0,
      following: user.followingCount ?? 0,
      medals: user.medalCount ?? 0,
    };

    // --- 6) My Room (if owner) ---
    const room = await ctx.db
      .query("rooms")
      .withIndex("by_owner", (q) => q.eq("ownerId", args.userId))
      .take(1);
    let roomInfo = null;
    if (room.length > 0) {
      const r = room[0];
      const coverUrl = r.coverUrl ?? (r.coverImageId ? await ctx.storage.getUrl(r.coverImageId) : null);
      roomInfo = {
        _id: r._id,
        name: r.name,
        coverUrl,
        memberCount: r.memberCount,
        micCount: r.micCount,
      };
    }

    // --- 7) All owned medals (for MedalsRow) ---
    const userMedals = await ctx.db
      .query("userMedals")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .take(20);
    const medalsList = [];
    for (const um of userMedals) {
      const m = await ctx.db.get("medals", um.medalId);
      if (m) medalsList.push({ _id: m._id, name: m.name, imageUrl: m.imageUrl, tier: m.tier, value: m.value });
    }

    // --- 8) Relationship (CP/etc) ---
    let relationship = null;
    if (user.partnerId) {
      const partner = await ctx.db.get("users", user.partnerId);
      if (partner) {
        relationship = {
          partnerId: partner._id,
          partnerName: partner.name,
          partnerAvatar: partner.avatarUrl,
          type: user.partnerType ?? "cp",
          since: user.partnerSince ?? null,
        };
      }
    }

    // --- 9) Verification ---
    const verified = user.verificationStatus === "approved";

    return {
      _id: user._id,
      userNumber: user.userNumber ?? null,
      username: user.username ?? null,
      name: user.name ?? null,
      bio: user.bio ?? null,
      avatarUrl,
      age: user.age ?? null,
      gender: user.gender ?? null,
      country: user.country ?? null,

      // Levels (always present, 0 if not)
      wealthLevel,
      charmLevel,
      totalSent: user.totalSent ?? 0,
      totalReceived: user.totalReceived ?? 0,

      // VIP (only display if vipActive)
      vip,
      vipActive,
      vipExpiresAt: user.vipExpiresAt ?? null,

      // Roles
      adminRole: user.adminRole ?? null,
      isAdmin: user.isAdmin ?? false,
      isOwner: user.userNumber === 1,

      // Equipped (null if none)
      frame,
      vehicle,
      equippedMedal,
      titleText: user.titleText ?? null,

      // Stats (from DB)
      stats,

      // Room (null if no room)
      room: roomInfo,

      // Medals (full list)
      medals: medalsList,

      // Relationship (null if none)
      relationship,

      // Verification
      verified,
    };
  },
});
