import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    tokenIdentifier: v.string(),
    userNumber: v.optional(v.number()),
    username: v.optional(v.string()),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    avatarId: v.optional(v.id("_storage")),
    age: v.optional(v.number()),
    gender: v.optional(v.union(v.literal("male"), v.literal("female"), v.literal("other"))),
    country: v.optional(v.string()),
    interests: v.optional(v.array(v.string())),
    bio: v.optional(v.string()),
    profileComplete: v.optional(v.boolean()),
    isAdmin: v.optional(v.boolean()),
    banned: v.optional(v.boolean()),
    adminRole: v.optional(v.union(v.literal("super"), v.literal("moderator"))),
  })
    .index("by_token", ["tokenIdentifier"])
    .index("by_userNumber", ["userNumber"])
    .index("by_username", ["username"]),

  counters: defineTable({
    name: v.string(),
    value: v.number(),
  }).index("by_name", ["name"]),

  rooms: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    ownerId: v.id("users"),
    isPrivate: v.boolean(),
    micCount: v.number(),
    memberCount: v.number(),
  })
    .index("by_isPrivate", ["isPrivate"])
    .index("by_owner", ["ownerId"]),

  roomMembers: defineTable({
    roomId: v.id("rooms"),
    userId: v.id("users"),
    role: v.union(
      v.literal("owner"),
      v.literal("moderator"),
      v.literal("speaker"),
      v.literal("listener")
    ),
    banned: v.optional(v.boolean()),
  })
    .index("by_room_and_user", ["roomId", "userId"])
    .index("by_user", ["userId"]),

  micSeats: defineTable({
    roomId: v.id("rooms"),
    seatIndex: v.number(),
    userId: v.optional(v.id("users")),
    locked: v.boolean(),
    muted: v.boolean(),
  }).index("by_room_and_seatIndex", ["roomId", "seatIndex"]),

  messages: defineTable({
    roomId: v.id("rooms"),
    senderId: v.id("users"),
    senderName: v.string(),
    text: v.optional(v.string()),
    imageId: v.optional(v.id("_storage")),
    system: v.optional(v.boolean()),
  })
    .index("by_room", ["roomId"]),

  auditLogs: defineTable({
    adminId: v.id("users"),
    adminName: v.string(),
    action: v.string(),
    target: v.string(),
  }),
});
