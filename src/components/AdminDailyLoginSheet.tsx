// [ezo-daily-login] لوحة الأدمن لتحرير الأيام السبعة
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { getActiveToken } from "../lib/session";
import { dialog } from "../lib/dialog";
import { ChevronLeft, Loader2, Save, Image as ImageIcon, X, Check, Coins, Calendar } from "lucide-react";

interface Props { onClose: () => void; }

// الأصول المتاحة (من مجلد public)
const ASSET_POOL = [
  // Coins
  "/rewards/coins-small.png", "/rewards/coins-medium.png", "/rewards/coins-large.png",
  "/rewards/bcoins-small.png", "/rewards/bcoins-medium.png", "/rewards/bcoins-large.png",
  // Frames
  "/rewards/frame-gold.png", "/rewards/frame-blue.png", "/rewards/frame-green.png",
  "/rewards/frame-purple.png", "/rewards/frame-red.png",
  // Vehicles
  "/rewards/vehicle-yacht.png", "/rewards/vehicle-sportscar.png", "/rewards/vehicle-redcar.png",
  "/rewards/vehicle-motorcycle.png", "/rewards/vehicle-military.png",
  // VIP
  "/rewards/vip1.png",
  // Badges
  "/badges/badge-admin.png", "/badges/badge-super.png",
];

const BONUS_TYPES = [
  { v: "none",    label: "بدون" },
  { v: "vip",     label: "VIP" },
  { v: "frame",   label: "إطار" },
  { v: "vehicle", label: "مركبة" },
  { v: "gift",    label: "هدية" },
] as const;

