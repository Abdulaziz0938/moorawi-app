// [ezo-lock] قفل الغرفة
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { getDeviceId } from "../lib/device";
import { dialog } from "../lib/dialog";
import { useBackButton } from "../lib/hooks/useBackButton";
import { Header } from "./VisitsSheet";
import { Lock, Unlock, Loader2, KeyRound, Shield, Check } from "lucide-react";

interface Props {
  roomId: Id<"rooms">;
  onClose: () => void;
}

export default function RoomLockSheet({ roomId, onClose }: Props) {
  useBackButton(true, onClose);
  const deviceId = getDeviceId();
  const room = useQuery(api.rooms.get, { roomId });
  const toggleLock = useMutation(api.rooms.toggleRoomLock);

  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  if (!room) {
    return (
      <div className="fixed inset-0 z-[170] bg-black/70 flex items-center justify-center">
        <Loader2 className="animate-spin text-white" size={32} />
      </div>
    );
  }

  const isLocked = !!room.isLocked;

  const handleToggle = async () => {
    if (isLocked) {
      // فتح — بدون كلمة مرور
      setBusy(true);
      try {
        await toggleLock({ roomId, locked: false, tokenOverride: deviceId });
        dialog.alert("تم فتح الغرفة ✅");
      } catch (e: any) {
        dialog.alert(e?.message || "فشل");
      } finally {
        setBusy(false);
      }
    } else {
      // قفل — يتطلب كلمة مرور
      const p = password.trim();
      if (p.length < 3) {
        dialog.alert("كلمة المرور يجب أن تكون 3 أحرف على الأقل");
        return;
      }
      setBusy(true);
      try {
        await toggleLock({ roomId, locked: true, password: p, tokenOverride: deviceId });
        dialog.alert("تم قفل الغرفة 🔒");
        setPassword("");
      } catch (e: any) {
        dialog.alert(e?.message || "فشل");
      } finally {
        setBusy(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[170] bg-gradient-to-b from-slate-900 to-black flex flex-col" dir="rtl">
      <Header onClose={onClose} title="قفل الغرفة" assetKey="ui.sheet.lock" />

      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {/* حالة القفل */}
        <div className="text-center mb-4">
          <div className={`w-24 h-24 rounded-full mx-auto flex items-center justify-center mb-3 ${
            isLocked
              ? "bg-red-500/20 border-2 border-red-400/50"
              : "bg-emerald-500/20 border-2 border-emerald-400/50"
          }`}>
            {isLocked ? (
              <Lock size={48} className="text-red-400" />
            ) : (
              <Unlock size={48} className="text-emerald-400" />
            )}
          </div>
          <p className="text-white text-lg font-black">
            {isLocked ? "الغرفة مقفلة" : "الغرفة مفتوحة"}
          </p>
          <p className="text-white/50 text-xs mt-1">
            {isLocked
              ? "لا يمكن لأحد الدخول بدون كلمة المرور"
              : "الجميع يمكنه الدخول الآن"}
          </p>
        </div>

        {/* نموذج كلمة المرور (فقط عند فتح القفل) */}
        {!isLocked && (
          <div className="rounded-2xl bg-white/5 border border-white/10 p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <KeyRound size={16} className="text-amber-300" />
              <p className="text-white text-sm font-black">كلمة المرور الجديدة</p>
            </div>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="3 أحرف على الأقل"
              maxLength={20}
              className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white text-center font-black tracking-wider placeholder:text-white/30 outline-none focus:border-purple-400"
            />
            <p className="text-white/40 text-[10px] text-center">
              شارك هذه الكلمة مع من تريد السماح لهم بالدخول
            </p>
          </div>
        )}

        {/* معلومات القفل */}
        {isLocked && (
          <div className="rounded-2xl bg-amber-500/10 border border-amber-400/30 p-4 flex gap-3">
            <Shield size={18} className="text-amber-300 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-amber-200 text-sm font-black">الغرفة محمية</p>
              <p className="text-amber-100/70 text-xs mt-1">
                كلمة المرور مخزنة بأمان. يمكنك تغييرها عند فتح القفل من جديد.
              </p>
            </div>
          </div>
        )}

        {/* زر التحكم */}
        <button
          onClick={handleToggle}
          disabled={busy || (!isLocked && password.trim().length < 3)}
          className={`w-full rounded-2xl py-4 text-white font-black text-base flex items-center justify-center gap-2 active:scale-95 transition disabled:opacity-40 ${
            isLocked
              ? "bg-gradient-to-r from-emerald-500 to-teal-600"
              : "bg-gradient-to-r from-red-500 to-red-700"
          }`}
        >
          {busy ? (
            <Loader2 size={20} className="animate-spin" />
          ) : isLocked ? (
            <>
              <Unlock size={20} />
              فتح الغرفة
            </>
          ) : (
            <>
              <Lock size={20} />
              قفل الغرفة
            </>
          )}
        </button>

        <div className="h-4" />
      </div>
    </div>
  );
}
