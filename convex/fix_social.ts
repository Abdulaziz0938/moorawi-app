import { mutation } from "./_generated/server";

export const recomputeSocialStats = mutation({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    const allFollows = await ctx.db.query("follows").collect();
    let updated = 0;
    const changes: any[] = [];

    for (const user of users) {
      const followers = allFollows.filter((f: any) => f.followingId === user._id).length;
      const following = allFollows.filter((f: any) => f.followerId === user._id).length;

      const gifts = await ctx.db
        .query("giftTransactions")
        .withIndex("by_to", (q) => q.eq("toUserId", user._id))
        .take(2000);
      const fans = new Set(gifts.map((g: any) => String(g.fromUserId))).size;

      const oldF = user.followerCount ?? 0;
      const oldFw = user.followingCount ?? 0;
      const oldFan = user.fanCount ?? 0;

      if (oldF !== followers || oldFw !== following || oldFan !== fans) {
        await ctx.db.patch("users", user._id, {
          followerCount: followers,
          followingCount: following,
          fanCount: fans,
        });
        updated++;
        if (user.userNumber === 1 || changes.length < 10) {
          changes.push({
            userNumber: user.userNumber,
            name: user.name,
            before: { followers: oldF, following: oldFw, fans: oldFan },
            after: { followers, following, fans },
          });
        }
      }
    }
    return { updated, totalUsers: users.length, sample: changes };
  },
});