export default function AdminDailyLoginSheet({ onClose }: Props) {
  const token = getActiveToken();
  const days = useQuery(api.dailyLogin.listAll, { tokenOverride: token ?? undefined });
  const upsert = useMutation(api.dailyLogin.upsertDay);

  const [editing, setEditing] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);

  // Form state
  const [coins, setCoins] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [label, setLabel] = useState("");
  const [bonusType, setBonusType] = useState<"none" | "vip" | "frame" | "vehicle" | "gift">("none");
  const [active, setActive] = useState(true);
  const [showPicker, setShowPicker] = useState(false);

  const startEdit = (day: any) => {
    setEditing(day);
    setCoins(String(day.coins));
    setImageUrl(day.imageUrl);
    setLabel(day.label);
    setBonusType(day.bonusType ?? "none");
    setActive(day.active);
    setShowPicker(false);
  };

  const handleSave = async () => {
    if (!editing) return;
    const amt = parseInt(coins || "0", 10);
    if (!amt || amt < 0) return dialog.alert("أدخل عدداً صحيحاً موجباً");
    if (!imageUrl) return dialog.alert("اختر صورة");
    setBusy(true);
    try {
      await upsert({
        dayIndex: editing.dayIndex,
        coins: amt,
        imageUrl,
        label: label.trim() || `اليوم ${editing.dayIndex + 1}`,
        bonusType,
        active,
        tokenOverride: token ?? undefined,
      });
      dialog.alert("تم الحفظ");
      setEditing(null);
    } catch (e: any) {
      dialog.alert(e?.message || "فشل");
    } finally {
      setBusy(false);
    }
  };

  // ═══ Editor view ═══
  if (editing) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 flex-shrink-0">
          <button onClick={() => setEditing(null)} className="p-2 -ml-2 rounded-full hover:bg-white/10 text-white">
            <ChevronLeft size={18} className="rotate-180" />
          </button>
          <h2 className="text-white text-base font-black">تعديل اليوم {editing.dayIndex + 1}</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Preview */}
          <div className="rounded-2xl bg-gradient-to-br from-amber-500/15 to-yellow-600/5 border border-amber-400/40 p-4 flex flex-col items-center gap-2">
            <div className="w-20 h-20 flex items-center justify-center">
              {imageUrl ? (
                <img src={imageUrl} alt="" className="w-full h-full object-contain" />
              ) : (
                <ImageIcon size={40} className="text-white/30" />
              )}
            </div>
            <p className="text-white font-black text-sm">{label || `اليوم ${editing.dayIndex + 1}`}</p>
            <p className="text-amber-300 font-black text-lg tabular-nums" dir="ltr">
              {parseInt(coins || "0").toLocaleString()}
            </p>
          </div>

          {/* Image picker trigger */}
          <button
            onClick={() => setShowPicker(!showPicker)}
            className="w-full h-12 rounded-xl bg-white/5 border border-white/15 text-white text-sm font-black flex items-center justify-center gap-2 active:scale-95"
          >
            <ImageIcon size={16} />
            {showPicker ? "إغلاق المنتقي" : "اختر صورة من الأصول"}
          </button>

          {/* Asset picker */}
          {showPicker && (
            <div className="rounded-2xl bg-black/40 border border-white/10 p-3">
              <div className="grid grid-cols-4 gap-2 max-h-64 overflow-y-auto">
                {ASSET_POOL.map((url) => {
                  const sel = imageUrl === url;
                  return (
                    <button
                      key={url}
                      onClick={() => { setImageUrl(url); setShowPicker(false); }}
                      className={`relative aspect-square rounded-xl border-2 p-1 flex items-center justify-center active:scale-95 ${
                        sel ? "border-emerald-400 bg-emerald-500/20" : "border-white/10 bg-white/5 hover:border-white/30"
                      }`}
                    >
                      <img src={url} alt="" className="w-full h-full object-contain" />
                      {sel && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center border-2 border-slate-900">
                          <Check size={10} className="text-white" strokeWidth={3} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Label */}
          <div>
            <label className="text-white/60 text-[11px] font-black px-1 mb-2 block">اسم اليوم</label>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="اليوم الأول"
              className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-emerald-400/60 placeholder:text-white/30"
            />
          </div>

          {/* Coins */}
          <div>
            <label className="text-white/60 text-[11px] font-black px-1 mb-2 block">عدد العملات</label>
            <div className="flex items-center gap-2 bg-white/5 border border-white/15 rounded-xl px-4 py-3">
              <Coins size={16} className="text-amber-400" />
              <input
                type="number"
                inputMode="numeric"
                value={coins}
                onChange={(e) => setCoins(e.target.value.replace(/\D/g, ""))}
                placeholder="50"
                className="flex-1 bg-transparent text-white text-lg font-black outline-none placeholder:text-white/30 tabular-nums"
                dir="ltr"
              />
            </div>
          </div>

          {/* Bonus */}
          <div>
            <label className="text-white/60 text-[11px] font-black px-1 mb-2 block">مكافأة إضافية</label>
            <div className="grid grid-cols-5 gap-1.5">
              {BONUS_TYPES.map((b) => (
                <button
                  key={b.v}
                  onClick={() => setBonusType(b.v)}
                  className={`h-9 rounded-lg text-[10px] font-black active:scale-95 ${
                    bonusType === b.v ? "bg-amber-500/30 text-amber-200 border border-amber-400/60" : "bg-white/5 text-white/60 border border-white/10"
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>

          {/* Active toggle */}
          <div className="flex items-center justify-between rounded-xl bg-white/5 border border-white/10 px-4 py-3">
            <span className="text-white text-sm font-black">ظاهر للمستخدمين</span>
            <button
              onClick={() => setActive(!active)}
              className={`w-12 h-7 rounded-full transition relative ${active ? "bg-emerald-500" : "bg-white/20"}`}
            >
              <span className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all ${active ? "right-1" : "right-6"}`} />
            </button>
          </div>
        </div>

        <div className="p-4 border-t border-white/10 flex-shrink-0">
          <button
            onClick={handleSave}
            disabled={busy}
            className="w-full h-14 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black text-sm active:scale-95 disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {busy ? <Loader2 size={18} className="animate-spin" /> : (<><Save size={18} />حفظ</>)}
          </button>
        </div>
      </div>
    );
  }

  // ═══ Grid view ═══
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-2">
          <button onClick={onClose} className="p-2 -ml-2 rounded-full hover:bg-white/10 text-white">
            <ChevronLeft size={18} className="rotate-180" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-amber-500/20 flex items-center justify-center">
              <Calendar size={18} className="text-amber-300" />
            </div>
            <h2 className="text-white text-base font-black">المكافأة اليومية</h2>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <p className="text-white/50 text-[11px] mb-3 leading-relaxed">
          اضغط على أي يوم لتعديل صورته، عدد العملات، والمكافأة الإضافية
        </p>

        {days === undefined ? (
          <div className="flex justify-center py-16">
            <Loader2 size={28} className="animate-spin text-white/40" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {days.map((day: any) => (
              <button
                key={day._id}
                onClick={() => startEdit(day)}
                className={`rounded-2xl border p-3 flex flex-col items-center gap-2 active:scale-95 transition ${
                  day.active
                    ? day.dayIndex === 6
                      ? "bg-pink-500/10 border-pink-400/40"
                      : "bg-white/5 border-white/15 hover:bg-white/10"
                    : "bg-black/40 border-white/5 opacity-50"
                }`}
              >
                <div className="w-16 h-16 flex items-center justify-center">
                  <img src={day.imageUrl} alt="" className="w-full h-full object-contain" />
                </div>
                <p className="text-white text-[11px] font-black">{day.label}</p>
                <div className="flex items-center gap-1">
                  <Coins size={12} className="text-amber-400" />
                  <span className="text-amber-200 text-xs font-black tabular-nums" dir="ltr">
                    {day.coins.toLocaleString()}
                  </span>
                </div>
                {!day.active && (
                  <span className="text-white/40 text-[9px] font-black">مخفي</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
