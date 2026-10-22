// [ezo-vip] قمة مزخرفة — موضع تلقائي من الكود
// - دائماً على الخط الفاصل (25% من أعلى الشيت)
// - عرض 90%، ارتفاع أقصى 140px
// - قابلة للتعديل من Tuner (يستخدم canvasSize/offsetY/offsetX/holeSize الموجودة)
import type { AssetFull } from "../../lib/assets";

interface Props {
  url: string;
  assetFull?: AssetFull | null;
  className?: string;
  fadeOut?: number;
}

export default function VipTopOrnament({
  url,
  assetFull,
  className = "",
  fadeOut = 1,
}: Props) {
  if (!url) return null;

  // إعادة استخدام الحقول الموجودة + افتراضيات ذكية
  const widthPct = assetFull?.canvasSize ?? 90;
  // [ezo-fix] offsetX/offsetY من DB كانت قيماً خاطئة من Tuner سابق (47/172)
  // نستخدم 0 حتى نضبط الموقع الصحيح، ثم نعيدها إن احتجنا
  const yOffset = 0;
  const xOffset = 0;
  const scale = (assetFull?.holeSize ?? 100) / 100;

  return (
    <div
      className={`absolute left-0 right-0 flex justify-center pointer-events-none ${className}`}
      style={{
        top: "25%",
        transform: `translateY(calc(-100% + ${yOffset}px))`,
        opacity: fadeOut,
      }}
    >
      <img
        src={url}
        alt=""
        className="object-contain"
        style={{
          width: `${widthPct}%`,
          transform: `translateX(${xOffset}px) scale(${scale})`,
          transformOrigin: "center center",
        }}
        draggable={false}
      />
    </div>
  );
}
