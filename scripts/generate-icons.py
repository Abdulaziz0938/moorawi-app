#!/usr/bin/env python3
"""
يقص الشعار (يزيل الهوامش) ثم يكبّره ليملأ المربع كاملاً.
النتيجة: الأيقونة تملأ المساحة كـ Pinterest/Behance.
"""
import sys
from pathlib import Path
from PIL import Image

SRC = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("public/icon.png")
OUT = Path("public")

if not SRC.exists():
    print(f"❌ لا يوجد ملف: {SRC}")
    sys.exit(1)

img = Image.open(SRC).convert("RGBA")
print(f"المصدر: {img.size}")

# 1) احذف الهوامش الشفافة — احصل على bounding box للمحتوى غير الشفاف
alpha = img.split()[3]
bbox = alpha.getbbox()
if not bbox:
    print("⚠️ لا يوجد محتوى غير شفاف")
    sys.exit(1)

print(f"منطقة المحتوى: {bbox}")
cropped = img.crop(bbox)
print(f"بعد القص: {cropped.size}")

# 2) اكتشف اللون السائد (من الوسط)
cw, ch = cropped.size
cx, cy = cw // 2, ch // 2
center_px = cropped.getpixel((cx, cy))
if center_px[3] < 200:
    fill = (26, 11, 46, 255)
else:
    fill = center_px
print(f"لون الخلفية المُستَخدم: RGB{fill[:3]}")

# 3) املأ مربع كامل باللون + الصق الشعار فوقه (مع margin 4%)
size = max(cw, ch)
padding = int(size * 0.04)
inner_size = size - 2 * padding
# إعادة قياس الصورة لتلائم مع margin
scale = inner_size / max(cw, ch)
new_cw = int(cw * scale)
new_ch = int(ch * scale)
resized_cropped = cropped.resize((new_cw, new_ch), Image.LANCZOS)

square = Image.new("RGBA", (size, size), fill)
square.paste(resized_cropped, ((size - new_cw) // 2, (size - new_ch) // 2), resized_cropped)

# 4) ولّد كل الأحجام
sizes = {
    "icon-512.png": 512,
    "icon-192.png": 192,
    "apple-touch-icon.png": 180,
    "icon.png": 512,
}

for name, px in sizes.items():
    resized = square.resize((px, px), Image.LANCZOS)
    resized.save(OUT / name, "PNG", optimize=True)
    print(f"  ✓ {name} ({px}x{px})")

# 5) favicon شفاف للمتصفح
size_t = max(cw, ch)
pad_t = int(size_t * 0.08)
inner_t = size_t - 2 * pad_t
scale_t = inner_t / max(cw, ch)
cw_t = int(cw * scale_t)
ch_t = int(ch * scale_t)
resized_t = cropped.resize((cw_t, ch_t), Image.LANCZOS)
sq_t = Image.new("RGBA", (size_t, size_t), (0, 0, 0, 0))
sq_t.paste(resized_t, ((size_t - cw_t) // 2, (size_t - ch_t) // 2), resized_t)
fav = sq_t.resize((32, 32), Image.LANCZOS)
fav.save(OUT / "favicon-32.png", "PNG", optimize=True)
print(f"  ✓ favicon-32.png (32x32) — شفاف")

print("\n✅ انتهى!")
