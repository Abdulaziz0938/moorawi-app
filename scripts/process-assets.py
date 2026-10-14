#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
[ezo-assets] معالج تلقائي للأصول
- يزيل الخلفية السوداء (يُبقي alpha)
- يحوّل لـ WebP
- يحفظ نسخة PNG محسّنة
"""
import os
import sys
from PIL import Image
import numpy as np

WATCH_FOLDERS = ["public/rockets", "public/rewards", "public/ui", "public/badges", "public/vip"]


def process_image(path: str) -> bool:
    if not path.lower().endswith((".png", ".jpg", ".jpeg")):
        return False
    if path.endswith(".webp"):
        return False
    try:
        img = Image.open(path).convert("RGBA")
        arr = np.array(img)
        r, g, b, a = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2], arr[:, :, 3]
        brightness = np.maximum(np.maximum(r, g), b).astype(np.float32)
        new_alpha = np.clip((brightness - 20) / 60 * 255, 0, 255).astype(np.uint8)
        final_alpha = np.minimum(a, new_alpha)
        arr[:, :, 3] = final_alpha
        result = Image.fromarray(arr, mode="RGBA")
        if path.lower().endswith(".png"):
            result.save(path, "PNG", optimize=True)
        webp_path = os.path.splitext(path)[0] + ".webp"
        result.save(webp_path, "WEBP", quality=85, method=6)
        png_size = os.path.getsize(path) // 1024 if path.lower().endswith(".png") else 0
        webp_size = os.path.getsize(webp_path) // 1024
        print(f"  OK {os.path.basename(path):30s}  PNG:{png_size:4d}KB  WebP:{webp_size:4d}KB")
        return True
    except Exception as e:
        print(f"  ERR {os.path.basename(path)}: {e}")
        return False


def process_all():
    total = 0
    for folder in WATCH_FOLDERS:
        if not os.path.isdir(folder):
            continue
        print(f"\n{folder}")
        for fname in sorted(os.listdir(folder)):
            path = os.path.join(folder, fname)
            if not os.path.isfile(path):
                continue
            if fname.endswith(".webp"):
                continue
            if process_image(path):
                total += 1
    print()
    print(f"DONE: {total} files processed")


if __name__ == "__main__":
    if len(sys.argv) > 1:
        for arg in sys.argv[1:]:
            if os.path.isfile(arg):
                process_image(arg)
    else:
        process_all()
