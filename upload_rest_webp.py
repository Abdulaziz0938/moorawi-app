import os, glob, json, subprocess, shutil

CLOUD_NAME = "wdicx984"
UPLOAD_PRESET = "ezo_unsigned"
SOURCE_FOLDER = os.path.expanduser("~/storage/downloads/new-svga")
DEST_FOLDER = os.path.expanduser("~/moorawi-app/webp_extracted")

if not os.path.exists(DEST_FOLDER):
    os.makedirs(DEST_FOLDER)

print("🔍 جاري جمع كل صور WebP الحقيقية من الكاش...")
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

print(f"✅ إجمالي الصور المتوفرة: {len(webp_files)}")

# تخطي أول 500 صورة تم رفعها سابقاً
remaining = webp_files[500:]
print(f"⬆️ سيتم رفع {len(remaining)} صورة متبقية...")

# نقوم بتقسيمهم إلى أجزاء لتفادي انقطاع الشبكة
chunk_size = 500
for chunk_idx in range(0, len(remaining), chunk_size):
    chunk = remaining[chunk_idx:chunk_idx+chunk_size]
    items = []
    print(f"\n🔄 الدفعة {chunk_idx//chunk_size + 1}: جاري رفع {len(chunk)} صورة...")
    
    for i, filepath in enumerate(chunk, start=1):
        new_filename = f"cache_webp_{chunk_idx + i + 500}.webp" # الترقيم يكمل من 501
        new_path = os.path.join(DEST_FOLDER, new_filename)
        shutil.copy2(filepath, new_path)
        
        cmd = f'curl -s -X POST https://api.cloudinary.com/v1_1/{CLOUD_NAME}/image/upload -F "upload_preset={UPLOAD_PRESET}" -F "file=@{new_path}"'
        try:
            response = subprocess.check_output(cmd, shell=True).decode('utf-8')
            data = json.loads(response)
            if "secure_url" in data:
                items.append((f"asset.cache_webp.{chunk_idx + i + 500}", data["secure_url"]))
        except Exception as e:
            pass

    if items:
        print(f"📝 حفظ {len(items)} صورة في قاعدة البيانات...")
        with open("convex/seed_rest_webp.ts", "w") as f:
            f.write('import { mutation } from "./_generated/server";\n')
            f.write('export const seedRestWebp = mutation({\n  args: {},\n  handler: async (ctx) => {\n    let count = 0;\n    const items: [string, string][] = [\n')
            for key, url in items:
                f.write(f'      ["{key}", "{url}"],\n')
            f.write('    ];\n    for (const [key, url] of items) {\n      const existing = await ctx.db.query("assets").withIndex("by_key", q => q.eq("key", key)).first();\n      if (existing) {\n        await ctx.db.patch(existing._id, { imageUrl: url, updatedAt: Date.now() });\n      } else {\n        await ctx.db.insert("assets", { key, imageUrl: url, updatedAt: Date.now() });\n      }\n      count++;\n    }\n    return { ok: true, count };\n  }\n});\n')
        os.system("npx tsc -b && npx convex deploy --yes && npx convex run seed_rest_webp:seedRestWebp --prod")
        os.system("git add -A && git commit -m 'feat(assets): upload remaining webp images' && git push")
    else:
        print("⚠️ لم يتم رفع صور في هذه الدفعة.")
