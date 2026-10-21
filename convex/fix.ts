import { mutation } from "./_generated/server";

export const fixUserNumberCounter = mutation({
  args: {},
  handler: async (ctx) => {
    const counter = await ctx.db
      .query("counters")
      .withIndex("by_name", (q) => q.eq("name", "userNumber"))
      .unique();

    // إيجاد أعلى رقم مستخدم حالي
    const users = await ctx.db.query("users").collect();
    let maxNumber = 100000;
    for (const u of users) {
      if (u.userNumber && u.userNumber >= maxNumber) {
        maxNumber = u.userNumber;
      }
    }

    if (counter) {
      await ctx.db.patch("counters", counter._id, { value: maxNumber + 1 });
      return { fixed: true, oldValue: counter.value, newValue: maxNumber + 1 };
    } else {
      await ctx.db.insert("counters", { name: "userNumber", value: maxNumber + 1 });
      return { created: true, newValue: maxNumber + 1 };
    }
  },
});
