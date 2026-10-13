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
    // [moorawi-auth] Authentication
    passwordHash: v.optional(v.string()),
    passwordSalt: v.optional(v.string()),
    authProvider: v.optional(v.union(v.literal("guest"), v.literal("password"))),
    lastLoginAt: v.optional(v.number()),

    // [moorawi-economy] Economy
    diamonds: v.optional(v.number()),                     // ماس (من استقبال الهدايا)
    totalPurchased: v.optional(v.number()),               // إجمالي الشحن (USD cents)
    totalRecharged: v.optional(v.number()),               // إجمالي العملات المشحونة

    // [moorawi-vip] VIP
    // [moorawi-agency] Host fields
    agencyId: v.optional(v.id("agencies")),
    agencyNumber: v.optional(v.number()),
    isHost: v.optional(v.boolean()),
    hostLevel: v.optional(v.number()),
    hostIncomeMonth: v.optional(v.number()),
    hostHoursMonth: v.optional(v.number()),
    hostDaysMonth: v.optional(v.number()),
    // [moorawi-missions] Daily login streak
    loginStreak: v.optional(v.number()),
    lastLoginRewardAt: v.optional(v.number()),
    vipLevel: v.optional(v.number()),                     // 0-7
    vipExpiresAt: v.optional(v.number()),

    // [moorawi-assets] Equipped items
    titleId: v.optional(v.string()),                      // معرّف اللقب (نص)
    titleText: v.optional(v.string()),                    // النص المعروض
    equippedFrameId: v.optional(v.id("shopItems")),
    equippedVehicleId: v.optional(v.id("shopItems")),
    equippedEntryEffectId: v.optional(v.id("shopItems")),
    equippedChatBubbleId: v.optional(v.id("shopItems")),
    equippedSoundWaveId: v.optional(v.id("shopItems")),
    equippedProfileCardId: v.optional(v.id("shopItems")),
    equippedMedalId: v.optional(v.id("medals")),

    // [moorawi-social] Social counters
    visitorCount: v.optional(v.number()),
    fanCount: v.optional(v.number()),
    followingCount: v.optional(v.number()),
    followerCount: v.optional(v.number()),
    friendCount: v.optional(v.number()),
    medalCount: v.optional(v.number()),                   // وسام +N

    // [moorawi-relations] Partner/CP
    partnerId: v.optional(v.id("users")),
    partnerType: v.optional(v.string()),                  // "cp" | "trueLove" | ...
    partnerSince: v.optional(v.number()),

    // [moorawi-verification] Verification
    verificationStatus: v.optional(v.union(
      v.literal("none"),
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected"),
    )),

    // [moorawi-security] Privacy
    hideVisits: v.optional(v.boolean()),
    incognito: v.optional(v.boolean()),
    hideFollowing: v.optional(v.boolean()),
  })
    .index("by_token", ["tokenIdentifier"])
    .index("by_userNumber", ["userNumber"])
    .index("by_username", ["username"])
    .index("by_totalReceived", ["totalReceived"])
    .index("by_totalSent", ["totalSent"])
    .index("by_charms", ["charms"]),

  // [moorawi-trophy] Weekly reward claims log
  roomWeeklyRewards: defineTable({
    roomId: v.id("rooms"),
    ownerId: v.id("users"),
    cycleKey: v.string(),         // e.g. "2026-W42"
    tier: v.number(),             // 1, 3, 6 (million)
    coinsAwarded: v.number(),
    vipLevel: v.number(),         // VIP level granted to members
    vipCount: v.number(),         // how many members can get VIP
    vipClaimedBy: v.optional(v.array(v.id("users"))),  // members who claimed
    claimedAt: v.number(),
  })
    .index("by_room_and_cycle", ["roomId", "cycleKey"])
    .index("by_owner", ["ownerId"]),

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
    // [moorawi-room-id] Public room number (numeric ID)
    roomNumber: v.optional(v.number()),
    // [moorawi-staff] Staff permissions (toggles)
    staffPermissions: v.optional(v.object({
      roomImage: v.boolean(),
      roomName: v.boolean(),
      announcement: v.boolean(),
      welcomeMessage: v.boolean(),
      staffSettings: v.boolean(),
      blacklist: v.boolean(),
      micManagement: v.boolean(),
      roomBackground: v.boolean(),
      roomLock: v.boolean(),
      agencyMode: v.boolean(),
      screenClear: v.boolean(),
    },)),
    // [moorawi-music] Shared room music — everyone in room hears it
    // Each client can mute locally without affecting others.
    currentMusicId: v.optional(v.id("userMusic")),
    currentMusicUrl: v.optional(v.string()),
    currentMusicName: v.optional(v.string()),
    currentMusicStartedBy: v.optional(v.id("users")),
    currentMusicStartedAt: v.optional(v.number()),
    currentMusicPausedAt: v.optional(v.number()),  // seconds position when paused
    currentMusicIsPaused: v.optional(v.boolean()),
    // [ezo-music] Advanced music system
    musicPlayMode: v.optional(v.union(
      v.literal("single"),
      v.literal("loop"),
      v.literal("sequence"),
      v.literal("shuffle"),
    )),
    currentMusicCoverUrl: v.optional(v.string()),
    currentMusicDurationSec: v.optional(v.number()),
    currentMusicCategory: v.optional(v.string()),

    // [ezo-lock] Room lock
    isLocked: v.optional(v.boolean()),
    lockPassword: v.optional(v.string()),

    // [ezo-deco] Room decorations (shopItem IDs)
    roomDecorations: v.optional(v.array(v.id("shopItems"))),

    // [ezo-effects] Room visual effects
    screenEffect: v.optional(v.union(
      v.literal("none"),
      v.literal("blur"),
      v.literal("dim"),
      v.literal("warm"),
      v.literal("cool"),
    )),

    // [ezo-effects] Active vehicle effect (shopItem ID)
    vehicleEffectId: v.optional(v.id("shopItems")),
    vehicleEffectStartedAt: v.optional(v.number()),

    // [ezo-effects] Active gift effect (shopItem ID)
    giftEffectId: v.optional(v.id("shopItems")),
    giftEffectStartedAt: v.optional(v.number()),

    // [ezo-ui] Mini chat toggle
    miniChatEnabled: v.optional(v.boolean()),

    // [ezo-voice] Voice changer effect (client-side processing hint)
    voiceChangerEffect: v.optional(v.union(
      v.literal("none"),
      v.literal("robot"),
      v.literal("chipmunk"),
      v.literal("deep"),
      v.literal("echo"),
    )),

    // [moorawi-trophy] Room Trophy (weekly coins spent)
    weeklyTotal: v.optional(v.number()),
    weeklyCycleKey: v.optional(v.string()),           // e.g. "2026-W42"
    weeklyResetAt: v.optional(v.number()),
    // [moorawi-trophy] Reward claim state
    weeklyRewardTier: v.optional(v.number()),         // 0/1/3/6 (million)
    weeklyRewardClaimed: v.optional(v.boolean()),
  })
    .index("by_isPrivate", ["isPrivate"])
    .index("by_owner", ["ownerId"])
    .index("by_roomNumber", ["roomNumber"])
    .index("by_weeklyTotal", ["weeklyTotal"]),

  roomMembers: defineTable({
    roomId: v.id("rooms"),
    userId: v.id("users"),
    role: v.union(v.literal("owner"), v.literal("moderator"), v.literal("speaker"), v.literal("listener")),
    banned: v.optional(v.boolean()),
    // [ezo-presence] تتبع الحضور — heartbeat كل 25s + تنظيف دوري
    lastSeenAt: v.optional(v.number()),
    sessionId: v.optional(v.string()),
    sessionStartedAt: v.optional(v.number()),
  })
    .index("by_room_and_user", ["roomId", "userId"])
    .index("by_user", ["userId"])
    .index("by_room", ["roomId"])
    .index("by_room_lastSeen", ["roomId", "lastSeenAt"])
    .index("by_lastSeen", ["lastSeenAt"]),

  micSeats: defineTable({
    roomId: v.id("rooms"),
    seatIndex: v.number(),
    userId: v.optional(v.id("users")),
    locked: v.boolean(),
    muted: v.boolean(),
    adminMuted: v.optional(v.boolean()),
    // [ezo-charms] عداد الجاذبية لكل جلسة على المايك
    sessionCharms: v.optional(v.number()),
    sessionStartedAt: v.optional(v.number()),
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

  // [moorawi] Room actions log (activity feed)
  roomActions: defineTable({
    roomId: v.id("rooms"),
    actorId: v.id("users"),
    actorName: v.string(),
    actorAvatar: v.optional(v.string()),
    actorNumber: v.optional(v.number()),
    targetId: v.id("users"),
    targetName: v.string(),
    targetAvatar: v.optional(v.string()),
    targetNumber: v.optional(v.number()),
    action: v.string(), // "kick" | "ban" | "unban" | "mute" | "unmute" | "promote" | "demote" | "removeFromSeat" | "adminMute" | "adminUnmute"
    createdAt: v.number(),
  })
    .index("by_room_and_createdAt", ["roomId", "createdAt"]),

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

  // ================================================================
  // [moorawi-economy] ECONOMY — wallet transactions
  // ================================================================
  // [ezo-vip] VIP Entry animations — يظهر عند دخول VIP 3+ للغرفة
  roomEntries: defineTable({
    roomId: v.id("rooms"),
    userId: v.id("users"),
    level: v.number(),         // VIP level عند الدخول (0-7)
    name: v.string(),
    avatarUrl: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_room_and_createdAt", ["roomId", "createdAt"]),

  walletTransactions: defineTable({
    userId: v.id("users"),
    type: v.union(
      v.literal("recharge"),
      v.literal("spend"),
      v.literal("gift_sent"),
      v.literal("gift_received"),
      v.literal("reward"),
      v.literal("exchange"),
      v.literal("admin_grant"),
      v.literal("purchase"),
    ),
    amount: v.number(),
    balanceAfter: v.number(),
    meta: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_user_and_createdAt", ["userId", "createdAt"])
    .index("by_user_and_type", ["userId", "type"]),

  // ================================================================
  // [moorawi-shop] SHOP ITEMS (frames, vehicles, effects, ...)
  // ================================================================
  shopItems: defineTable({
    category: v.union(
      v.literal("frame"),
      v.literal("vehicle"),
      v.literal("entryEffect"),
      v.literal("chatBubble"),
      v.literal("soundWave"),
      v.literal("profileCard"),
      v.literal("decoration"),
      v.literal("vipId"),
      v.literal("skin"),
    ),
    name: v.string(),
    nameEn: v.optional(v.string()),
    imageUrl: v.string(),
    previewUrl: v.optional(v.string()),
    previewType: v.optional(v.union(v.literal("image"), v.literal("video"))),
    price: v.number(),
    durationDays: v.optional(v.number()),
    rarity: v.union(
      v.literal("common"),
      v.literal("rare"),
      v.literal("epic"),
      v.literal("legendary"),
      v.literal("mythic"),
    ),
    isHot: v.optional(v.boolean()),
    isNew: v.optional(v.boolean()),
    active: v.boolean(),
    sortOrder: v.optional(v.number()),
    // [moorawi-9patch] Chat bubble 9-slice insets (CSS border-image)
    sliceTop: v.optional(v.number()),
    sliceRight: v.optional(v.number()),
    sliceBottom: v.optional(v.number()),
    sliceLeft: v.optional(v.number()),
    // [ezo-frame] Frame placement (Yalla/SUGO standard)
    frameScale: v.optional(v.number()),       // 1.0 = same as avatar, default 1.4
    frameOffsetX: v.optional(v.number()),     // px offset from center, default 0
    frameOffsetY: v.optional(v.number()),     // px offset from center, default 0
  })
    .index("by_category_active", ["category", "active"])
    .index("by_active", ["active"]),

  userInventory: defineTable({
    userId: v.id("users"),
    itemId: v.id("shopItems"),
    category: v.string(),
    acquiredAt: v.number(),
    expiresAt: v.optional(v.number()),
    isEquipped: v.boolean(),
    purchaseType: v.union(
      v.literal("buy"),
      v.literal("gift_received"),
      v.literal("reward"),
      v.literal("admin"),
    ),
    fromUserId: v.optional(v.id("users")),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_category", ["userId", "category"])
    .index("by_user_and_equipped", ["userId", "isEquipped"])
    .index("by_user_and_item", ["userId", "itemId"])
    .index("by_expiresAt", ["expiresAt"]),

  // ================================================================
  // [moorawi-vip] VIP SUBSCRIPTIONS
  // ================================================================
  vipSubscriptions: defineTable({
    userId: v.id("users"),
    level: v.number(),
    purchasedAt: v.number(),
    expiresAt: v.number(),
    autoRenew: v.boolean(),
    purchasePrice: v.number(),
    source: v.union(
      v.literal("purchase"),
      v.literal("gift"),
      v.literal("admin"),
    ),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_expiresAt", ["userId", "expiresAt"])
    .index("by_expiresAt", ["expiresAt"]),

  // ================================================================
  // [moorawi-medals] MEDALS
  // ================================================================
  medals: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    imageUrl: v.string(),
    tier: v.union(
      v.literal("C"),
      v.literal("B"),
      v.literal("A"),
      v.literal("S"),
      v.literal("SS"),
      v.literal("SSS"),
    ),
    category: v.union(
      v.literal("activity"),
      v.literal("wealth"),
      v.literal("charm"),
      v.literal("monthly"),
      v.literal("weekly"),
      v.literal("special"),
    ),
    value: v.number(),
    active: v.boolean(),
  })
    .index("by_tier", ["tier"])
    .index("by_category_active", ["category", "active"]),

  userMedals: defineTable({
    userId: v.id("users"),
    medalId: v.id("medals"),
    earnedAt: v.number(),
    progress: v.optional(v.number()),
    equipped: v.boolean(),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_equipped", ["userId", "equipped"]),

  // ================================================================
  // [moorawi-relations] RELATIONSHIPS (CP, true love, ...)
  // ================================================================
  relationships: defineTable({
    userId1: v.id("users"),
    userId2: v.id("users"),
    type: v.union(
      v.literal("cp"),
      v.literal("trueLove"),
      v.literal("bestFriend"),
      v.literal("sister"),
      v.literal("brother"),
    ),
    level: v.number(),
    loveScore: v.number(),
    since: v.number(),
    status: v.union(v.literal("active"), v.literal("ended")),
    endedAt: v.optional(v.number()),
  })
    .index("by_user1", ["userId1"])
    .index("by_user2", ["userId2"])
    .index("by_user1_and_status", ["userId1", "status"])
    .index("by_user2_and_status", ["userId2", "status"]),

  relationshipRequests: defineTable({
    fromUserId: v.id("users"),
    toUserId: v.id("users"),
    type: v.union(
      v.literal("cp"),
      v.literal("trueLove"),
      v.literal("bestFriend"),
      v.literal("sister"),
      v.literal("brother"),
    ),
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("rejected"),
      v.literal("cancelled"),
    ),
    createdAt: v.number(),
    respondedAt: v.optional(v.number()),
  })
    .index("by_to_and_status", ["toUserId", "status"])
    .index("by_from_and_status", ["fromUserId", "status"]),

  // ================================================================
  // [moorawi-social] FOLLOWS + VISITS
  // ================================================================
  follows: defineTable({
    followerId: v.id("users"),
    followingId: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_follower", ["followerId"])
    .index("by_following", ["followingId"])
    .index("by_pair", ["followerId", "followingId"]),

  visits: defineTable({
    visitorId: v.id("users"),
    visitedUserId: v.id("users"),
    source: v.union(v.literal("profile"), v.literal("room")),
    visitedAt: v.number(),
  })
    .index("by_visited_and_visitedAt", ["visitedUserId", "visitedAt"])
    .index("by_visitor", ["visitorId"]),

  // ================================================================
  // [moorawi-missions] MISSIONS
  // ================================================================
  missions: defineTable({
    key: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    reward: v.number(),
    rewardType: v.union(
      v.literal("coins"),
      v.literal("medal"),
      v.literal("item"),
    ),
    rewardItemId: v.optional(v.id("shopItems")),
    type: v.union(
      v.literal("daily"),
      v.literal("weekly"),
      v.literal("new_user"),
      v.literal("achievement"),
    ),
    target: v.number(),
    sortOrder: v.optional(v.number()),
    active: v.boolean(),
  })
    .index("by_key", ["key"])
    .index("by_type_active", ["type", "active"]),

  userMissions: defineTable({
    userId: v.id("users"),
    missionId: v.id("missions"),
    progress: v.number(),
    completedAt: v.optional(v.number()),
    claimedAt: v.optional(v.number()),
    cycleKey: v.optional(v.string()),
  })
    .index("by_user_and_mission", ["userId", "missionId"])
    .index("by_user_and_cycle", ["userId", "cycleKey"]),


  // ================================================================
  // [moorawi-music] USER MUSIC LIBRARY (personal, private)
  // Each user uploads their own tracks. Only they can see/play them.
  // ================================================================
  userMusic: defineTable({
    userId: v.id("users"),
    name: v.string(),
    url: v.string(),
    durationSec: v.optional(v.number()),
    coverUrl: v.optional(v.string()),
    category: v.optional(v.string()),
    isPublic: v.optional(v.boolean()),       // مكتبة عامة (من الأدمن)
    uploadedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_public", ["isPublic", "uploadedAt"]),

  // ================================================================
  // [moorawi-verification] VERIFICATION REQUESTS
  // ================================================================
  verificationRequests: defineTable({
    userId: v.id("users"),
    imageUrl: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected"),
    ),
    submittedAt: v.number(),
    reviewedAt: v.optional(v.number()),
    reviewedBy: v.optional(v.id("users")),
    reason: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_status", ["status"]),

  // [moorawi-assets] Static asset overrides — admin can upload images
  // Keys: "vip.pvip.1..7", "vip.banner.1..7", "admin.super", "admin.moderator"
  // Missing key → fallback to bundled /vip/*.png or /badges/*.png
  assets: defineTable({
    key: v.string(),
    imageUrl: v.optional(v.string()),
    frameScale: v.optional(v.number()),
    frameOffsetX: v.optional(v.number()),
    frameOffsetY: v.optional(v.number()),
    updatedAt: v.number(),
    updatedBy: v.optional(v.id("users")),
  }).index("by_key", ["key"]),

  // [moorawi-vip] VIP BENEFITS — per-level features (from DB)
  // Each level (1-7) has its own ordered list of benefits.
  // Admin can add/edit/remove/reorder.
  vipBenefits: defineTable({
    level: v.number(),         // 1-7
    order: v.number(),         // sort order within level
    icon: v.string(),          // lucide icon name (e.g. "Crown", "Eye")
    textAr: v.string(),
    textEn: v.optional(v.string()),
    active: v.boolean(),
  }).index("by_level", ["level", "order"]),

  // [moorawi-bubbles] 9-Patch Chat Bubbles (admin-managed)
  // Each bubble stores imageUrl + 4 slice insets for CSS border-image.
  // Key example: "bubble.vip4", "bubble.default", "bubble.gold"
  chatBubbles: defineTable({
    key: v.string(),
    name: v.string(),
    imageUrl: v.string(),
    sliceTop: v.number(),
    sliceRight: v.number(),
    sliceBottom: v.number(),
    sliceLeft: v.number(),
    // [moorawi-9patch] image natural dimensions for smart scaling
    imageWidth: v.optional(v.number()),
    imageHeight: v.optional(v.number()),
    active: v.boolean(),
  })
    .index("by_key", ["key"])
    .index("by_active", ["active"]),

  // [moorawi-banners] Promotional banners (16:9 slideshow in Trend tab)
  banners: defineTable({
    imageUrl: v.string(),
    title: v.optional(v.string()),
    linkRoomId: v.optional(v.id("rooms")),
    order: v.number(),
    active: v.boolean(),
    updatedAt: v.number(),
    updatedBy: v.optional(v.id("users")),
  }).index("by_active_order", ["active", "order"]),

  // ================================================================
  // [moorawi-agency] AGENCY SYSTEM
  // ================================================================
  agencies: defineTable({
    name: v.string(),
    agencyNumber: v.optional(v.number()),
    ownerId: v.id("users"),
    level: v.union(
      v.literal("D"), v.literal("C"), v.literal("B"),
      v.literal("A"), v.literal("S")
    ),
    totalPoints30d: v.number(),
    hostCount: v.number(),
    totalEarned: v.number(),         // إجمالي أرباح الوكالة (جوهرة)
    description: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_owner", ["ownerId"])
    .index("by_level", ["level"]),

  // علاقة المضيف بالوكالة
  agencyHosts: defineTable({
    agencyId: v.id("agencies"),
    userId: v.id("users"),
    status: v.union(v.literal("active"), v.literal("left"), v.literal("kicked")),
    joinedAt: v.number(),
    leftAt: v.optional(v.number()),
  })
    .index("by_agency", ["agencyId", "status"])
    .index("by_user", ["userId"])
    .index("by_user_status", ["userId", "status"]),

  // طلبات الانضمام
  agencyRequests: defineTable({
    agencyId: v.id("agencies"),
    userId: v.id("users"),
    status: v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected")),
    createdAt: v.number(),
    reviewedAt: v.optional(v.number()),
  })
    .index("by_agency", ["agencyId", "status"])
    .index("by_user", ["userId", "status"]),

  // أرباح المضيف الشهرية (يُسجَّل مرة واحدة نهاية كل شهر)
  hostMonthlyEarnings: defineTable({
    hostId: v.id("users"),
    agencyId: v.optional(v.id("agencies")),
    month: v.string(),               // "2026-10"
    targetCoins: v.number(),         // هدف الفئة الحالية
    achievedCoins: v.number(),       // ما حققه فعلاً
    diamondsEarned: v.number(),      // 30% مُنزَّل للرصيد
    diamondsSpent: v.number(),       // ما صرفه
    diamondsHeld: v.number(),        // ما بقي في الحساب
    currentLevel: v.number(),        // 1-15
    baseSalary: v.number(),          // راتب العملات بالدولار
    diamondSalary: v.number(),       // راتب الماس بالدولار
    totalSalary: v.number(),         // الإجمالي
    agencyCut: v.number(),           // نصيب الوكالة
    broadcastHours: v.number(),
    broadcastDays: v.number(),
    halfSeasonReached: v.boolean(),  // وصل نصف الموسم
    targetReached: v.boolean(),      // حقق التارجت
    vipRewardDays: v.optional(v.number()),
    frameRewardId: v.optional(v.string()),
    entryRewardId: v.optional(v.string()),
    status: v.union(v.literal("pending"), v.literal("paid"), v.literal("rejected")),
    createdAt: v.number(),
    paidAt: v.optional(v.number()),
  })
    .index("by_host_month", ["hostId", "month"])
    .index("by_agency_month", ["agencyId", "month"])
    .index("by_month_status", ["month", "status"]),

  // جدول مستويات المضيفين (ثابت — للقراءة)
  hostLevels: defineTable({
    level: v.number(),                  // 1-15
    daysRequired: v.number(),           // 15/10/8/0
    hoursPerDay: v.number(),            // 20/15/12/0
    targetCoins: v.number(),            // 20K...10.5M
    halfSeasonCoins: v.number(),        // 6K...3.15M
    baseSalary: v.number(),             // 7$...2,500$
    diamondSalary: v.number(),          // 6$...3,600$
    totalSalary: v.number(),            // 13$...6,100$
    agencySalary: v.number(),           // 4$...1,400$
    vipRewardDays: v.optional(v.number()),
    vipRewardCount: v.optional(v.number()),
    frameRewardLevel: v.optional(v.number()),
    entryRewardLevel: v.optional(v.number()),
  })
    .index("by_level", ["level"]),


  // ================================================================
  // [moorawi-agency] طلبات إنشاء وكالة جديدة
  // ================================================================
  agencyCreateRequests: defineTable({
    userId: v.id("users"),
    agencyName: v.string(),
    description: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
    // [moorawi-agency] حقول النموذج الجديدة
    fullName: v.optional(v.string()),
    idNumber: v.optional(v.string()),
    phone: v.optional(v.string()),
    bio: v.optional(v.string()),
    status: v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected")),
    createdAt: v.number(),
    reviewedAt: v.optional(v.number()),
    reviewedBy: v.optional(v.id("users")),
    note: v.optional(v.string()),
  })
    .index("by_user", ["userId", "status"])
    .index("by_status", ["status", "createdAt"]),


  // ================================================================
  // [moorawi-config] إعدادات عامة (قابلة للتعديل من لوحة الإدارة)
  // ================================================================
  config: defineTable({
    key: v.string(),
    value: v.string(),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),


  // ================================================================
  // [ezo-messages] نظام الرسائل المباشرة
  // ================================================================
  conversations: defineTable({
    user1Id: v.id("users"),
    user2Id: v.id("users"),
    lastMessageAt: v.number(),
    lastMessageText: v.optional(v.string()),
    lastMessageFrom: v.optional(v.id("users")),
    unread1: v.number(),
    unread2: v.number(),
  })
    .index("by_user1", ["user1Id", "lastMessageAt"])
    .index("by_user2", ["user2Id", "lastMessageAt"])
    .index("by_pair", ["user1Id", "user2Id"]),

  directMessages: defineTable({
    conversationId: v.id("conversations"),
    fromUserId: v.id("users"),
    toUserId: v.id("users"),
    text: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    readAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_conversation", ["conversationId", "createdAt"])
    .index("by_to_unread", ["toUserId", "readAt"]),

  // ================================================================
  // [ezo-notifications] رسائل النظام (من Ezo)
  // ================================================================
  systemNotifications: defineTable({
    userId: v.id("users"),           // المستهدف (أو userId = null للعام)
    type: v.union(
      v.literal("welcome"),
      v.literal("announcement"),
      v.literal("host_invite"),
      v.literal("reward"),
      v.literal("verification"),
      v.literal("agency"),
      v.literal("system"),
    ),
    title: v.string(),
    body: v.string(),
    iconUrl: v.optional(v.string()),
    actionType: v.optional(v.string()),       // "open_agency" | "open_room" | ...
    actionPayload: v.optional(v.string()),
    readAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId", "createdAt"])
    .index("by_user_unread", ["userId", "readAt"]),

  // ================================================================
  // [ezo-friends] طلبات الصداقة
  // ================================================================
  friendRequests: defineTable({
    fromUserId: v.id("users"),
    toUserId: v.id("users"),
    status: v.union(v.literal("pending"), v.literal("accepted"), v.literal("rejected")),
    createdAt: v.number(),
    reviewedAt: v.optional(v.number()),
  })
    .index("by_to", ["toUserId", "status"])
    .index("by_from", ["fromUserId", "status"])
    .index("by_pair", ["fromUserId", "toUserId"]),


  // ================================================================
  // [ezo-moments] نظام اللحظات (منشورات)
  // ================================================================
  moments: defineTable({
    userId: v.id("users"),
    text: v.optional(v.string()),
    imageUrls: v.array(v.string()),
    likeCount: v.number(),
    commentCount: v.number(),
    visibility: v.union(v.literal("public"), v.literal("friends")),
    createdAt: v.number(),
  })
    .index("by_user", ["userId", "createdAt"])
    .index("by_created", ["createdAt"]),

  momentLikes: defineTable({
    momentId: v.id("moments"),
    userId: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_moment", ["momentId"])
    .index("by_user_and_moment", ["userId", "momentId"]),

  momentComments: defineTable({
    momentId: v.id("moments"),
    userId: v.id("users"),
    text: v.string(),
    createdAt: v.number(),
  })
    .index("by_moment", ["momentId", "createdAt"]),


  // ================================================================
  // [ezo-music] قائمة تشغيل الغرفة (Queue)
  // ================================================================
  musicQueue: defineTable({
    roomId: v.id("rooms"),
    userId: v.id("users"),
    musicId: v.id("userMusic"),
    status: v.union(
      v.literal("pending"),
      v.literal("playing"),
      v.literal("played"),
      v.literal("skipped"),
    ),
    addedAt: v.number(),
    playedAt: v.optional(v.number()),
  })
    .index("by_room_status", ["roomId", "status", "addedAt"])
    .index("by_room_and_user", ["roomId", "userId"]),

});
