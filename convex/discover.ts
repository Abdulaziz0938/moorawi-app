// [ezo-discover] اكتشاف — غرف رائجة + مستخدمون مميزون
import { v } from "convex/values";
import { query } from "./_generated/server";
import { activeVipLevel } from "./lib/vip";

export const overview = query({
  args: {},
  handler: async (ctx) => {
    // ===== top rooms =====
    const rooms = await ctx.db.query("rooms").collect();
    const topRooms = rooms
      .filter((r) => !r.isPrivate)
      .sort((a, b) => (b.weeklyTotal ?? 0) - (a.weeklyTotal ?? 0))
      .slice(0, 10);

    const enrichedRooms = await Promise.all(
      topRooms.map(async (r) => {
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
          ownerName: owner?.name ?? "—",
          ownerAvatar: owner?.avatarUrl ?? (owner?.avatarId ? await ctx.storage.getUrl(owner.avatarId) : null),
        };
      })
    );

    // ===== top users (wealth) =====
    const users = await ctx.db.query("users").collect();
    const topWealth = users
      .sort((a, b) => (b.totalSent ?? 0) - (a.totalSent ?? 0))
      .slice(0, 6)
      .map((u) => ({
        userId: u._id,
        name: u.name ?? "—",
        userNumber: u.userNumber ?? null,
        avatarUrl: u.avatarUrl ?? null,
        vip: activeVipLevel(u),
        verified: u.verificationStatus === "approved",
        value: u.totalSent ?? 0,
      }));

    const topCharm = users
      .sort((a, b) => (b.charms ?? 0) - (a.charms ?? 0))
      .slice(0, 6)
      .map((u) => ({
        userId: u._id,
        name: u.name ?? "—",
        userNumber: u.userNumber ?? null,
        avatarUrl: u.avatarUrl ?? null,
        vip: activeVipLevel(u),
        verified: u.verificationStatus === "approved",
        value: u.charms ?? 0,
      }));

    // ===== new users =====
    const newUsers = users
      .sort((a, b) => (b._creationTime ?? 0) - (a._creationTime ?? 0))
      .slice(0, 6)
      .map((u) => ({
        userId: u._id,
        name: u.name ?? "—",
        userNumber: u.userNumber ?? null,
        avatarUrl: u.avatarUrl ?? null,
        vip: activeVipLevel(u),
        verified: u.verificationStatus === "approved",
      }));

    return {
      rooms: enrichedRooms,
      topWealth,
      topCharm,
      newUsers,
    };
  },
});
