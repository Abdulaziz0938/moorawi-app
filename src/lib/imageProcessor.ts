// [ezo-assets] معالج تلقائي — يستخدم @imgly (AI) أولاً، ثم brightness كـ fallback
import { removeBackground } from "@imgly/background-removal";

const MAX_DIM = 2048;
const BLACK_THRESHOLD = 20;
const BRIGHT_THRESHOLD = 80;
const WEBP_QUALITY = 0.85;

export interface ProcessedImage {
  file: File;
  width: number;
  height: number;
  originalSize: number;
  newSize: number;
  format: string;
  method: "imgly" | "brightness" | "none";
}

/**
 * يعالج صورة:
 * 1. يزيل الخلفية بـ @imgly (AI) — يعمل مع أي خلفية (أسود، أبيض، checkerboard)
 * 2. Fallback: brightness threshold (لو فشل AI)
 * 3. يحوّل لـ WebP
 * 4. يصغّر إلى 2048px
 */
export async function processImage(
  file: File,
  options: {
    skipBgRemoval?: boolean;
    maxDim?: number;
    preferImgly?: boolean;
  } = {}
): Promise<ProcessedImage> {
  const {
    skipBgRemoval = false,
    maxDim = MAX_DIM,
    preferImgly = true,
  } = options;

  let workingBlob: Blob = file;
  let method: "imgly" | "brightness" | "none" = "none";

  // ═══════════════════════════════════════════════
  // 1) محاولة @imgly (AI-based) — الأقوى
  // ═══════════════════════════════════════════════
  if (!skipBgRemoval && preferImgly) {
    try {
      console.log(
        `[imgly] removing bg for ${file.name} (${(file.size / 1024).toFixed(0)}KB)...`
      );
      const t0 = Date.now();
      const cleaned = await removeBackground(file, {
        progress: (key: string, current: number, total: number) => {
          if (current === total) {
            console.log(`[imgly] ${key} done`);
          }
        },
      });
      const dt = Date.now() - t0;
      console.log(
        `[imgly] ✓ done in ${dt}ms → ${(cleaned.size / 1024).toFixed(0)}KB`
      );
      workingBlob = cleaned;
      method = "imgly";
    } catch (e) {
      console.warn("[imgly] failed, will fallback to brightness:", e);
    }
  }

  // ═══════════════════════════════════════════════
  // 2) Load + resize
  // ═══════════════════════════════════════════════
  const bitmap = await createImageBitmap(workingBlob);
  const { width, height } = bitmap;
  const scale = Math.min(1, maxDim / Math.max(width, height));
  const nw = Math.round(width * scale);
  const nh = Math.round(height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = nw;
  canvas.height = nh;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas context failed");

  ctx.drawImage(bitmap, 0, 0, nw, nh);
  bitmap.close?.();

  // ═══════════════════════════════════════════════
  // 3) Fallback: brightness-based removal (لو فشل imgly)
  // ═══════════════════════════════════════════════
  if (!skipBgRemoval && method === "none") {
    console.log("[fallback] applying brightness-based removal...");
    const imgData = ctx.getImageData(0, 0, nw, nh);
    const data = imgData.data;
    const range = BRIGHT_THRESHOLD - BLACK_THRESHOLD;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];

      const brightness = Math.max(r, g, b);
      const maxDiff = Math.max(
        Math.abs(r - g),
        Math.abs(g - b),
        Math.abs(b - r)
      );
      const isGray = maxDiff < 15;

      let newAlpha = 255;

      if (isGray) {
        if (brightness >= 60 && brightness <= 210) newAlpha = 0;
        else if (brightness < 40) newAlpha = 0;
        else if (brightness < 60) newAlpha = ((brightness - 40) / 20) * 255;
        else newAlpha = 255;
      } else {
        newAlpha = ((brightness - BLACK_THRESHOLD) / range) * 255;
        newAlpha = Math.max(0, Math.min(255, newAlpha));
      }

      data[i + 3] = Math.min(a, newAlpha);
    }
    ctx.putImageData(imgData, 0, 0);
    method = "brightness";
  }

  // ═══════════════════════════════════════════════
  // 4) Convert to WebP
  // ═══════════════════════════════════════════════
  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
      "image/webp",
      WEBP_QUALITY
    );
  });

  const outName = file.name.replace(/\.[^.]+$/, "") + ".webp";
  const outFile = new File([blob], outName, { type: "image/webp" });

  return {
    file: outFile,
    width: nw,
    height: nh,
    originalSize: file.size,
    newSize: blob.size,
    format: "webp",
    method,
  };
}
