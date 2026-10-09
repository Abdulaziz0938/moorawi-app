import { mutation } from "./_generated/server";
import { ConvexError, v } from "convex/values";

function randomHex(len: number): string {
  const arr = new Uint8Array(len);
  if (typeof crypto !== "undefined" && (crypto as any).getRandomValues) {
    (crypto as any).getRandomValues(arr);
  } else {
    for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await (crypto as any).subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("");
}

async function hashPassword(password: string, salt: string): Promise<string> {
  let h = await sha256Hex(salt + ":" + password);
  h = await sha256Hex(h + ":" + salt);
  h = await sha256Hex(h + ":" + salt);
  return h;
}

// One-time owner setup: credentials + optional purge
export const setupOwner = mutation({
  args: {
    username: v.string(),
    password: v.string(),
    purgeOthers: v.boolean(),
    secret: v.string(),
  },
  handler: async (ctx, args) => {
    if (args.secret !== "moorawi-setup-2026") {
      throw new ConvexError({ code: "FORBIDDEN", message: "Invalid secret" });
    }

    const owner = await ctx.db
      .query("users")
      .withIndex("by_userNumber", (q) => q.eq("userNumber", 1))
      .unique();
    if (!owner) {
      throw new ConvexError({ code: "NO_OWNER", message: "Owner (ID:1) not found" });
    }

    const username = args.username.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,20}$/.test(username)) {
      throw new ConvexError({ code: "INVALID_USERNAME", message: "3-20 حرف/رقم/_" });
    }
    if (args.password.length < 6) {
      throw new ConvexError({ code: "WEAK_PASSWORD", message: "6 أحرف على الأقل" });
    }

    const existing = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", username))
      .unique();
    if (existing && existing._id !== owner._id) {
      throw new ConvexError({ code: "USERNAME_TAKEN", message: "اسم المستخدم محجوز" });
    }

    const salt = randomHex(16);
    const passwordHash = await hashPassword(args.password, salt);

    await ctx.db.patch("users", owner._id, {
      username,
      passwordHash,
      passwordSalt: salt,
      authProvider: "password",
      adminRole: "super",
      isAdmin: true,
      lastLoginAt: Date.now(),
    });

    let usersDeleted = 0;
    let membersDeleted = 0;
    let roomsDeleted = 0;

    if (args.purgeOthers) {
      const all = await ctx.db.query("users").collect();
      for (const u of all) {
        if (u._id === owner._id) continue;

        const members = await ctx.db.query("roomMembers")
          .filter((q) => q.eq(q.field("userId"), u._id))
          .collect();
        for (const m of members) {
          await ctx.db.delete("roomMembers", m._id);
          membersDeleted++;
        }

        const ownedRooms = await ctx.db.query("rooms")
          .filter((q) => q.eq(q.field("ownerId"), u._id))
          .collect();
        for (const r of ownedRooms) {
          const rms = await ctx.db.query("roomMembers")
            .filter((q) => q.eq(q.field("roomId"), r._id))
            .collect();
          for (const rm of rms) {
            await ctx.db.delete("roomMembers", rm._id);
            membersDeleted++;
          }
          await ctx.db.delete("rooms", r._id);
          roomsDeleted++;
        }

        await ctx.db.delete("users", u._id);
        usersDeleted++;
      }
    }

    return { ok: true, ownerId: owner._id, username, usersDeleted, membersDeleted, roomsDeleted };
  },
});

// ============ Purge orphan rooms (owner deleted) ============
export const purgeOrphanRooms = mutation({
  args: { secret: v.string() },
  handler: async (ctx, args) => {
    if (args.secret !== "moorawi-setup-2026") {
      throw new ConvexError({ code: "FORBIDDEN", message: "Invalid secret" });
    }

    const allRooms = await ctx.db.query("rooms").collect();
    let roomsDeleted = 0;
    let membersDeleted = 0;
    const orphanIds: string[] = [];

    for (const room of allRooms) {
      const owner = await ctx.db.get("users", room.ownerId);
      if (!owner) {
        const members = await ctx.db
          .query("roomMembers")
          .filter((q) => q.eq(q.field("roomId"), room._id))
          .collect();
        for (const m of members) {
          await ctx.db.delete("roomMembers", m._id);
          membersDeleted++;
        }
        await ctx.db.delete("rooms", room._id);
        roomsDeleted++;
        orphanIds.push(room._id);
      }
    }

    return { ok: true, roomsDeleted, membersDeleted, orphanIds };
  },
});

// ============ Purge ALL rooms (dev cleanup) ============
export const purgeAllRooms = mutation({
  args: { secret: v.string(), confirm: v.string() },
  handler: async (ctx, args) => {
    if (args.secret !== "moorawi-setup-2026") {
      throw new ConvexError({ code: "FORBIDDEN", message: "Invalid secret" });
    }
    if (args.confirm !== "YES_DELETE_ALL_ROOMS") {
      throw new ConvexError({ code: "FORBIDDEN", message: "Confirm string mismatch" });
    }

    const allRooms = await ctx.db.query("rooms").collect();
    let roomsDeleted = 0;
    let membersDeleted = 0;

    for (const room of allRooms) {
      const members = await ctx.db
        .query("roomMembers")
        .filter((q) => q.eq(q.field("roomId"), room._id))
        .collect();
      for (const m of members) {
        await ctx.db.delete("roomMembers", m._id);
        membersDeleted++;
      }
      await ctx.db.delete("rooms", room._id);
      roomsDeleted++;
    }

    return { ok: true, roomsDeleted, membersDeleted };
  },
});

