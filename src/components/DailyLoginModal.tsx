// [moorawi-missions] نافذة الدخول اليومي — تظهر كل 24 ساعة
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { getDeviceId } from "../lib/device";
import { dialog } from "../lib/dialog";
import { X, Gift, Loader2, Check } from "lucide-react";

interface Props { onClose: () => void; }

export default function DailyLoginModal({ onClose }: Props) {
  const deviceId = getDeviceId();
  const data = useQuery(api.missions.myProgress, { tokenOverride: deviceId });
  const config = useQuery(api.dailyLogin.list, {});
  const claim = useMutation(api.missions.claimDailyLogin);
  const [busy, setBusy] = useState(false);

  if (!data) return null;

  const currentStreak = data.streak ?? 0;
  const dayIndex = currentStreak % 7; // 0..6
  const canClaim = data.canClaimDaily;

  const handleClaim = async () => {
    setBusy(true);
    try {
      const res = await claim({ tokenOverride: deviceId });
      dialog.alert(`🎉 مبروك! حصلت على ${res.reward} عملة`);
      setTimeout(() => onClose(), 500);
    } catch (e: any) {
      dialog.alert(e?.message || "فشل");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/85 backdrop-blur-md flex items-end" onClick={onClose}>
      <div
        className="w-full max-w-md mx-auto bg-gradient-to-b from-purple-900 via-slate-900 to-black rounded-t-3xl p-5 pb-8"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center">
              <Gift size={20} className="text-white" />
            </div>
            <h2 className="text-white text-lg font-black">المكافأة اليومية</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white">
            <X size={16} />
          </button>
        </div>

        {/* Subtitle */}
        <p className="text-white/60 text-xs text-center mb-5">
          سجّل دخولك لمدة 7 أيام متتالية للحصول على 1000 عملة في اليوم السابع!
        </p>

                {/* 7 days grid */}
        <div className="grid grid-cols-4 gap-2 mb-5">
          {(config ?? []).map((day: any, i: number) => {
            const isPast = i < dayIndex;
            const isCurrent = i === dayIndex;
            const isFuture = i > dayIndex;
            const isJackpot = i === 6;

            return (
              <div
                key={day._id}
                className={`relative rounded-2xl border p-2 flex flex-col items-center gap-1.5 overflow-hidden ${
                  isCurrent && canClaim
                    ? "bg-amber-500/25 border-amber-400/70 ring-2 ring-amber-400/50 shadow-[0_0_20px_rgba(251,191,36,0.4)]"
                    : isPast
                    ? "bg-emerald-500/20 border-emerald-400/40"
                    : isJackpot
                    ? "bg-pink-500/15 border-pink-400/40"
                    : "bg-white/5 border-white/10"
                }`}
              >
                {/* صورة اليوم من الأصول */}
                <div className="w-12 h-12 flex items-center justify-center">
                  <img
                    src={day.imageUrl}
                    alt={day.label}
                    className={`w-full h-full object-contain ${isFuture ? "opacity-40 grayscale" : ""} ${isCurrent && canClaim ? "animate-pulse" : ""}`}
                  />
                </div>

                <span className={`text-[9px] font-black ${isCurrent && canClaim ? "text-amber-200" : "text-white/60"}`}>
                  {day.label}
                </span>

                <span className={`text-[11px] font-black tabular-nums ${
                  isPast ? "text-emerald-300" :
                  isCurrent && canClaim ? "text-amber-200" :
                  isJackpot ? "text-pink-300" :
                  "text-white/70"
                }`} dir="ltr">
                  {day.coins.toLocaleString()}
                </span>

                {isPast && (
                  <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center border-2 border-slate-900">
                    <Check size={10} className="text-white" strokeWidth={3} />
                  </div>
                )}

                {isJackpot && !isPast && (
                  <span className="absolute top-1 left-1 px-1 py-0.5 rounded text-[7px] font-black bg-pink-500 text-white">جاكبوت</span>
                )}
              </div>
            );
          })}
        </div>

{/* Streak info */}
        <div className="rounded-2xl bg-black/30 border border-white/10 p-3 mb-4 flex items-center justify-between">
          <span className="text-white/60 text-xs">سلسلتك الحالية</span>
          <div className="flex items-center gap-1">
            <span className="text-white text-sm font-black tabular-nums">{currentStreak % 7}</span>
            <span className="text-white/40 text-xs">/ 7</span>
          </div>
        </div>

        {/* Claim button */}
        {canClaim ? (
          <button
            onClick={handleClaim}
            disabled={busy}
            className="w-full rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-600 py-4 text-white font-black text-base flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
          >
            {busy ? <Loader2 size={20} className="animate-spin" /> : <Gift size={20} />}
            استلام {config?.find((d: any, i: number) => i === dayIndex)?.coins?.toLocaleString() ?? data.nextReward} عملة
          </button>
        ) : (
          <div className="rounded-2xl bg-emerald-500/15 border border-emerald-400/40 py-3 flex items-center justify-center gap-2">
            <Check size={18} className="text-emerald-400" />
            <span className="text-emerald-300 text-sm font-black">تم الاستلام اليوم — عُد غداً</span>
          </div>
        )}
      </div>
    </div>
  );
}
