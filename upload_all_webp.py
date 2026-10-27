import os, glob, json, subprocess

CLOUD_NAME = "wdicx984"
UPLOAD_PRESET = "ezo_unsigned"
FOLDER = os.path.expanduser("~/storage/downloads/az/extracted_media/webp_images")

if not os.path.exists(FOLDER):
    FOLDER = os.path.expanduser("~/storage/downloads/extracted_media/webp_images")

files = glob.glob(os.path.join(FOLDER, "*.webp"))
print(f"🔍 إجمالي الصور الموجودة: {len(files)}")

# تجاهل أول 100 صورة تم رفعها سابقاً
files = files[100:]
print(f"⬆️ سيتم رفع {len(files)} صورة متبقية...")

items = []
for i, filepath in enumerate(files, start=101):
    cmd = f'curl -s -X POST https://api.cloudinary.com/v1_1/{CLOUD_NAME}/image/upload -F "upload_preset={UPLOAD_PRESET}" -F "file=@{filepath}"'
    try:
        response = subprocess.check_output(cmd, shell=True).decode('utf-8')
        data = json.loads(response)
        if "secure_url" in data:
            items.append((f"asset.webp.{i}", data["secure_url"]))
            if i % 50 == 0:
                print(f"✅ تم رفع {i - 100} صورة...")
    except Exception as e:
        pass

if items:
    print(f"\n📝 تم رفع {len(items)} صورة جديدة. جاري الحفظ في قاعدة البيانات...")
    with open("convex/seed_webp_all.ts", "w") as f:
        f.write('import { mutation } from "./_generated/server";\n')
        f.write('export const seedWebpAll = mutation({\n  args: {},\n  handler: async (ctx) => {\n    let count = 0;\n    const items: [string, string][] = [\n')
        for key, url in items:
            f.write(f'      ["{key}", "{url}"],\n')
        f.write('    ];\n    for (const [key, url] of items) {\n      const existing = await ctx.db.query("assets").withIndex("by_key", q => q.eq("key", key)).first();\n      if (existing) {\n        await ctx.db.patch(existing._id, { imageUrl: url, updatedAt: Date.now() });\n      } else {\n        await ctx.db.insert("assets", { key, imageUrl: url, updatedAt: Date.now() });\n      }\n      count++;\n    }\n    return { ok: true, count };\n  }\n});\n')
    os.system("npx tsc -b && npx convex deploy --yes && npx convex run seed_webp_all:seedWebpAll --prod && git add -A && git commit -m 'feat(assets): upload remaining 3100 webp images' && git push")
else:
    print("⚠️ لم يتم رفع صور جديدة.")
