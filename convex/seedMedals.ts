import { mutation } from "./_generated/server";
import { ConvexError, v } from "convex/values";

// [moorawi-medals] Seed medals (idempotent)
export const seedMedals = mutation({
  args: { confirm: v.string() },
  handler: async (ctx, args) => {
    if (args.confirm !== "seed-medals-v1") {
      throw new ConvexError({ code: "FORBIDDEN", message: "Confirm mismatch" });
    }

    const existing = await ctx.db.query("medals").first();
    if (existing) {
      return { ok: true, message: "Already seeded", count: 0 };
    }

    // ============ 6 tiers (C, B, A, S, SS, SSS) ============
    // Categories: activity, wealth, charm, monthly, weekly, special

    const medals: Array<{
      name: string;
      description?: string;
      tier: "C" | "B" | "A" | "S" | "SS" | "SSS";
      category: "activity" | "wealth" | "charm" | "monthly" | "weekly" | "special";
      value: number;
    }> = [];

    // ============ ACTIVITY (وسام النشاط) ============
    medals.push(
      { name: "وسام حبات الرمل",   description: "0-49 شهرة",   tier: "C",   category: "activity", value: 25 },
      { name: "وسام كثبان النحاس", description: "50-99",        tier: "B",   category: "activity", value: 75 },
      { name: "وسام واحة الفضة",    description: "100-499",      tier: "A",   category: "activity", value: 300 },
      { name: "وسام اللهب العميق",  description: "500-999",      tier: "S",   category: "activity", value: 750 },
      { name: "وسام النخيل الذهبي", description: "1000-1999",    tier: "SS",  category: "activity", value: 1500 },
      { name: "وسام البطل المشرف",  description: "+2000",        tier: "SSS", category: "activity", value: 2500 },
    );

    // ============ WEALTH (وسام الثراء) ============
    medals.push(
      { name: "رمل الثراء",       tier: "C",   category: "wealth", value: 100 },
      { name: "نحاس الثراء",       tier: "B",   category: "wealth", value: 500 },
      { name: "فضة الثراء",        tier: "A",   category: "wealth", value: 2000 },
      { name: "ذهب الثراء",        tier: "S",   category: "wealth", value: 10000 },
      { name: "ماس الثراء",        tier: "SS",  category: "wealth", value: 50000 },
      { name: "أسطورة الثراء",     tier: "SSS", category: "wealth", value: 250000 },
    );

    // ============ CHARM (وسام الجاذبية) ============
    medals.push(
      { name: "سيدة القمر",       tier: "C",   category: "charm", value: 100 },
      { name: "وردة الصحراء",      tier: "B",   category: "charm", value: 500 },
      { name: "سيدة الشموع",       tier: "A",   category: "charm", value: 2000 },
      { name: "نجمة الجاذبية",     tier: "S",   category: "charm", value: 10000 },
      { name: "أسطورة الجاذبية",   tier: "SS",  category: "charm", value: 50000 },
      { name: "ملكة الجاذبية",     tier: "SSS", category: "charm", value: 250000 },
    );

    // ============ MONTHLY (شهري) ============
    medals.push(
      { name: "أفضل 100 شهري",    tier: "C",   category: "monthly", value: 100 },
      { name: "أفضل 50 شهري",     tier: "B",   category: "monthly", value: 250 },
      { name: "أفضل 10 شهري",     tier: "A",   category: "monthly", value: 500 },
      { name: "أفضل 3 شهري",      tier: "S",   category: "monthly", value: 1000 },
      { name: "المركز الثاني",    tier: "SS",  category: "monthly", value: 2000 },
      { name: "المركز الأول",     tier: "SSS", category: "monthly", value: 3000 },
    );

    // ============ WEEKLY (أسبوعي) ============
    medals.push(
      { name: "نجم الأسبوع TOP3",  tier: "B",   category: "weekly", value: 200 },
      { name: "نجم الأسبوع TOP2",  tier: "A",   category: "weekly", value: 500 },
      { name: "نجم الأسبوع TOP1",  tier: "S",   category: "weekly", value: 1000 },
      { name: "CP الأسبوع TOP3",   tier: "B",   category: "weekly", value: 200 },
      { name: "CP الأسبوع TOP2",   tier: "A",   category: "weekly", value: 500 },
      { name: "CP الأسبوع TOP1",   tier: "SS",  category: "weekly", value: 1500 },
    );

    // ============ SPECIAL (خاص) ============
    medals.push(
      { name: "أول مستخدم",          tier: "SSS", category: "special", value: 5000 },
      { name: "الملكة الشهرية",       tier: "SSS", category: "special", value: 5000 },
      { name: "حارس الملكة",          tier: "SS",  category: "special", value: 3000 },
      { name: "Boss",                 tier: "SS",  category: "special", value: 3000 },
      { name: "Boss Lady",            tier: "SS",  category: "special", value: 3000 },
      { name: "داعم S5",              tier: "S",   category: "special", value: 1500 },
      { name: "داعم S20",             tier: "SS",  category: "special", value: 2500 },
      { name: "داعم S50",             tier: "SSS", category: "special", value: 4000 },
    );

    let count = 0;
    for (const m of medals) {
      await ctx.db.insert("medals", {
        name: m.name,
        description: m.description,
        imageUrl: "", // ستُملأ لاحقاً
        tier: m.tier,
        category: m.category,
        value: m.value,
        active: true,
      });
      count++;
    }

    return { ok: true, count };
  },
});
