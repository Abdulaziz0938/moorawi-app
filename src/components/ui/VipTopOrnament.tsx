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
  const yOffset = assetFull?.offsetY ?? 0;
  const xOffset = assetFull?.offsetX ?? 0;
  const scale = (assetFull?.holeSize ?? 100) / 100;

  return (
    <div
      className={`absolute left-0 right-0 flex justify-center pointer-events-none ${className}`}
      style={{
        top: "25%",
        transform: `translateY(calc(-50% + ${yOffset}px))`,
        opacity: fadeOut,
      }}
    >
      <img
        src={url}
        alt=""
        className="object-contain"
        style={{
          width: `${widthPct}%`,
          maxHeight: "140px",
          transform: `translateX(${xOffset}px) scale(${scale})`,
          transformOrigin: "center center",
        }}
        draggable={false}
      />
    </div>
  );
}
