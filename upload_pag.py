import os, glob, json, subprocess, zipfile

CLOUD_NAME = "wdicx984"
UPLOAD_PRESET = "ezo_unsigned"
FOLDER = os.path.expanduser("~/storage/downloads/new-svga")
DEST = os.path.expanduser("~/moorawi-app/pag_extracted")
os.makedirs(DEST, exist_ok=True)

items = []
count = 0

# 1. سحب من الكاش
print("🔍 جاري استخراج PAG من الكاش...")
for root, dirs, files in os.walk(FOLDER):
    for file in files:
        filepath = os.path.join(root, file)
        try:
            with open(filepath, 'rb') as f:
                if f.read(3) == b'\x50\x41\x47': # PAG signature
                    count += 1
                    temp_file = os.path.join(DEST, f"pag_{count}.pag")
                    with open(temp_file, "wb") as out:
                        out.write(open(filepath, "rb").read())
                    print(f"⬆️ جاري رفع: cache_pag_{count}")
                    cmd = f'curl -s -X POST https://api.cloudinary.com/v1_1/{CLOUD_NAME}/raw/upload -F "upload_preset={UPLOAD_PRESET}" -F "file=@{temp_file}"'
                    response = subprocess.check_output(cmd, shell=True).decode('utf-8')
                    res_data = json.loads(response)
                    if "secure_url" in res_data:
                        items.append((f"asset.pag.cache_{count}", res_data["secure_url"]))
                        print(f"  ✅ تم الرفع")
        except: pass

# 2. سحب من الـ APK
apk_files = glob.glob(os.path.join(FOLDER, "*.apk")) + glob.glob(os.path.join(FOLDER, "**/*.apk"), recursive=True)
if apk_files:
    print("\n🔍 جاري استخراج PAG من الـ APK...")
    with zipfile.ZipFile(apk_files[0], 'r') as z:
        for name in z.namelist():
            if name.endswith('.bin') or name.endswith('.pag'):
                try:
                    with z.open(name) as f:
                        if f.read(3) == b'\x50\x41\x47':
                            count += 1
                            temp_file = os.path.join(DEST, f"pag_{count}.pag")
                            with open(temp_file, "wb") as out:
                                out.write(z.read(name))
                            print(f"⬆️ جاري رفع: apk_pag_{count}")
                            cmd = f'curl -s -X POST https://api.cloudinary.com/v1_1/{CLOUD_NAME}/raw/upload -F "upload_preset={UPLOAD_PRESET}" -F "file=@{temp_file}"'
                            response = subprocess.check_output(cmd, shell=True).decode('utf-8')
                            res_data = json.loads(response)
                            if "secure_url" in res_data:
                                items.append((f"asset.pag.apk_{count}", res_data["secure_url"]))
                                print(f"  ✅ تم الرفع")
                except: pass

if items:
    print(f"\n📝 تم رفع {len(items)} ملف PAG. جاري النشر...")
    with open("convex/seed_pag.ts", "w") as f:
        f.write('import { mutation } from "./_generated/server";\n')
        f.write('export const seedPag = mutation({\n  args: {},\n  handler: async (ctx) => {\n    let count = 0;\n    const items: [string, string][] = [\n')
        for key, url in items:
            f.write(f'      ["{key}", "{url}"],\n')
        f.write('    ];\n    for (const [key, url] of items) {\n      const existing = await ctx.db.query("assets").withIndex("by_key", q => q.eq("key", key)).first();\n      if (existing) {\n        await ctx.db.patch(existing._id, { imageUrl: url, updatedAt: Date.now() });\n      } else {\n        await ctx.db.insert("assets", { key, imageUrl: url, updatedAt: Date.now() });\n      }\n      count++;\n    }\n    return { ok: true, count };\n  }\n});\n')
    os.system("npx tsc -b && npx convex deploy --yes && npx convex run seed_pag:seedPag --prod && git add -A && git commit -m 'feat(assets): extract and upload 329 PAG files' && git push")
else:
    print("⚠️ لم يتم العثور على ملفات PAG.")
