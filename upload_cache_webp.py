import os, glob, json, subprocess, shutil

CLOUD_NAME = "wdicx984"
UPLOAD_PRESET = "ezo_unsigned"
SOURCE_FOLDER = os.path.expanduser("~/storage/downloads/new-svga")
DEST_FOLDER = os.path.expanduser("~/moorawi-app/webp_extracted")

if not os.path.exists(DEST_FOLDER):
    os.makedirs(DEST_FOLDER)

print("🔍 جاري فحص مجلد الكاش لاستخراج صور WebP الحقيقية...")
webp_files = []
for root, dirs, files in os.walk(SOURCE_FOLDER):
    for file in files:
        if file.endswith('.apk'): continue
        filepath = os.path.join(root, file)
        try:
            with open(filepath, 'rb') as f:
                header = f.read(12)
            if header.startswith(b'RIFF') and b'WEBP' in header:
                webp_files.append(filepath)
        except:
            pass

print(f"✅ تم العثور على {len(webp_files)} صورة WebP حقيقية في الكاش.")

# نقوم برفع أول 500 صورة كدفعة أولى لتوفير الوقت
batch = webp_files[:500]
items = []

print(f"⬆️ جاري رفع {len(batch)} صورة كدفعة أولى...")
for i, filepath in enumerate(batch, start=1):
    new_filename = f"cache_webp_{i}.webp"
    new_path = os.path.join(DEST_FOLDER, new_filename)
    shutil.copy2(filepath, new_path)
    
    cmd = f'curl -s -X POST https://api.cloudinary.com/v1_1/{CLOUD_NAME}/image/upload -F "upload_preset={UPLOAD_PRESET}" -F "file=@{new_path}"'
    try:
        response = subprocess.check_output(cmd, shell=True).decode('utf-8')
        data = json.loads(response)
        if "secure_url" in data:
            items.append((f"asset.cache_webp.{i}", data["secure_url"]))
            if i % 50 == 0:
                print(f"✅ تم رفع {i} صورة...")
    except Exception as e:
        pass

if items:
    print(f"\n📝 تم رفع {len(items)} صورة بنجاح. جاري الحفظ في قاعدة البيانات...")
    with open("convex/seed_cache_webp.ts", "w") as f:
        f.write('import { mutation } from "./_generated/server";\n')
        f.write('export const seedCacheWebp = mutation({\n  args: {},\n  handler: async (ctx) => {\n    let count = 0;\n    const items: [string, string][] = [\n')
        for key, url in items:
            f.write(f'      ["{key}", "{url}"],\n')
        f.write('    ];\n    for (const [key, url] of items) {\n      const existing = await ctx.db.query("assets").withIndex("by_key", q => q.eq("key", key)).first();\n      if (existing) {\n        await ctx.db.patch(existing._id, { imageUrl: url, updatedAt: Date.now() });\n      } else {\n        await ctx.db.insert("assets", { key, imageUrl: url, updatedAt: Date.now() });\n      }\n      count++;\n    }\n    return { ok: true, count };\n  }\n});\n')
    os.system("npx tsc -b && npx convex deploy --yes && npx convex run seed_cache_webp:seedCacheWebp --prod && git add -A && git commit -m 'feat(assets): extract and upload 500 real webp images from cache' && git push")
else:
    print("⚠️ لم يتم رفع صور.")
