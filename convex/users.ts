import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser } from "./lib/auth";

// Returns the current user's profile info (for display)
export const me = query({
  args: { tokenOverride: v.optional(v.string()) },
  handler: async (ctx, args) => {
    try {
      const user = await requireUser(ctx, args.tokenOverride);
      return {
        _id: user._id,
        userNumber: user.userNumber ?? null,
        name: user.name ?? "ضيف",
        bio: user.bio ?? null,
        isAdmin: user.isAdmin ?? false,
      };
    } catch {
      return null;
    }
  },
});

// Update the user's display name
export const updateName = mutation({
  args: { name: v.string(), tokenOverride: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.tokenOverride);
    const name = args.name.trim();
    if (name.length < 2 || name.length > 30) {
      throw new Error("الاسم يجب أن يكون بين 2 و 30 حرفاً");
    }
    await ctx.db.patch("users", user._id, { name });
    return null;
  },
});
