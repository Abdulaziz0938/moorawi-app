// [ezo-daily-login] نافذة الدخول اليومي — بتصميم Binmo
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { getDeviceId } from "../lib/device";
import { dialog } from "../lib/dialog";
import { Loader2, Check, X } from "lucide-react";

interface Props { onClose: () => void; }

export default function DailyLoginModal({ onClose }: Props) {
  const deviceId = getDeviceId();
  const data = useQuery(api.missions.myProgress, { tokenOverride: deviceId });
  const config = useQuery(api.dailyLogin.list, {});
  const claim = useMutation(api.missions.claimDailyLogin);
  const [busy, setBusy] = useState(false);

  if (!data) return null;

  const currentStreak = data.streak ?? 0;
  const dayIndex = currentStreak % 7;
  const canClaim = data.canClaimDaily;

  const handleClaim = async () => {
    setBusy(true);
    try {
      const res = await claim({ tokenOverride: deviceId });
      dialog.alert(`مبروك! حصلت على ${res.reward} عملة`);
      setTimeout(() => onClose(), 500);
    } catch (e: any) {
      dialog.alert(e?.message || "فشل");
    } finally {
      setBusy(false);
    }
  };

  // صف واحد: 4 بطاقات / صف ثاني: 3 بطاقات
  const rows: any[][] = [
    (config ?? []).slice(0, 4),
    (config ?? []).slice(4, 7),
  ];

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm rounded-3xl overflow-hidden"
        style={{
          background: "linear-gradient(180deg, #d4f5d4 0%, #b8eeb8 50%, #a3e6a3 100%)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5), inset 0 2px 0 rgba(255,255,255,0.6)",
        }}
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        {/* زر الإغلاق */}
        <button
          onClick={onClose}
          className="absolute top-3 left-3 z-20 w-9 h-9 rounded-full bg-white/90 shadow-lg flex items-center justify-center text-slate-700 active:scale-95"
        >
          <X size={18} strokeWidth={3} />
        </button>

        {/* ═══ الرأس: صورة + عنوان ═══ */}
        <div className="relative pt-6 pb-2 px-4">
          {/* صورة زخرفية */}
          <div className="flex justify-center mb-2">
            <img
              src="/rewards/daily-header.png"
              alt=""
              className="w-32 h-32 object-contain drop-shadow-2xl"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          </div>

          <h2 className="text-center text-emerald-900 text-xl font-black">
            تسجيل الدخول اليومي
          </h2>
          <p className="text-center text-emerald-700/80 text-xs font-bold mt-1">
            قم بتسجيل الدخول للفوز بمكافآت كبيرة
          </p>
        </div>

        {/* ═══ شريط التقدم ═══ */}
        <div className="mx-4 my-3 rounded-2xl bg-white/70 shadow-inner px-4 py-2.5 text-center">
          <p className="text-emerald-900 text-sm font-black">
            لقد قمت بتسجيل الدخول لمدة{" "}
            <span className="text-emerald-600 text-lg tabular-nums">{currentStreak}</span>{" "}
            {currentStreak === 1 ? "يوم" : "أيام"}
          </p>
        </div>

        {/* ═══ 7 بطاقات في صفين ═══ */}
        <div className="px-4 pb-3 space-y-2">
          {rows.map((row, ri) => (
            <div
              key={ri}
              className={`grid gap-2 ${row.length === 4 ? "grid-cols-4" : "grid-cols-3"}`}
            >
              {row.map((day: any, i: number) => {
                const globalIdx = ri * 4 + i;
                const isPast = globalIdx < dayIndex;
                const isCurrent = globalIdx === dayIndex;
                const isFuture = globalIdx > dayIndex;
                const isJackpot = globalIdx === 6;

                return (
                  <div
                    key={day._id}
                    className={`relative rounded-xl p-2 flex flex-col items-center gap-1 transition ${
                      isCurrent && canClaim
                        ? "bg-gradient-to-b from-yellow-300 to-yellow-500 shadow-[0_0_20px_rgba(250,204,21,0.8)] scale-105 ring-2 ring-yellow-400"
                        : isPast
                        ? "bg-emerald-100/60"
                        : "bg-white/40"
                    }`}
                    style={{ minHeight: 96 }}
                  >
                    {/* علامة اليوم */}
                    <span className={`text-[9px] font-black ${
                      isCurrent && canClaim ? "text-yellow-900" : "text-emerald-800"
                    }`}>
                      اليوم {globalIdx + 1}
                    </span>

                    {/* صورة المكافأة */}
                    <div className="w-11 h-11 flex items-center justify-center">
                      <img
                        src={day.imageUrl}
                        alt=""
                        className={`w-full h-full object-contain ${isFuture ? "opacity-50 grayscale" : ""} ${isCurrent && canClaim ? "animate-bounce" : ""}`}
                        style={{ animationDuration: "2s" }}
                      />
                    </div>

                    {/* عدد الأيام/العملات */}
                    <span className={`text-[10px] font-black tabular-nums ${
                      isCurrent && canClaim ? "text-yellow-900" : isJackpot ? "text-pink-700" : "text-emerald-900"
                    }`} dir="ltr">
                      {day.coins >= 1000 ? `${(day.coins / 1000).toFixed(day.coins % 1000 === 0 ? 0 : 1)}K` : day.coins}
                    </span>

                    {/* ✓ لليوم الماضي */}
                    {isPast && (
                      <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-emerald-600 flex items-center justify-center border-2 border-white shadow-md">
                        <Check size={10} className="text-white" strokeWidth={4} />
                      </div>
                    )}

                    {/* x3 للجاكبوت */}
                    {isJackpot && isCurrent && canClaim && (
                      <span className="absolute -top-1.5 -left-1.5 px-1.5 py-0.5 rounded-md bg-pink-500 text-white text-[8px] font-black shadow-md">
                        x3
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* ═══ زر الاستلام ═══ */}
        <div className="px-4 pb-5">
          {canClaim ? (
            <button
              onClick={handleClaim}
              disabled={busy}
              className="w-full rounded-full bg-gradient-to-b from-emerald-400 to-emerald-600 py-4 text-white font-black text-base shadow-[0_8px_20px_rgba(16,185,129,0.5),inset_0_2px_0_rgba(255,255,255,0.4)] active:scale-95 disabled:opacity-50 border-2 border-emerald-700/30"
            >
              {busy ? <Loader2 size={22} className="animate-spin mx-auto" /> : "تسجيل الدخول"}
            </button>
          ) : (
            <div className="rounded-full bg-white/60 py-3.5 flex items-center justify-center gap-2 border border-emerald-300/60">
              <Check size={18} className="text-emerald-700" strokeWidth={3} />
              <span className="text-emerald-900 text-sm font-black">تم الاستلام اليوم — عُد غداً</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
