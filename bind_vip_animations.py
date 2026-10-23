import json

# البيانات المستخرجة من الـ APK
VIP_PAG_FILES = {
    1: "bimo_vip1.pag",
    2: "bimo_vip2.pag",
    3: "bimo_vip3.pag",
    4: "bimo_vip4.pag",
    5: "bimo_vip5.pag",
    6: "bimo_vip6.pag",
    7: "bimo_vip_medal_7.pag",
}

# سنبحث في DB عن الروابط التي رفعناها
import subprocess
print("🔍 جاري جلب الروابط من قاعدة البيانات...")
cmd = "npx convex run assets:list --prod 2>/dev/null"
out = subprocess.check_output(cmd, shell=True).decode('utf-8')
assets = json.loads(out)

# بناء خريطة للروابط
key_to_url = {a['key']: a['imageUrl'] for a in assets if 'imageUrl' in a}

items = []
for level, filename in VIP_PAG_FILES.items():
    key = f"asset.apk.pag.{filename.replace('.pag', '')}"
    if key in key_to_url:
        url = key_to_url[key]
        # ربط كدخولية VIP
        items.append((f"vip.entry.{level}", url))
        # ربط كإطار VIP
        items.append((f"vip.frame.{level}", url))
        print(f"✅ VIP {level}: {filename}")

if items:
    print(f"\n📝 جاري حفظ {len(items)} رابط في قاعدة البيانات...")
    with open("convex/seed_vip_animations.ts", "w") as f:
        f.write('import { mutation } from "./_generated/server";\n')
        f.write('export const seedVipAnimations = mutation({\n  args: {},\n  handler: async (ctx) => {\n    let count = 0;\n    const items: [string, string][] = [\n')
        for key, url in items:
            f.write(f'      ["{key}", "{url}"],\n')
        f.write('    ];\n    for (const [key, url] of items) {\n      const existing = await ctx.db.query("assets").withIndex("by_key", q => q.eq("key", key)).first();\n      if (existing) {\n        await ctx.db.patch(existing._id, { imageUrl: url, updatedAt: Date.now() });\n      } else {\n        await ctx.db.insert("assets", { key, imageUrl: url, updatedAt: Date.now() });\n      }\n      count++;\n    }\n    return { ok: true, count };\n  }\n});\n')
    print("🚀 جاري النشر إلى Convex...")
    subprocess.call("npx tsc -b && npx convex deploy --yes && npx convex run seed_vip_animations:seedVipAnimations --prod && git add -A && git commit -m 'feat(vip): bind real VIP entry and frame animations from APK' && git push", shell=True)
else:
    print("⚠️ لم أجد روابط لحركات VIP.")
