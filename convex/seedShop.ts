import { mutation } from "./_generated/server";
import { ConvexError, v } from "convex/values";

// ⚠️ One-time seed for shop items (idempotent)
export const seedShop = mutation({
  args: { confirm: v.string() },
  handler: async (ctx, args) => {
    if (args.confirm !== "seed-shop-v1") {
      throw new ConvexError({ code: "FORBIDDEN", message: "Confirm string mismatch" });
    }

    // Check if already seeded
    const existing = await ctx.db.query("shopItems").first();
    if (existing) {
      return { ok: true, message: "Already seeded", count: 0 };
    }

    // ============ Frames ============
    const frames = [
      { name: "KSA",              nameEn: "KSA",              price: 100,   rarity: "common",    hot: false },
      { name: "Egypt parach",     nameEn: "Egypt Parachute",  price: 100,   rarity: "common",    hot: false },
      { name: "Morocco",          nameEn: "Morocco",          price: 100,   rarity: "common",    hot: false },
      { name: "KWT",              nameEn: "Kuwait",           price: 2000,  rarity: "rare",      hot: false },
      { name: "تاج القمر",        nameEn: "Moon Crown",       price: 2000,  rarity: "rare",      hot: false },
      { name: "فوق الشمس",        nameEn: "Above Sun",        price: 1999,  rarity: "rare",      hot: true },
      { name: "فوق القمر",        nameEn: "Above Moon",       price: 1999,  rarity: "rare",      hot: true },
      { name: "ميكروفون ملون",    nameEn: "Colorful Mic",     price: 2000,  rarity: "rare",      hot: false },
      { name: "قراء القرآن",      nameEn: "Quran Readers",    price: 5000,  rarity: "epic",      hot: true },
      { name: "صوت ملائكي",       nameEn: "Angelic Voice",    price: 3000,  rarity: "epic",      hot: true },
      { name: "الثراء",           nameEn: "Wealth",           price: 5990,  rarity: "epic",      hot: false },
      { name: "الجمال",           nameEn: "Beauty",           price: 5990,  rarity: "epic",      hot: false },
      { name: "سيدة أنيقة",       nameEn: "Elegant Lady",     price: 10000, rarity: "legendary", hot: false },
      { name: "أيها الرجل النبيل", nameEn: "Noble Man",       price: 10000, rarity: "legendary", hot: false },
    ];

    // ============ Vehicles ============
    const vehicles = [
      { name: "السيارة الكلاسيكية-I", nameEn: "Classic Car I",    price: 700,   duration: 7,  rarity: "common",    hot: false },
      { name: "سيارة رياضية-II",      nameEn: "Sports Car II",    price: 5999,  duration: 7,  rarity: "rare",      hot: false },
      { name: "golden car",           nameEn: "Golden Car",       price: 7999,  duration: 7,  rarity: "rare",      hot: true },
      { name: "سيارة رياضية-III",     nameEn: "Sports Car III",   price: 7000,  duration: 15, rarity: "rare",      hot: false },
      { name: "نسر",                  nameEn: "Eagle",            price: 5000,  duration: 7,  rarity: "rare",      hot: false },
      { name: "كنز التنين",           nameEn: "Dragon Treasure",  price: 10000, duration: 7,  rarity: "epic",      hot: false },
      { name: "هليكوبتر",             nameEn: "Helicopter",       price: 10000, duration: 30, rarity: "epic",      hot: false },
      { name: "أثينا",                nameEn: "Athena",           price: 20000, duration: 7,  rarity: "legendary", hot: false },
      { name: "طائرة الغيوم",         nameEn: "Cloud Jet",        price: 20000, duration: 7,  rarity: "legendary", hot: false },
      { name: "طائرة SA",             nameEn: "SA Jet",           price: 50000, duration: 7,  rarity: "mythic",    hot: true },
      { name: "طائرة MA",             nameEn: "MA Jet",           price: 50000, duration: 7,  rarity: "mythic",    hot: true },
    ];

    // ============ Entry Effects ============
    const entries = [
      { name: "نخلة",                 nameEn: "Palm",             price: 1000,  duration: 30, rarity: "common",    hot: false },
      { name: "ميكروفون ملون",        nameEn: "Colorful Mic",     price: 2000,  duration: 30, rarity: "common",    hot: false },
      { name: "أحبك",                 nameEn: "Love You",         price: 700,   duration: 30, rarity: "common",    hot: false },
      { name: "قهوة",                 nameEn: "Coffee",           price: 1000,  duration: 30, rarity: "common",    hot: false },
      { name: "طاب مساؤك",            nameEn: "Good Evening",     price: 500,   duration: 30, rarity: "common",    hot: false },
      { name: "حب",                   nameEn: "Love",             price: 700,   duration: 30, rarity: "common",    hot: false },
      { name: "وردة",                 nameEn: "Rose",             price: 6000,  duration: 30, rarity: "epic",      hot: false },
      { name: "السفر عبر الزمن",      nameEn: "Time Travel",      price: 3990,  duration: 7,  rarity: "rare",      hot: false },
    ];

    // ============ Chat Bubbles ============
    const bubbles = [
      { name: "ميكروفون ملون",        nameEn: "Colorful Mic",     price: 7000,  duration: 30, rarity: "rare",      hot: false },
      { name: "حب",                   nameEn: "Love",             price: 2000,  duration: 30, rarity: "common",    hot: false },
      { name: "قهوة",                 nameEn: "Coffee",           price: 5000,  duration: 30, rarity: "rare",      hot: false },
      { name: "أحبك",                 nameEn: "Love You",         price: 2000,  duration: 30, rarity: "common",    hot: false },
      { name: "نخل",                  nameEn: "Palm",             price: 5000,  duration: 30, rarity: "rare",      hot: false },
      { name: "طاب مساؤك",            nameEn: "Good Evening",     price: 2000,  duration: 30, rarity: "common",    hot: false },
      { name: "KSA",                  nameEn: "KSA",              price: 5000,  duration: 30, rarity: "rare",      hot: false },
    ];

    // ============ Sound Waves ============
    const waves = [
      { name: "السفر عبر الزمن",      nameEn: "Time Travel",      price: 3990,  duration: 7,  rarity: "rare",      hot: false },
      { name: "ميكروفون ملون",        nameEn: "Colorful Mic",     price: 6000,  duration: 30, rarity: "rare",      hot: false },
      { name: "الجمال",               nameEn: "Beauty",           price: 20000, duration: 30, rarity: "legendary", hot: false },
      { name: "الثراء",               nameEn: "Wealth",           price: 20000, duration: 30, rarity: "legendary", hot: false },
      { name: "Annual Gift",          nameEn: "Annual Gift",      price: 7000,  duration: 30, rarity: "epic",      hot: false },
      { name: "ضوء القمر",            nameEn: "Moonlight",        price: 7000,  duration: 30, rarity: "epic",      hot: false },
      { name: "ضوء",                  nameEn: "Light",            price: 5000,  duration: 30, rarity: "rare",      hot: false },
      { name: "إعصار",                nameEn: "Hurricane",        price: 5000,  duration: 30, rarity: "rare",      hot: false },
    ];

    // ============ Profile Cards ============
    const cards = [
      { name: "الجمال",               nameEn: "Beauty",           price: 40000, duration: 7,  rarity: "epic",      hot: false },
      { name: "الثراء",               nameEn: "Wealth",           price: 40000, duration: 7,  rarity: "epic",      hot: false },
      { name: "سيدة أنيقة",           nameEn: "Elegant Lady",     price: 50000, duration: 7,  rarity: "legendary", hot: false },
    ];

    let count = 0;

    for (const f of frames) {
      await ctx.db.insert("shopItems", {
        category: "frame",
        name: f.name,
        nameEn: f.nameEn,
        imageUrl: "",
        price: f.price,
        durationDays: undefined,
        rarity: f.rarity as any,
        isHot: f.hot,
        active: true,
        sortOrder: count,
      });
      count++;
    }

    for (const v of vehicles) {
      await ctx.db.insert("shopItems", {
        category: "vehicle",
        name: v.name,
        nameEn: v.nameEn,
        imageUrl: "",
        price: v.price,
        durationDays: v.duration,
        rarity: v.rarity as any,
        isHot: v.hot,
        active: true,
        sortOrder: count,
      });
      count++;
    }

    for (const e of entries) {
      await ctx.db.insert("shopItems", {
        category: "entryEffect",
        name: e.name,
        nameEn: e.nameEn,
        imageUrl: "",
        price: e.price,
        durationDays: e.duration,
        rarity: e.rarity as any,
        isHot: e.hot,
        active: true,
        sortOrder: count,
      });
      count++;
    }

    for (const b of bubbles) {
      await ctx.db.insert("shopItems", {
        category: "chatBubble",
        name: b.name,
        nameEn: b.nameEn,
        imageUrl: "",
        price: b.price,
        durationDays: b.duration,
        rarity: b.rarity as any,
        isHot: b.hot,
        active: true,
        sortOrder: count,
      });
      count++;
    }

    for (const w of waves) {
      await ctx.db.insert("shopItems", {
        category: "soundWave",
        name: w.name,
        nameEn: w.nameEn,
        imageUrl: "",
        price: w.price,
        durationDays: w.duration,
        rarity: w.rarity as any,
        isHot: w.hot,
        active: true,
        sortOrder: count,
      });
      count++;
    }

    for (const c of cards) {
      await ctx.db.insert("shopItems", {
        category: "profileCard",
        name: c.name,
        nameEn: c.nameEn,
        imageUrl: "",
        price: c.price,
        durationDays: c.duration,
        rarity: c.rarity as any,
        isHot: c.hot,
        active: true,
        sortOrder: count,
      });
      count++;
    }

    return { ok: true, count };
  },
});
