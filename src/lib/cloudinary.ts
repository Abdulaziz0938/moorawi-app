// Cloudinary upload helper (Unsigned upload)
const CLOUD_NAME = "wdicx984";
const UPLOAD_PRESET = "moorawi_unsigned";

export interface UploadResult {
  url: string;        // الرابط مع التحسينات (f_auto,q_auto)
  originalUrl: string; // الرابط الأصلي
  publicId: string;
  resourceType: string;
  format: string;
  bytes: number;
}

/**
 * ارفع ملف إلى Cloudinary
 * @param file - الملف المراد رفعه
 * @param resourceType - "image" | "video" | "auto" (افتراضي auto)
 * @returns معلومات الملف + الروابط
 */
export async function uploadToCloudinary(
  file: File,
  resourceType: "image" | "video" | "auto" = "auto"
): Promise<UploadResult> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`,
    { method: "POST", body: formData }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || "فشل الرفع إلى Cloudinary");
  }

  const data = await res.json();
  const originalUrl: string = data.secure_url;

  // أضف تحسينات تلقائية (f_auto + q_auto)
  const optimizedUrl = originalUrl.replace(
    "/upload/",
    "/upload/f_auto,q_auto/"
  );

  return {
    url: optimizedUrl,
    originalUrl,
    publicId: data.public_id,
    resourceType: data.resource_type,
    format: data.format,
    bytes: data.bytes,
  };
}

/**
 * احصل على رابط محسّن من رابط Cloudinary عادي
 */
export function getOptimizedUrl(url: string | null | undefined): string {
  if (!url) return "";
  if (!url.includes("cloudinary.com")) return url;
  if (url.includes("/f_auto,q_auto/")) return url;
  return url.replace("/upload/", "/upload/f_auto,q_auto/");
}
