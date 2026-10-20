// [ezo-banners] نافذة البانرات العائمة — تظهر مرة واحدة يومياً عند فتح التطبيق
import { useState, useEffect } from "react";
import AssetVideo from "./ui/AssetVideo";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

interface Props {
  onOpenRoom?: (roomId: Id<"rooms">) => void;
  onOpenLive?: (streamId: string) => void;
}

const LS_KEY = "ezo_banner_last_seen"; // نخزن YYYY-MM-DD

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export default function BannerPopup({ onOpenRoom, onOpenLive }: Props) {
  const banners = useQuery(api.banners.list);
  const [visible, setVisible] = useState(false);
  const [idx, setIdx] = useState(0);

  // فحص مرة واحدة يومياً عند التحميل
  useEffect(() => {
    if (!banners || banners.length === 0) return;
    try {
      const last = localStorage.getItem(LS_KEY);
      if (last === todayKey()) return; // شوهد اليوم
      // انتظر ثانية قبل الإظهار
      const t = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(t);
    } catch {}
  }, [banners]);

  // auto-slide كل 5 ثوان
  useEffect(() => {
    if (!visible || !banners || banners.length <= 1) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % banners.length), 5000);
    return () => clearInterval(t);
  }, [visible, banners]);

  // تصحيح idx عند تغير عدد البانرات
  useEffect(() => {
    if (banners && idx >= banners.length) setIdx(0);
  }, [banners, idx]);

  const dismiss = () => {
    try { localStorage.setItem(LS_KEY, todayKey()); } catch {}
    setVisible(false);
  };

  const handleOpen = () => {
    if (!banners || !banners[idx]) return;
    const b: any = banners[idx];
    const type = b.actionType ?? "none";
    const payload = b.actionPayload ?? b.linkRoomId ?? "";

    if (type === "open_room" && payload && onOpenRoom) {
      onOpenRoom(payload as Id<"rooms">);
    } else if (type === "open_live" && payload && onOpenLive) {
      onOpenLive(payload);
    } else if (type === "open_url" && payload) {
      window.open(payload, "_blank", "noopener,noreferrer");
    } else if (type === "open_shop") {
      // trigger shop through global hook if available
      (window as any).__ezo_openShop?.();
    } else if (type === "open_vip") {
      (window as any).__ezo_openVip?.();
    }
    dismiss();
  };

  if (!visible || !banners || banners.length === 0) return null;

  const b: any = banners[idx];
  const hasAction = b.actionType && b.actionType !== "none";

  return (
    <div
      className="fixed inset-0 z-[350] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in"
      onClick={dismiss}
    >
      <div
        className="relative w-full max-w-md rounded-3xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* إغلاق */}
        <button
          onClick={dismiss}
          className="absolute top-3 left-3 z-30 w-9 h-9 rounded-full bg-black/60 backdrop-blur border border-white/20 flex items-center justify-center text-white active:scale-95"
          aria-label="إغلاق"
        >
          <X size={18} />
        </button>

        {/* صورة */}
        <div className="relative aspect-video bg-black">
          <AssetVideo url={b.imageUrl} type="auto" className="w-full h-full object-cover" />

          {/* أزرار التنقل */}
          {banners.length > 1 && (
            <>
              <button
                onClick={() => setIdx((i) => (i - 1 + banners.length) % banners.length)}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 backdrop-blur border border-white/20 flex items-center justify-center text-white active:scale-95"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={() => setIdx((i) => (i + 1) % banners.length)}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 backdrop-blur border border-white/20 flex items-center justify-center text-white active:scale-95"
              >
                <ChevronRight size={18} />
              </button>
            </>
          )}
        </div>

        {/* عنوان + زر عرض */}
        {(b.title || hasAction) && (
          <div className="bg-gradient-to-b from-slate-900 to-black p-4 space-y-3">
            {b.title && (
              <p className="text-white text-sm font-black text-center">{b.title}</p>
            )}
            {hasAction && (
              <button
                onClick={handleOpen}
                className="w-full h-12 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-black text-sm active:scale-95 shadow-lg"
              >
                عرض
              </button>
            )}
          </div>
        )}

        {/* نقاط المؤشر */}
        {banners.length > 1 && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
            {banners.map((_: any, i: number) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                className={`rounded-full transition ${i === idx ? "w-6 h-2 bg-white" : "w-2 h-2 bg-white/50"}`}
                aria-label={`بانر ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
