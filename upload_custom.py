import os, glob, json, subprocess

CLOUD_NAME = "wdicx984"
UPLOAD_PRESET = "ezo_unsigned"
FOLDER = os.path.expanduser("~/storage/downloads/svga")

files = glob.glob(os.path.join(FOLDER, "*.svga"))
print(f"🔍 تم العثور على {len(files)} ملف SVGA في مجلد التنزيلات.")

items = []
for filepath in files:
    filename = os.path.basename(filepath)
    print(f"⬆️ جاري رفع: {filename} ...")
    cmd = f'curl -s -X POST https://api.cloudinary.com/v1_1/{CLOUD_NAME}/raw/upload -F "upload_preset={UPLOAD_PRESET}" -F "file=@{filepath}"'
    try:
        response = subprocess.check_output(cmd, shell=True).decode('utf-8')
        data = json.loads(response)
        if "secure_url" in data:
            url = data["secure_url"]
            key = f"asset.custom.{filename.replace('.svga', '')}"
            items.append((key, url))
            print(f"  ✅ تم الرفع: {key}")
        else:
            print(f"  ❌ فشل: {data}")
    except Exception as e:
        print(f"  ❌ خطأ: {e}")

if not items:
    print("⚠️ لم يتم رفع أي ملف.")
    exit()

# 1. توليد ملف Convex
with open("convex/seed_custom_svga.ts", "w") as f:
    f.write('import { mutation } from "./_generated/server";\n')
    f.write('export const seedCustom = mutation({\n  args: {},\n  handler: async (ctx) => {\n    let count = 0;\n    const items: [string, string][] = [\n')
    for key, url in items:
        f.write(f'      ["{key}", "{url}"],\n')
    f.write('    ];\n    for (const [key, url] of items) {\n      const existing = await ctx.db.query("assets").withIndex("by_key", q => q.eq("key", key)).first();\n      if (existing) {\n        await ctx.db.patch(existing._id, { imageUrl: url, updatedAt: Date.now() });\n      } else {\n        await ctx.db.insert("assets", { key, imageUrl: url, updatedAt: Date.now() });\n      }\n      count++;\n    }\n    return { ok: true, count };\n  }\n});\n')
print(f"📝 تم توليد ملف Convex لـ {len(items)} عنصر.")

# 2. تعديل المعرض ليشمل الفئة الجديدة
path = 'src/components/AssetsGalleryTab.tsx'
with open(path, 'r', encoding='utf-8') as f:
    code = f.read()

if 'asset.custom.' not in code:
    if 'const USEFUL_CATEGORIES' in code:
        code = code.replace('const USEFUL_CATEGORIES = ["asset.gifts.",', 'const USEFUL_CATEGORIES = ["asset.gifts.", "asset.custom.",')
    else:
        # إذا لم يكن الفلتر موجوداً، نعيد كتابة دالة الفلترة
        old = '''  const filtered = assets.filter((a: any) =>
    a.key.startsWith("asset.") && a.key.toLowerCase().includes(search.toLowerCase())
  );'''
        new = '''  const USEFUL_CATEGORIES = ["asset.gifts.", "asset.frames.", "asset.vehicles.", "asset.entries.", "asset.emojis.", "asset.banners.", "asset.custom."];
  const filtered = assets.filter((a: any) => {
    const isUseful = USEFUL_CATEGORIES.some(cat => a.key.startsWith(cat));
    return isUseful && a.key.toLowerCase().includes(search.toLowerCase());
  });'''
        code = code.replace(old, new)
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(code)
    print("🎨 تم تعديل المعرض ليظهر ملفاتك الجديدة.")

