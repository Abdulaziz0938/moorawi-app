import os, zipfile, subprocess, json

CLOUD_NAME = "wdicx984"
UPLOAD_PRESET = "ezo_unsigned"
APK_PATH = os.path.expanduser("~/storage/downloads/new-svga/binmo-3-8-0.apk")
DEST = os.path.expanduser("~/moorawi-app/all_animations")
os.makedirs(DEST, exist_ok=True)

items = []
count_svga = 0
count_pag = 0

print(f"🔍 استخراج كل الحركات من الـ APK: {os.path.basename(APK_PATH)}")

with zipfile.ZipFile(APK_PATH, 'r') as z:
    for name in z.namelist():
        if name.endswith('/'): continue
        try:
            with z.open(name) as f:
                header = f.read(8)
            
            is_svga = header.startswith(b'\x78\x9c')
            is_pag = header.startswith(b'\x50\x41\x47')
            
            if is_svga or is_pag:
                data = z.read(name)
                ext = 'svga' if is_svga else 'pag'
                type_name = 'svga' if is_svga else 'pag'
                
                if is_svga: count_svga += 1
                else: count_pag += 1
                
                # اسم الملف بناءً على المسار داخل APK (بدون assets/)
                safe_name = name.replace('assets/', '').replace('/', '_').replace(' ', '_').replace('.svga', '').replace('.pag', '')
                if not safe_name: safe_name = f"{type_name}_{count_svga + count_pag}"
                
                temp_file = os.path.join(DEST, f"{safe_name}.{ext}")
                with open(temp_file, "wb") as out:
                    out.write(data)
                
                print(f"⬆️ [{type_name.upper()}] {name}")
                
                # رفع إلى Cloudinary
                cmd = f'curl -s -X POST https://api.cloudinary.com/v1_1/{CLOUD_NAME}/raw/upload -F "upload_preset={UPLOAD_PRESET}" -F "file=@{temp_file}"'
                response = subprocess.check_output(cmd, shell=True).decode('utf-8')
                res_data = json.loads(response)
                
                if "secure_url" in res_data:
                    key = f"asset.apk.{type_name}.{safe_name}"
                    items.append((key, res_data["secure_url"]))
                    print(f"  ✅ تم الرفع")
        except Exception as e:
            pass

print(f"\n📊 إجمالي: SVGA={count_svga}, PAG={count_pag}, مرفوع={len(items)}")

if items:
    print(f"\n📝 جاري حفظ {len(items)} ملف في قاعدة البيانات...")
    with open("convex/seed_all_animations.ts", "w") as f:
        f.write('import { mutation } from "./_generated/server";\n')
        f.write('export const seedAllAnimations = mutation({\n  args: {},\n  handler: async (ctx) => {\n    let count = 0;\n    const items: [string, string][] = [\n')
        for key, url in items:
            f.write(f'      ["{key}", "{url}"],\n')
        f.write('    ];\n    for (const [key, url] of items) {\n      const existing = await ctx.db.query("assets").withIndex("by_key", q => q.eq("key", key)).first();\n      if (existing) {\n        await ctx.db.patch(existing._id, { imageUrl: url, updatedAt: Date.now() });\n      } else {\n        await ctx.db.insert("assets", { key, imageUrl: url, updatedAt: Date.now() });\n      }\n      count++;\n    }\n    return { ok: true, count };\n  }\n});\n')
    os.system("npx tsc -b && npx convex deploy --yes && npx convex run seed_all_animations:seedAllAnimations --prod && git add -A && git commit -m 'feat(assets): extract all SVGA and PAG from APK with proper keys' && git push")
else:
    print("⚠️ لم يتم استخراج أي ملفات.")
