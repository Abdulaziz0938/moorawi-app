import { mutation } from "./_generated/server";

export const syncUserAndRoomIds = mutation({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    
    // إيجاد أعلى رقم مستخدم من 6 خانات
    let maxUserNum = 100000;
    for (const u of users) {
      if (u.userNumber && u.userNumber >= 100000 && u.userNumber > maxUserNum) {
        maxUserNum = u.userNumber;
      }
    }

    let fixedUsers = 0;
    const userMap = new Map();

    for (const u of users) {
      // الحفاظ على آيدي 1 (سوبر أدمن) وآيدي 10 (أدمن)
      if (u.userNumber === 1 || u.userNumber === 10) {
        userMap.set(u._id, u.userNumber);
        continue;
      }
      // إذا كان الحساب super admin ولكن رقمه تغير بالخطأ، نعيده إلى 1 إذا لم يكن 1 محجوزاً
      if (u.adminRole === "super" && !users.some(other => other._id !== u._id && other.userNumber === 1)) {
        await ctx.db.patch("users", u._id, { userNumber: 1 });
        userMap.set(u._id, 1);
        fixedUsers++;
        continue;
      }
      // باقي الحسابات يجب أن تكون 6 خانات (>= 100000)
      if (!u.userNumber || u.userNumber < 100000) {
        maxUserNum += 1;
        await ctx.db.patch("users", u._id, { userNumber: maxUserNum });
        userMap.set(u._id, maxUserNum);
        fixedUsers++;
      } else {
        userMap.set(u._id, u.userNumber);
      }
    }

    // تحديث عداد المستخدمين ليبدأ دائماً من 6 خانات بعد آخر رقم
    const userCounter = await ctx.db
      .query("counters")
      .withIndex("by_name", (q) => q.eq("name", "userNumber"))
      .unique();

    if (userCounter) {
      await ctx.db.patch("counters", userCounter._id, { value: Math.max(100000, maxUserNum) + 1 });
    } else {
      await ctx.db.insert("counters", { name: "userNumber", value: Math.max(100000, maxUserNum) + 1 });
    }

    // مطابقة آيدي كل غرفة (roomNumber) مع آيدي صاحبها (userNumber) بالضبط
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
