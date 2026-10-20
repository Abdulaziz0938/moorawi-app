/**
 * توليد روابط عرض مصغرة، خفيفة، ومضغوطة تلقائياً من Cloudinary
 */
export function getOptimizedImageUrl(url: string | undefined, width = 120, height = 120): string {
  if (!url) return "";
  
  // التحقق إن كان الرابط يتبع لـ Cloudinary
  if (url.includes("res.cloudinary.com")) {
    const uploadIndex = url.indexOf("/upload/");
    if (uploadIndex !== -1) {
      // إضافة معاملات التحويل: تصغير الحجم، تعبئة تلقائية، اختيار أفضل صيغة WebP/AVIF، وجودة تلقائية
      const transformation = `w_${width},h_${height},c_fill,f_auto,q_auto`;
      return url.replace("/upload/", `/upload/${transformation}/`);
    }
  }
  
  return url;
}
