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
  /** % of parent height where ornament BOTTOM sits.
   *  100 → bottom of parent (use when parent ends at divider).
   *  0   → top of parent (use when parent starts at divider). */
  anchorPercent?: number;
}

export default function VipTopOrnament({
  url,
  assetFull,
  className = "",
  fadeOut = 1,
  anchorPercent = 100,
}: Props) {
  if (!url) return null;

  // إعادة استخدام الحقول الموجودة + افتراضيات ذكية
  const widthPct = assetFull?.canvasSize ?? 90;
  const scale = (assetFull?.holeSize ?? 100) / 100;

  return (
    <div
      className={`absolute left-0 right-0 flex justify-center pointer-events-none ${className}`}
      style={{
        top: `${anchorPercent}%`,
        transform: "translateY(-100%)",
        opacity: fadeOut,
      }}
    >
      <img
        src={url}
        alt=""
        className="object-contain"
        style={{
          width: `${widthPct}%`,
          transform: `scale(${scale})`,
          transformOrigin: "center bottom",
        }}
        draggable={false}
      />
    </div>
  );
}
