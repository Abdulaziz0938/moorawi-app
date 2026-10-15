// [ezo-vip] قمة مزخرفة — كل القيم من DB، بدون تخمين
import type { AssetFull } from "../../lib/assets";

interface Props {
  url: string;
  assetFull?: AssetFull | null;
  /** موضع القمة على المحور Y بالنسبة لـ parent.top (px). سالب = فوق الحد */
  defaultTop?: number;
  className?: string;
  fadeOut?: number;
}

export default function VipTopOrnament({
  url,
  assetFull,
  defaultTop = -45,
  className = "",
  fadeOut = 1,
}: Props) {
  // القيم من DB (assets table) — أو default
  // - canvasSize  → عرض القمة % (100 = كامل العرض)
  // - offsetY     → موضع على Y (px) — سالب = فوق الحد، موجب = أسفل
  // - holeSize    → scale × 100 (100 = 1x)
  const widthPct = assetFull?.canvasSize ?? 100;
  const yPos = assetFull?.offsetY ?? defaultTop;
  const scalePct = assetFull?.holeSize ?? 100;
  const scale = scalePct / 100;

  return (
    <div
      className={`absolute left-0 right-0 pointer-events-none flex justify-center ${className}`}
      style={{
        top: yPos,
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
          transformOrigin: "center top",
        }}
        draggable={false}
      />
    </div>
  );
}
