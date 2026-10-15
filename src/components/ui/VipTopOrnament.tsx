// [ezo-vip] قمة مزخرفة — تمتد كامل الشيت + قابلة للضبط من DB
import type { AssetFull } from "../../lib/assets";

interface Props {
  url: string;
  assetFull?: AssetFull | null;
  className?: string;
  style?: React.CSSProperties;
  fadeOut?: number; // 0-1 (للتمرير)
}

export default function VipTopOrnament({
  url,
  assetFull,
  className = "",
  style,
  fadeOut = 1,
}: Props) {
  // استخدام الحقول الموجودة في assets table:
  // - canvasSize  → عرض القمة بـ % (default 100 = كامل)
  // - offsetY     → إزاحة رأسية (px)
  // - holeSize    → scale × 100 (100 = 1x)
  const widthPct = assetFull?.canvasSize ?? 100;
  const yOffset = assetFull?.offsetY ?? 0;
  const scalePct = assetFull?.holeSize ?? 100;
  const scale = scalePct / 100;

  return (
    <div
      className={`absolute left-0 right-0 pointer-events-none flex justify-center ${className}`}
      style={{
        bottom: yOffset,
        opacity: fadeOut,
        ...style,
      }}
    >
      <img
        src={url}
        alt=""
        className="object-contain"
        style={{
          width: `${widthPct}%`,
          transform: `scale(${scale})`,
          transformOrigin: "center center",
        }}
        draggable={false}
      />
    </div>
  );
}
