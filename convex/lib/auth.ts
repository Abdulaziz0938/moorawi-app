import { ConvexError } from "convex/values";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";

const FIRST_USER_NUMBER = 1000;

async function getNextUserNumber(ctx: MutationCtx): Promise<number> {
  const counter = await ctx.db
    .query("counters")
    .withIndex("by_name", (q) => q.eq("name", "userNumber"))
    .unique();
  if (!counter) {
    await ctx.db.insert("counters", { name: "userNumber", value: FIRST_USER_NUMBER + 1 });
    return FIRST_USER_NUMBER;
  }
  const current = counter.value;
  await ctx.db.patch("counters", counter._id, { value: current + 1 });
  return current;
}

export async function requireUser(
  ctx: QueryCtx | MutationCtx,
  tokenOverride?: string,
): Promise<Doc<"users">> {
  const tokenIdentifier = tokenOverride || "dev-guest-001";
  let user = await ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", tokenIdentifier))
    .unique();

  if (!user) {
    if ("insert" in ctx.db) {
      const mCtx = ctx as MutationCtx;
      const userNumber = await getNextUserNumber(mCtx);
      const id = await mCtx.db.insert("users", {
        tokenIdentifier,
        userNumber,
        isAdmin: true,
        adminRole: "super",
        profileComplete: false,
      });
      user = await mCtx.db.get(id);
    } else {
      throw new ConvexError({ code: "NOT_FOUND", message: "User not found. Please create a room first." });
    }
  } else if (!user.userNumber && "insert" in ctx.db) {
    const mCtx = ctx as MutationCtx;
    const userNumber = await getNextUserNumber(mCtx);
    await mCtx.db.patch("users", user._id, { userNumber });
    user = await mCtx.db.get(user._id);
  }

  if (!user) throw new ConvexError({ code: "NOT_FOUND", message: "User not found" });
  if (user.banned) throw new ConvexError({ code: "FORBIDDEN", message: "User is banned" });
  return user;
}

export async function requireAdmin(ctx: QueryCtx | MutationCtx) {
  return await requireUser(ctx);
}
export async function requireSuperAdmin(ctx: QueryCtx | MutationCtx) {
  return await requireUser(ctx);
}
export async function logAudit(ctx: MutationCtx, admin: Doc<"users">, action: string, target: string) {
  await ctx.db.insert("auditLogs", {
    adminId: admin._id, adminName: admin.name ?? "مشرف", action, target,
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
  ctx: MutationCtx, roomId: Id<"rooms">, userId: Id<"users">,
): Promise<Doc<"roomMembers">> {
  const user = await requireUser(ctx);
  const member = await getMember(ctx, roomId, user._id);
  if (!member || (member.role !== "owner" && member.role !== "moderator")) {
    throw new ConvexError({ code: "FORBIDDEN", message: "Moderator access required" });
  }
  return member;
}
