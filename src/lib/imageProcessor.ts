// [ezo-assets] معالج تلقائي للصور قبل الرفع
// - إزالة الخلفية السوداء (threshold + alpha)
// - تحويل لـ WebP
// - تصغير الأبعاد إذا كبيرة

const MAX_DIM = 2048;
const BLACK_THRESHOLD = 20;   // أقل = شفاف
const BRIGHT_THRESHOLD = 80;  // أعلى = معتم
const WEBP_QUALITY = 0.85;

export interface ProcessedImage {
  file: File;
  width: number;
  height: number;
  originalSize: number;
  newSize: number;
  format: string;
}

/**
 * يعالج صورة: يزيل الخلفية السوداء + يحوّل لـ WebP
 * @param file ملف الصورة الأصلي
 * @param options خيارات (skipBgRemoval للصور الفوتوغرافية)
 */
export async function processImage(
  file: File,
  options: { skipBgRemoval?: boolean; maxDim?: number } = {}
): Promise<ProcessedImage> {
  const { skipBgRemoval = false, maxDim = MAX_DIM } = options;

  // حمّل الصورة
  const bitmap = await createImageBitmap(file);
  let { width, height } = bitmap;

  // احسب الأبعاد الجديدة (تصغير إذا أكبر من الحد)
  const scale = Math.min(1, maxDim / Math.max(width, height));
  const nw = Math.round(width * scale);
  const nh = Math.round(height * scale);

  // ارسم على canvas
  const canvas = document.createElement("canvas");
  canvas.width = nw;
  canvas.height = nh;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas context failed");

  ctx.drawImage(bitmap, 0, 0, nw, nh);
  bitmap.close?.();

  // إزالة الخلفية السوداء
  if (!skipBgRemoval) {
    const imgData = ctx.getImageData(0, 0, nw, nh);
    const data = imgData.data;
    const range = BRIGHT_THRESHOLD - BLACK_THRESHOLD;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];

      // اللمعان = max(r, g, b)
      const brightness = Math.max(r, g, b);

      // هل البكسل رمادي؟ (R≈G≈B) — مؤشر على checkerboard
      const dr = Math.abs(r - g);
      const dg = Math.abs(g - b);
      const db = Math.abs(b - r);
      const maxDiff = Math.max(dr, dg, db);
      const isGray = maxDiff < 12; // رمادي نقي

      // للرمادي: إذا اللمعان بين 60-220 → شفاف (checkerboard)
      // إذا لمعان < 60 → أسود → شفاف
      // إذا لمعان > 220 → أبيض → اتركه
      let newAlpha = 255;

      if (isGray && brightness < 220) {
        // Gray board (60-200) أو dark (0-60) → شفاف
        newAlpha = 0;
      } else {
        // color pixel → طبق threshold أسود
        newAlpha = ((brightness - BLACK_THRESHOLD) / range) * 255;
        newAlpha = Math.max(0, Math.min(255, newAlpha));
      }

      // final = min(original, newAlpha)
      data[i + 3] = Math.min(a, newAlpha);
    }
    ctx.putImageData(imgData, 0, 0);
  }

  // حوّل لـ WebP
  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
      "image/webp",
      WEBP_QUALITY
    );
  });

  // أنشئ File
  const outName = file.name.replace(/\.[^.]+$/, "") + ".webp";
  const outFile = new File([blob], outName, { type: "image/webp" });

  return {
    file: outFile,
    width: nw,
    height: nh,
    originalSize: file.size,
    newSize: blob.size,
    format: "webp",
  };
}
