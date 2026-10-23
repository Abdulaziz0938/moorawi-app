import os, glob, json, subprocess, zipfile, urllib.request

CLOUD_NAME = "wdicx984"
UPLOAD_PRESET = "ezo_unsigned"
FOLDER = os.path.expanduser("~/storage/downloads/new-svga")
DEST = os.path.expanduser("~/moorawi-app/apk_extracted")
os.makedirs(DEST, exist_ok=True)

apk_files = glob.glob(os.path.join(FOLDER, "*.apk")) + glob.glob(os.path.join(FOLDER, "**/*.apk"), recursive=True)
if not apk_files:
    print("❌ لم أجد ملف APK.")
    exit()

apk_path = apk_files[0]
print(f"✅ الملف: {os.path.basename(apk_path)}")

items = []
count = 0

with zipfile.ZipFile(apk_path, 'r') as z:
    for filename in z.namelist():
        if filename.endswith('/'): continue
        try:
            with z.open(filename) as f:
                header = f.read(4)
            
            if header.startswith(b'\x78\x9c') or header.startswith(b'\x50\x4b'):
                info = z.getinfo(filename)
                if info.file_size < 1000: continue
                
                count += 1
                # حفظ الملف في مجلد المشروع بدلاً من /tmp
                temp_file = os.path.join(DEST, f"apk_{count}.svga")
                with open(temp_file, "wb") as out:
                    out.write(z.read(filename))
                
                print(f"⬆️ جاري رفع: {filename}")
                
                # رفع الملف إلى Cloudinary
                cmd = f'curl -s -X POST https://api.cloudinary.com/v1_1/{CLOUD_NAME}/raw/upload -F "upload_preset={UPLOAD_PRESET}" -F "file=@{temp_file}"'
                try:
                    response = subprocess.check_output(cmd, shell=True).decode('utf-8')
                    res_data = json.loads(response)
                    if "secure_url" in res_data:
                        url = res_data["secure_url"]
                        key = f"asset.apk.{count}"
                        items.append((key, url))
                        print(f"  ✅ تم الرفع: {key}")
                    else:
                        print(f"  ❌ فشل الرفع من Cloudinary: {res_data.get('error', {}).get('message', 'سبب غير معروف')}")
                except Exception as e:
                    print(f"  ❌ خطأ في الـ curl: {e}")
                    
        except Exception as e:
            pass

if items:
    print(f"\n📝 تم رفع {len(items)} ملف بنجاح. جاري النشر...")
    with open("convex/seed_apk_svga.ts", "w") as f:
        f.write('import { mutation } from "./_generated/server";\n')
        f.write('export const seedApk = mutation({\n  args: {},\n  handler: async (ctx) => {\n    let count = 0;\n    const items: [string, string][] = [\n')
        for key, url in items:
            f.write(f'      ["{key}", "{url}"],\n')
        f.write('    ];\n    for (const [key, url] of items) {\n      const existing = await ctx.db.query("assets").withIndex("by_key", q => q.eq("key", key)).first();\n      if (existing) {\n        await ctx.db.patch(existing._id, { imageUrl: url, updatedAt: Date.now() });\n      } else {\n        await ctx.db.insert("assets", { key, imageUrl: url, updatedAt: Date.now() });\n      }\n      count++;\n    }\n    return { ok: true, count };\n  }\n});\n')
    os.system("npx tsc -b && npx convex deploy --yes && npx convex run seed_apk_svga:seedApk --prod && git add -A && git commit -m 'feat(assets): extract SVGA from APK' && git push")
else:
    print("⚠️ لم يتم رفع أي ملف. راجع الأخطاء أعلاه.")
