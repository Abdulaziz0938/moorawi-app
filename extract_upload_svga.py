import os, shutil, json, subprocess

CLOUD_NAME = "wdicx984"
UPLOAD_PRESET = "ezo_unsigned"
SOURCE_FOLDER = os.path.expanduser("~/storage/downloads/new-svga")
DEST_FOLDER = os.path.expanduser("~/storage/downloads/new-svga-extracted")

if not os.path.exists(DEST_FOLDER):
    os.makedirs(DEST_FOLDER)

print("🔍 جاري فحص واستخراج ملفات SVGA...")
svga_files = []
for root, dirs, files in os.walk(SOURCE_FOLDER):
    for file in files:
        filepath = os.path.join(root, file)
        try:
            with open(filepath, 'rb') as f:
                header = f.read(8)
            # فحص بصمة SVGA (مضغوط zlib أو zip)
            if header.startswith(b'\x78\x9c') or header.startswith(b'\x50\x4b'):
                svga_files.append(filepath)
        except:
            pass

print(f"✅ تم العثور على {len(svga_files)} ملف SVGA حقيقي.")

items = []
for idx, filepath in enumerate(svga_files, start=1):
    new_filename = f"svga_{idx}.svga"
    new_path = os.path.join(DEST_FOLDER, new_filename)
    
    # نسخ الملف وتغيير امتداده
    shutil.copy2(filepath, new_path)
    
    print(f"⬆️ جاري رفع: {new_filename} ...")
    cmd = f'curl -s -X POST https://api.cloudinary.com/v1_1/{CLOUD_NAME}/raw/upload -F "upload_preset={UPLOAD_PRESET}" -F "file=@{new_path}"'
    
    try:
        response = subprocess.check_output(cmd, shell=True).decode('utf-8')
        data = json.loads(response)
        if "secure_url" in data:
            url = data["secure_url"]
            key = f"asset.custom.extracted_{idx}"
            items.append((key, url))
            print(f"  ✅ تم الرفع بنجاح")
        else:
            print(f"  ❌ فشل الرفع")
    except Exception as e:
        print(f"  ❌ خطأ: {e}")

if not items:
    print("⚠️ لم يتم رفع أي ملف.")
    exit()

# توليد ملف Convex
print(f"📝 جاري توليد ملف قاعدة البيانات...")
with open("convex/seed_extracted_svga.ts", "w") as f:
    f.write('import { mutation } from "./_generated/server";\n')
    f.write('export const seedExtracted = mutation({\n  args: {},\n  handler: async (ctx) => {\n    let count = 0;\n    const items: [string, string][] = [\n')
    for key, url in items:
        f.write(f'      ["{key}", "{url}"],\n')
    f.write('    ];\n    for (const [key, url] of items) {\n      const existing = await ctx.db.query("assets").withIndex("by_key", q => q.eq("key", key)).first();\n      if (existing) {\n        await ctx.db.patch(existing._id, { imageUrl: url, updatedAt: Date.now() });\n      } else {\n        await ctx.db.insert("assets", { key, imageUrl: url, updatedAt: Date.now() });\n      }\n      count++;\n    }\n    return { ok: true, count };\n  }\n});\n')
print("✅ تم التجهيز!")
