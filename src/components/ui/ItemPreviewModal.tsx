// [ezo-preview] ItemPreviewModal — معاينة قبل الشراء/الارتداء
import { X, ShoppingBag, Coins, Check, Loader2 } from "lucide-react";
import Card from "./Card";
import VipAvatar from "./VipAvatar";
import SvgaPlayer from "./SvgaPlayer";
import { isSvgaUrl } from "../../lib/removeBg";

interface Props {
  item: any;
  userAvatarUrl?: string | null;
  userName?: string;
  vipLevel?: number;
  balance?: number;
  equipped?: boolean;
  onClose: () => void;
  onConfirm?: () => Promise<void> | void;
  confirmLabel?: string;
  busy?: boolean;
  showPrice?: boolean;
}

export default function ItemPreviewModal({
  item,
  userAvatarUrl,
  userName = "أنت",
  vipLevel = 0,
  balance = 0,
  equipped = false,
  onClose,
  onConfirm,
  confirmLabel = "شراء",
  busy = false,
  showPrice = true,
}: Props) {
  const price = item?.price ?? 0;
  const canAfford = balance >= price;
  const isSvga = isSvgaUrl(item?.imageUrl) || item?.assetType === "svga";
  const isFrameLike =
    item?.category === "frame" ||
    item?.category === "halo" ||
    item?.category === "profileCard" ||
    item?.category === "vehicle";

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/85 backdrop-blur-sm flex items-end justify-center"
      dir="rtl"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-gradient-to-b from-slate-900 to-black rounded-t-3xl p-5 max-h-[92dvh] overflow-y-auto border-t border-white/15"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white text-lg font-black">معاينة العنصر</h2>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white active:scale-95"
          >
            <X size={18} />
          </button>
        </div>

        {/* Item Preview */}
        <Card tone="default" padding="lg" className="mb-4">
          <div className="aspect-square w-full flex items-center justify-center bg-black/30 rounded-2xl overflow-hidden relative">
            {item?.imageUrl ? (
              isSvga ? (
                <SvgaPlayer
                  src={item.imageUrl}
                  className="w-full h-full"
                  loops={0}
                  autoPlay={true}
                />
              ) : (
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="w-full h-full object-contain p-4"
                  draggable={false}
                />
              )
            ) : (
              <ShoppingBag size={48} className="text-white/30" />
            )}
            {equipped && (
              <span className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500 text-white text-[10px] font-black">
                <Check size={11} strokeWidth={3} /> مُفعّل
              </span>
            )}
          </div>
          <p className="text-white text-base font-black text-center mt-3">
            {item?.name}
          </p>
          {showPrice && price > 0 && (
            <div className="flex items-center justify-center gap-1.5 mt-2">
              <Coins size={14} className="text-amber-300" />
              <span
                className="text-amber-200 text-sm font-black tabular-nums"
                dir="ltr"
              >
                {price.toLocaleString()}
              </span>
            </div>
          )}
        </Card>

        {/* Preview on Avatar */}
        {isFrameLike && item?.imageUrl && (
          <Card tone="purple" padding="lg" className="mb-4">
            <p className="text-white/60 text-xs font-bold text-center mb-3">
              معاينة على أفاتارك
            </p>
            <div className="flex justify-center">
              <VipAvatar
                src={userAvatarUrl}
                name={userName}
                size={120}
                vip={vipLevel}
                ring={vipLevel === 0}
                customFrameUrl={item.imageUrl}
                frameScale={item.frameScale ?? 3.0}
                frameOffsetX={item.frameOffsetX ?? 0}
                frameOffsetY={item.frameOffsetY ?? 0}
              />
            </div>
          </Card>
        )}

        {/* Action */}
        {onConfirm && (
          <div className="space-y-2">
            <button
              onClick={onConfirm}
              disabled={busy || (showPrice && !canAfford)}
              className={`w-full py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 active:scale-95 transition ${
                !showPrice || canAfford
                  ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white"
                  : "bg-white/10 text-white/40 cursor-not-allowed"
              }`}
            >
              {busy ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                confirmLabel
              )}
            </button>
            {showPrice && !canAfford && price > 0 && (
              <p className="text-red-300 text-xs text-center">
                رصيدك غير كافٍ (تحتاج {price.toLocaleString()})
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
