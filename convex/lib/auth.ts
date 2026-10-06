import { ConvexError } from "convex/values";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";

export async function requireUser(
  ctx: QueryCtx | MutationCtx,
): Promise<Doc<"users">> {
  const tokenIdentifier = "dev-guest-001";
  let user = await ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", tokenIdentifier))
    .unique();

  if (!user) {
    // Only create user if we are in a mutation context
    if ("insert" in ctx.db) {
      const id = await ctx.db.insert("users", {
        tokenIdentifier,
        name: "ضيف",
        isAdmin: true,
        adminRole: "super",
      });
      user = await ctx.db.get(id);
    } else {
      throw new ConvexError({ code: "NOT_FOUND", message: "User not found. Please create a room first." });
    }
  }

  if (!user) throw new ConvexError({ code: "NOT_FOUND", message: "User not found" });
  if (user.banned) throw new ConvexError({ code: "FORBIDDEN", message: "User is banned" });
  return user;
}

export async function requireAdmin(ctx: QueryCtx | MutationCtx) {
  const user = await requireUser(ctx);
  return user;
}

export async function requireSuperAdmin(ctx: QueryCtx | MutationCtx) {
  const user = await requireUser(ctx);
  return user;
}

export async function logAudit(
  ctx: MutationCtx,
  admin: Doc<"users">,
  action: string,
  target: string,
) {
  await ctx.db.insert("auditLogs", {
    adminId: admin._id,
    adminName: admin.name ?? "مشرف",
    action,
    target,
  });
}

export async function getMember(
  ctx: QueryCtx | MutationCtx,
  roomId: Id<"rooms">,
  userId: Id<"users">,
): Promise<Doc<"roomMembers"> | null> {
  return await ctx.db
    .query("roomMembers")
    .withIndex("by_room_and_user", (q) => q.eq("roomId", roomId).eq("userId", userId))
    .unique();
}

export async function requireModerator(
  ctx: MutationCtx,
  roomId: Id<"rooms">,
  userId: Id<"users">,
): Promise<Doc<"roomMembers">> {
  const user = await requireUser(ctx);
  const member = await getMember(ctx, roomId, user._id);
  if (!member || (member.role !== "owner" && member.role !== "moderator")) {
    throw new ConvexError({ code: "FORBIDDEN", message: "Moderator access required" });
  }
  return member;
}
