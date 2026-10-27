import React, { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { uploadToCloudinary } from "../lib/cloudinary"; // استخدام دالتك الموجودة
import { dialog } from "../lib/dialog";
import { Loader2, Upload } from "lucide-react";

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
    }, "image/webp", 0.8); // ضغط بصيغة webp
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
    setCrop({ x: 0, y: 0 }); // إعادة تعيين بسيطة
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleUpload = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    setIsUploading(true);

    try {
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
      
      // تحويل الـ Blob إلى File ليتوافق مع دالتك
      const file = new File([croppedBlob], "splash.webp", { type: "image/webp" });
      
      // استخدام دالة الرفع الخاصة بك
      const url = await uploadToCloudinary(file);
      
      if (url) {
        await setSplashImage({ url });
        dialog.alert("✅ تم تحديث صورة شاشة البداية بنجاح!");
        setImageSrc(null);
      }
    } catch (error: any) {
      console.error(error);
      dialog.alert("❌ حدث خطأ أثناء الرفع: " + (error.message || ""));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      {!imageSrc ? (
        <div className="border-2 border-dashed border-white/20 rounded-2xl p-8 flex flex-col items-center justify-center bg-white/5">
          <Upload size={32} className="text-white/40 mb-3" />
          <p className="text-white text-sm font-bold mb-1">اختر صورة لشاشة البداية</p>
          <p className="text-white/50 text-xs mb-4 text-center">يفضل أن تكون الصورة عمودية (9:16)</p>
          <input 
            type="file" 
            accept="image/*" 
            onChange={onFileChange} 
            className="block w-full text-sm text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-700"
          />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="relative w-full h-[450px] bg-black rounded-2xl overflow-hidden">
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
            <button 
              onClick={() => setImageSrc(null)} 
              className="flex-1 py-3 rounded-xl bg-white/10 text-white font-bold text-sm"
            >
              إلغاء
            </button>
            <button 
              onClick={handleUpload} 
              disabled={isUploading} 
              className="flex-1 py-3 rounded-xl bg-purple-600 text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              {isUploading ? "جاري الرفع..." : "حفظ الصورة"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
