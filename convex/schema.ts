import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    tokenIdentifier: v.string(),
    userNumber: v.optional(v.number()),
    username: v.optional(v.string()),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    avatarId: v.optional(v.id("_storage")),  // legacy
    avatarUrl: v.optional(v.string()),       // Cloudinary
    age: v.optional(v.number()),
    gender: v.optional(v.union(v.literal("male"), v.literal("female"), v.literal("other"))),
    country: v.optional(v.string()),
    interests: v.optional(v.array(v.string())),
    bio: v.optional(v.string()),
    profileComplete: v.optional(v.boolean()),
    charms: v.optional(v.number()),
    coins: v.optional(v.number()),
    totalSent: v.optional(v.number()),
    totalReceived: v.optional(v.number()),
    isAdmin: v.optional(v.boolean()),
    banned: v.optional(v.boolean()),
    adminRole: v.optional(v.union(v.literal("super"), v.literal("moderator"))),
  })
    .index("by_token", ["tokenIdentifier"])
    .index("by_userNumber", ["userNumber"])
    .index("by_username", ["username"])
    .index("by_totalReceived", ["totalReceived"]),

  counters: defineTable({
    name: v.string(),
    value: v.number(),
  }).index("by_name", ["name"]),

  rooms: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    welcomeMessage: v.optional(v.string()),
    ownerId: v.id("users"),
    isPrivate: v.boolean(),
    micCount: v.number(),
    memberCount: v.number(),
    micLayout: v.optional(v.string()),
    coverImageId: v.optional(v.id("_storage")),        // legacy
    coverUrl: v.optional(v.string()),                  // Cloudinary
    backgroundImageId: v.optional(v.id("_storage")),   // legacy
    backgroundUrl: v.optional(v.string()),             // Cloudinary
    micRequestsEnabled: v.optional(v.boolean()),       // طلب المايك
  })
    .index("by_isPrivate", ["isPrivate"])
    .index("by_owner", ["ownerId"]),

  roomMembers: defineTable({
    roomId: v.id("rooms"),
    userId: v.id("users"),
    role: v.union(v.literal("owner"), v.literal("moderator"), v.literal("speaker"), v.literal("listener")),
    banned: v.optional(v.boolean()),
  })
    .index("by_room_and_user", ["roomId", "userId"])
    .index("by_user", ["userId"])
    .index("by_room", ["roomId"]),

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
    imageId: v.optional(v.id("_storage")),  // legacy
    imageUrl: v.optional(v.string()),       // Cloudinary
    system: v.optional(v.boolean()),
  }).index("by_room", ["roomId"]),

  micInvites: defineTable({
    roomId: v.id("rooms"),
    toUserId: v.id("users"),
    fromUserId: v.id("users"),
    fromName: v.string(),
    seatIndex: v.number(),
    status: v.union(v.literal("pending"), v.literal("accepted"), v.literal("declined")),
  })
    .index("by_room", ["roomId"])
    .index("by_to_and_status", ["toUserId", "status"]),

  // [moorawi] طلبات المايك — ephemeral (تُحذف بعد رؤية الإشعار)
  micRequests: defineTable({
    roomId: v.id("rooms"),
    userId: v.id("users"),
    userName: v.string(),
    avatarUrl: v.optional(v.string()),
    userNumber: v.optional(v.number()),
    status: v.union(v.literal("pending"), v.literal("accepted"), v.literal("rejected")),
  })
    .index("by_room_and_status", ["roomId", "status"])
    .index("by_user_and_room", ["userId", "roomId"]),

  gifts: defineTable({
    name: v.string(),
    price: v.number(),
    category: v.string(),
    mediaId: v.optional(v.id("_storage")),   // legacy
    mediaUrl: v.optional(v.string()),        // Cloudinary
    mediaType: v.union(v.literal("image"), v.literal("video")),
    hasSound: v.optional(v.boolean()),
    isGlobal: v.optional(v.boolean()),
    isRelationship: v.optional(v.boolean()),
    forceGlobal: v.optional(v.boolean()),
    showsBanner: v.optional(v.boolean()),
    active: v.boolean(),
  }).index("by_active", ["active"]),

  giftTransactions: defineTable({
    roomId: v.id("rooms"),
    fromUserId: v.id("users"),
    fromName: v.string(),
    toUserId: v.id("users"),
    toName: v.string(),
    giftId: v.id("gifts"),
    giftName: v.string(),
    giftIcon: v.string(),
    quantity: v.number(),
    totalPrice: v.number(),
    batchId: v.optional(v.string()),
  })
    .index("by_room", ["roomId"])
    .index("by_to", ["toUserId"])
    .index("by_from", ["fromUserId"])
    .index("by_batch", ["batchId"]),

  auditLogs: defineTable({
    adminId: v.id("users"),
    adminName: v.string(),
    action: v.string(),
    target: v.string(),
  }),
});
