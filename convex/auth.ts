import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";

// ============ Helpers ============

export function randomHex(len: number): string {
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

export async function hashPassword(password: string, salt: string): Promise<string> {
  let h = await sha256Hex(salt + ":" + password);
  h = await sha256Hex(h + ":" + salt);
  h = await sha256Hex(h + ":" + salt);
  return h;
}

function validateUsername(u: string): string {
  const t = u.trim().toLowerCase();
  if (!/^[a-z0-9_]{3,20}$/.test(t)) {
    throw new ConvexError({ code: "INVALID_USERNAME", message: "اسم المستخدم: 3-20 حرف إنجليزي/رقم/_ فقط" });
  }
  return t;
}

function validatePassword(p: string): void {
  if (p.length < 6) {
    throw new ConvexError({ code: "WEAK_PASSWORD", message: "كلمة المرور: 6 أحرف على الأقل" });
  }
}

async function getNextUserNumber(ctx: any): Promise<number> {
  const counter = await ctx.db
    .query("counters")
    .withIndex("by_name", (q: any) => q.eq("name", "userNumber"))
    .unique();
  if (!counter) {
    await ctx.db.insert("counters", { name: "userNumber", value: 1001 });
    return 1000;
  }
  const current = counter.value;
  await ctx.db.patch("counters", counter._id, { value: current + 1 });
  return current;
}

// ============ Mutations ============

export const signup = mutation({
  args: {
    username: v.string(),
    password: v.string(),
    deviceId: v.string(),
  },
  handler: async (ctx, args) => {
    const username = validateUsername(args.username);
    validatePassword(args.password);

    const existing = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", username))
      .unique();
    if (existing) {
      throw new ConvexError({ code: "USERNAME_TAKEN", message: "اسم المستخدم محجوز" });
    }

    const salt = randomHex(16);
    const passwordHash = await hashPassword(args.password, salt);
    const sessionToken = "sess-" + randomHex(24);

    let user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", args.deviceId))
      .unique();

    if (user) {
      await ctx.db.patch("users", user._id, {
        tokenIdentifier: sessionToken,
        username,
        passwordHash,
        passwordSalt: salt,
        authProvider: "password",
        lastLoginAt: Date.now(),
      });
    } else {
      const userNumber = await getNextUserNumber(ctx);
      const id = await ctx.db.insert("users", {
        tokenIdentifier: sessionToken,
        userNumber,
        username,
        passwordHash,
        passwordSalt: salt,
        authProvider: "password",
        profileComplete: false,
        lastLoginAt: Date.now(),
      });
      user = await ctx.db.get(id);
    }

    return { sessionToken, userId: user!._id, username };
  },
});

export const signin = mutation({
  args: {
    identifier: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const raw = args.identifier.trim().toLowerCase();

    let user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", raw))
      .unique();

    if (!user && /^[0-9]+$/.test(raw)) {
      user = await ctx.db
        .query("users")
        .withIndex("by_userNumber", (q) => q.eq("userNumber", parseInt(raw, 10)))
        .unique();
    }

    if (!user) {
      throw new ConvexError({ code: "NOT_FOUND", message: "المستخدم غير موجود" });
    }

    if (!user.passwordHash || !user.passwordSalt) {
      throw new ConvexError({ code: "NO_PASSWORD", message: "هذا الحساب زائر — أنشئ حساباً رسمياً أولاً" });
    }

    const testHash = await hashPassword(args.password, user.passwordSalt);
    if (testHash !== user.passwordHash) {
      throw new ConvexError({ code: "WRONG_PASSWORD", message: "كلمة المرور غير صحيحة" });
    }

    const sessionToken = "sess-" + randomHex(24);
    await ctx.db.patch("users", user._id, {
      tokenIdentifier: sessionToken,
      lastLoginAt: Date.now(),
    });

    return { sessionToken, userId: user._id, username: user.username ?? "" };
  },
});

export const me = query({
  args: { tokenOverride: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (!args.tokenOverride) return null;
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", args.tokenOverride!))
      .unique();
    if (!user) return null;
    return {
      _id: user._id,
      userNumber: user.userNumber ?? null,
      username: user.username ?? null,
      name: user.name ?? null,
      profileComplete: user.profileComplete ?? false,
      authProvider: user.authProvider ?? "guest",
      isAdmin: user.isAdmin ?? false,
      adminRole: user.adminRole ?? null,
    };
  },
});

export const bootstrapOwner = mutation({
  args: {
    username: v.string(),
    password: v.string(),
    deviceId: v.string(),
  },
  handler: async (ctx, args) => {
    const existingSuper = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("adminRole"), "super"))
      .first();
    if (existingSuper) {
      throw new ConvexError({ code: "ALREADY_BOOTSTRAPPED", message: "Owner already exists" });
    }

    const username = validateUsername(args.username);
    validatePassword(args.password);

    const salt = randomHex(16);
    const passwordHash = await hashPassword(args.password, salt);
    const sessionToken = "sess-" + randomHex(24);

    let user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", args.deviceId))
      .unique();

    if (user) {
      await ctx.db.patch("users", user._id, {
        tokenIdentifier: sessionToken,
        username,
        passwordHash,
        passwordSalt: salt,
        authProvider: "password",
        adminRole: "super",
        isAdmin: true,
        userNumber: 1,
        profileComplete: true,
        lastLoginAt: Date.now(),
      });
    } else {
      const id = await ctx.db.insert("users", {
        tokenIdentifier: sessionToken,
        userNumber: 1,
        username,
        passwordHash,
        passwordSalt: salt,
        authProvider: "password",
        adminRole: "super",
        isAdmin: true,
        profileComplete: true,
        lastLoginAt: Date.now(),
      });
      user = await ctx.db.get(id);
    }

    return { sessionToken, userId: user!._id, username };
  },
});

export const signout = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", args.sessionToken))
      .unique();
    if (!user) return { ok: true, newGuestToken: null };
    const newGuest = "dev-" + randomHex(8);
    await ctx.db.patch("users", user._id, {
      tokenIdentifier: newGuest,
    });
    return { ok: true, newGuestToken: newGuest };
  },
});
