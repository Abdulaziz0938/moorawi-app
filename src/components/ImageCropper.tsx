// [moorawi-cropper] Image cropper with circle/square mask
// Opens when user uploads a profile/gift image.
// Outputs a fixed-size (512x512) blob to prevent overflow.

import { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import { X, Check, Loader2, ZoomIn } from "lucide-react";

interface Props {
  file: File;
  aspect?: number;             // 1 for square/circle, 16/9 for banner
  shape?: "circle" | "rect";   // visual mask
  onCancel: () => void;
  onConfirm: (croppedFile: File) => void | Promise<void>;
}

// Helper: crop image via canvas → returns blob
async function getCroppedImg(
  imageSrc: string,
  pixelCrop: { x: number; y: number; width: number; height: number },
  outputSize = 512
): Promise<Blob> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.addEventListener("load", () => resolve(img));
    img.addEventListener("error", reject);
    img.crossOrigin = "anonymous";
    img.src = imageSrc;
  });

  const canvas = document.createElement("canvas");
  canvas.width = outputSize;
  canvas.height = outputSize;
  const ctx = canvas.getContext("2d")!;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    outputSize,
    outputSize
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("فشل قصّ الصورة"))),
      "image/jpeg",
      0.92
    );
  });
}

export default function ImageCropper({
  file,
  aspect = 1,
  shape = "circle",
  onCancel,
  onConfirm,
}: Props) {
  const [imageSrc, setImageSrc] = useState<string>("");
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [busy, setBusy] = useState(false);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  // Load file → data URL
  useState(() => {
    const reader = new FileReader();
    reader.onload = () => setImageSrc(reader.result as string);
    reader.readAsDataURL(file);
  });

  const onCropComplete = useCallback((_area: any, areaPixels: any) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  const handleConfirm = async () => {
    if (!croppedAreaPixels) return;
    setBusy(true);
    try {
      const blob = await getCroppedImg(imageSrc, croppedAreaPixels, 512);
      const croppedFile = new File([blob], "cropped.jpg", { type: "image/jpeg" });
      await onConfirm(croppedFile);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-md flex flex-col"
      dir="rtl"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 flex-shrink-0">
        <button
          onClick={onCancel}
          className="p-2 rounded-full hover:bg-white/10 text-white"
        >
          <X size={20} />
        </button>
        <h2 className="text-white text-base font-black">تعديل الصورة</h2>
        <button
          onClick={handleConfirm}
          disabled={busy}
          className="p-2 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white disabled:opacity-50"
        >
          {busy ? <Loader2 size={20} className="animate-spin" /> : <Check size={20} />}
        </button>
      </div>

      {/* Crop area */}
      <div className="relative flex-1 overflow-hidden">
        {imageSrc && (
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            cropShape={shape === "circle" ? "round" : "rect"}
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            objectFit="contain"
          />
        )}
      </div>

      {/* Zoom slider */}
      <div className="px-6 py-4 flex items-center gap-3 border-t border-white/10 flex-shrink-0">
        <ZoomIn size={16} className="text-white/60" />
        <input
          type="range"
          min={1}
          max={3}
          step={0.05}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="flex-1 accent-emerald-400"
        />
        <span className="text-white/60 text-xs tabular-nums" dir="ltr">
          {zoom.toFixed(2)}x
        </span>
      </div>

      {/* Hint */}
      <p className="text-center text-white/50 text-xs pb-4 px-4">
        {shape === "circle"
          ? "اسحب الصورة وضبط التكبير — سيتم قصّها بشكل دائري"
          : "اسحب الصورة وضبط التكبير — سيتم قصّها بشكل مربّع"}
      </p>
    </div>
  );
}
