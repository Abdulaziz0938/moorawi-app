import { internalMutation } from "./_generated/server";

export const syncUserAndRoomIds = internalMutation({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    
    // ط¥ظٹط¬ط§ط¯ ط£ط¹ظ„ظ‰ ط±ظ‚ظ… ظ…ط³طھط®ط¯ظ… ظ…ظ† 6 ط®ط§ظ†ط§طھ
    let maxUserNum = 100000;
    for (const u of users) {
      if (u.userNumber && u.userNumber >= 100000 && u.userNumber > maxUserNum) {
        maxUserNum = u.userNumber;
      }
    }

    let fixedUsers = 0;
    const userMap = new Map();

    for (const u of users) {
      // ط§ظ„ط­ظپط§ط¸ ط¹ظ„ظ‰ ط¢ظٹط¯ظٹ 1 (ط³ظˆط¨ط± ط£ط¯ظ…ظ†) ظˆط¢ظٹط¯ظٹ 10 (ط£ط¯ظ…ظ†)
      if (u.userNumber === 1 || u.userNumber === 10) {
        userMap.set(u._id, u.userNumber);
        continue;
      }
      // ط¥ط°ط§ ظƒط§ظ† ط§ظ„ط­ط³ط§ط¨ super admin ظˆظ„ظƒظ† ط±ظ‚ظ…ظ‡ طھط؛ظٹط± ط¨ط§ظ„ط®ط·ط£طŒ ظ†ط¹ظٹط¯ظ‡ ط¥ظ„ظ‰ 1 ط¥ط°ط§ ظ„ظ… ظٹظƒظ† 1 ظ…ط­ط¬ظˆط²ط§ظ‹
      if (u.adminRole === "super" && !users.some(other => other._id !== u._id && other.userNumber === 1)) {
        await ctx.db.patch("users", u._id, { userNumber: 1 });
        userMap.set(u._id, 1);
        fixedUsers++;
        continue;
      }
      // ط¨ط§ظ‚ظٹ ط§ظ„ط­ط³ط§ط¨ط§طھ ظٹط¬ط¨ ط£ظ† طھظƒظˆظ† 6 ط®ط§ظ†ط§طھ (>= 100000)
      if (!u.userNumber || u.userNumber < 100000) {
        maxUserNum += 1;
        await ctx.db.patch("users", u._id, { userNumber: maxUserNum });
        userMap.set(u._id, maxUserNum);
        fixedUsers++;
      } else {
        userMap.set(u._id, u.userNumber);
      }
    }

    // طھط­ط¯ظٹط« ط¹ط¯ط§ط¯ ط§ظ„ظ…ط³طھط®ط¯ظ…ظٹظ† ظ„ظٹط¨ط¯ط£ ط¯ط§ط¦ظ…ط§ظ‹ ظ…ظ† 6 ط®ط§ظ†ط§طھ ط¨ط¹ط¯ ط¢ط®ط± ط±ظ‚ظ…
    const userCounter = await ctx.db
      .query("counters")
      .withIndex("by_name", (q) => q.eq("name", "userNumber"))
      .unique();

    if (userCounter) {
      await ctx.db.patch("counters", userCounter._id, { value: Math.max(100000, maxUserNum) + 1 });
    } else {
      await ctx.db.insert("counters", { name: "userNumber", value: Math.max(100000, maxUserNum) + 1 });
    }

    // ظ…ط·ط§ط¨ظ‚ط© ط¢ظٹط¯ظٹ ظƒظ„ ط؛ط±ظپط© (roomNumber) ظ…ط¹ ط¢ظٹط¯ظٹ طµط§ط­ط¨ظ‡ط§ (userNumber) ط¨ط§ظ„ط¶ط¨ط·
    const rooms = await ctx.db.query("rooms").collect();
    let syncedRooms = 0;
    for (const r of rooms) {
      const ownerNum = userMap.get(r.ownerId);
      if (ownerNum !== undefined && r.roomNumber !== ownerNum) {
        await ctx.db.patch("rooms", r._id, { roomNumber: ownerNum });
        syncedRooms++;
      }
    }

    return {
      fixedUsers,
      syncedRooms,
      nextUserNumber: Math.max(100000, maxUserNum) + 1,
    };
  },
});

