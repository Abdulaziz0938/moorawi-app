// [ezo-upload] معالج موحد — يكتشف النوع + يحسّن + يرفع
import { processImage } from "./imageProcessor";
import { uploadToCloudinary } from "./cloudinary";
import { askBgRemoval, getRememberedChoice } from "./bgRemovalPrompt";

export interface SmartUploadOptions {
  /** الفئة (vehicle, frame, ...) — تُستخدم لضبط القواعد */
  category?: string;
  /** السماح بالفيديو (افتراضي: نعم) */
  allowVideo?: boolean;
  /** تخطّي إزالة الخلفية (للصور الفوتوغرافية) */
  skipBgRemoval?: boolean;
  /** الحد الأقصى للفيديو بالبايت (افتراضي 100MB) */
  maxVideoBytes?: number;
}

export interface SmartUploadResult {
  url: string;          // رابط Cloudinary مع التحسينات
  originalUrl: string;  // الرابط الأصلي
  mediaType: "image" | "video";
  format: string;
  size: number;         // بعد المعالجة
  originalSize: number; // قبل المعالجة
  width?: number;
  height?: number;
}

export async function smartUpload(
  file: File,
  options: SmartUploadOptions = {}
): Promise<SmartUploadResult> {
  const {
    allowVideo = true,
    skipBgRemoval: skipBgRemovalExplicit,
    maxVideoBytes = 100 * 1024 * 1024,
  } = options;

  const isVideo = file.type.startsWith("video/");
  const isImage = file.type.startsWith("image/");

  if (!isVideo && !isImage) {
    throw new Error(
      "نوع الملف غير مدعوم. المسموح: صور (png/jpg/webp/gif) أو فيديو (mp4/webm/mov)"
    );
  }

  // ═══ فيديو ═══
  if (isVideo) {
    if (!allowVideo) {
      throw new Error(
        "رفع الفيديو غير مسموح في هذه الفئة. اختر صورة أو غيّر الفئة."
      );
    }
    if (file.size > maxVideoBytes) {
      const mb = (file.size / 1024 / 1024).toFixed(1);
      throw new Error(`الفيديو كبير جداً (${mb}MB). الحد: 100MB`);
    }

    const res = await uploadToCloudinary(file, "video");
    return {
      url: res.url,
      originalUrl: res.originalUrl,
      mediaType: "video",
      format: res.format || "mp4",
      size: res.bytes,
      originalSize: file.size,
    };
  }

  // ═══ صورة ═══
  // قرار الإزالة: صريح من الـ caller → استخدمه. وإلا: تذكر/اسأل
  let skipBgRemoval: boolean;
  if (skipBgRemovalExplicit !== undefined) {
    skipBgRemoval = skipBgRemovalExplicit;
  } else {
    const remembered = getRememberedChoice();
    if (remembered !== null) {
      skipBgRemoval = !remembered;
    } else {
      const wantsRemove = await askBgRemoval(file);
      skipBgRemoval = !wantsRemove;
    }
  }
  // معالجة: إزالة الخلفية (اختياري) + تحويل WebP + تصغير
  const processed = await processImage(file, { skipBgRemoval });

  console.log(
    `[upload] ${file.name}: ${(processed.originalSize / 1024).toFixed(0)}KB → ${(processed.newSize / 1024).toFixed(0)}KB · ${processed.width}×${processed.height}`
  );

  const res = await uploadToCloudinary(processed.file, "image");
  return {
    url: res.url,
    originalUrl: res.originalUrl,
    mediaType: "image",
    format: "webp",
    size: res.bytes,
    originalSize: processed.originalSize,
    width: processed.width,
    height: processed.height,
  };
}
