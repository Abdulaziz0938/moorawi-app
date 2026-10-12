// [ezo-discover] اكتشاف — غرف رائجة + مستخدمون مميزون
import { v } from "convex/values";
import { query } from "./_generated/server";
import { activeVipLevel } from "./lib/vip";

export const overview = query({
  args: {},
  handler: async (ctx) => {
    // ===== top rooms =====
    const topRooms = await ctx.db
      .query("rooms")
      .withIndex("by_weeklyTotal")
      .order("desc")
      .filter((q) => q.eq(q.field("isPrivate"), false))
      .take(10);

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
    const topWealth = (await ctx.db
      .query("users")
      .withIndex("by_totalSent")
      .order("desc")
      .take(6))
      .map((u) => ({
        userId: u._id,
        name: u.name ?? "—",
        userNumber: u.userNumber ?? null,
        avatarUrl: u.avatarUrl ?? null,
        vip: activeVipLevel(u),
        verified: u.verificationStatus === "approved",
        value: u.totalSent ?? 0,
      }));

    const topCharm = (await ctx.db
      .query("users")
      .withIndex("by_charms")
      .order("desc")
      .take(6))
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
    const newUsers = (await ctx.db
      .query("users")
      .order("desc")
      .take(6))
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
