import React, { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button } from "./ui/button"; // عدل المسار حسب مشروعك

// دالة مساعدة لقص الصورة
const getCroppedImg = async (imageSrc: string, pixelCrop: any): Promise<Blob> => {
  const image = new Image();
  image.src = imageSrc;
  await new Promise((resolve) => (image.onload = resolve));

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No 2d context");

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
    }, "image/webp", 0.8); // ضغط الصورة بصيغة webp
  });
};

export default function AdminSplashUploader() {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const setSplashImage = useMutation(api.splash.setSplashImageUrl);

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.addEventListener("load", () => setImageSrc(reader.result as string));
      reader.readAsDataURL(file);
    }
  };

  const onCropComplete = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleUpload = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    setIsUploading(true);

    try {
      // 1. قص الصورة
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
      
      // 2. الرفع إلى Cloudinary (تأكد من وجود دالة الرفع في مشروعك)
      // هنا سنستخدم FormData مباشرة إذا لم تكن هناك دالة جاهزة
      const formData = new FormData();
      formData.append("file", croppedBlob);
      formData.append("upload_preset", "YOUR_CLOUDINARY_UNSIGNED_PRESET"); // ضع اسم الـ Preset الخاص بك

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/YOUR_CLOUD_NAME/image/upload`,
        { method: "POST", body: formData }
      );
      const data = await response.json();

      if (data.secure_url) {
        // 3. حفظ الرابط في Convex
        await setSplashImage({ url: data.secure_url });
        alert("✅ تم تحديث صورة شاشة البداية بنجاح!");
        setImageSrc(null); // إغلاق أداة القص
      }
    } catch (error) {
      console.error(error);
      alert("❌ حدث خطأ أثناء الرفع");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="p-4 bg-zinc-900 rounded-xl border border-zinc-800">
      <h3 className="text-lg font-bold text-white mb-4">تغيير صورة شاشة البداية (Splash)</h3>
      
      {!imageSrc ? (
        <div>
          <input 
            type="file" 
            accept="image/*" 
            onChange={onFileChange} 
            className="block w-full text-sm text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-700"
          />
          <p className="text-xs text-zinc-500 mt-2">يفضل رفع صورة عمودية (9:16) بجودة متوسطة لسرعة التحميل.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="relative w-full h-[400px] bg-black rounded-lg overflow-hidden">
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={9 / 16} // أبعاد شاشة الهاتف
              onCropChange={setCrop}
              onCropComplete={onCropComplete}
              onZoomChange={setZoom}
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setImageSrc(null)} variant="outline" className="flex-1">إلغاء</Button>
            <Button onClick={handleUpload} disabled={isUploading} className="flex-1 bg-purple-600">
              {isUploading ? "جاري الرفع..." : "حفظ الصورة"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
