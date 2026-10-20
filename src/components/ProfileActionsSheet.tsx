// [ezo-profile-actions] قائمة ⋮ — إبلاغ / حظر / إشعار الاتصال
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { getActiveToken } from "../lib/session";
import { useBackButton } from "../lib/hooks/useBackButton";
import { dialog } from "../lib/dialog";
import { AlertTriangle, Ban, Bell, UserMinus, X, Loader2 } from "lucide-react";

interface Props {
  userId: Id<"users">;
  userName: string;
  onClose: () => void;
  onOpenReport: () => void;
}

export default function ProfileActionsSheet({ userId, userName, onClose, onOpenReport }: Props) {
  useBackButton(true, onClose);
  const token = getActiveToken();
  const isBlocked = useQuery(api.blocks.isBlocked, { targetUserId: userId, tokenOverride: token });
  const block = useMutation(api.blocks.block);
  const subscribe = useMutation(api.notifications.subscribeToOnline);
  const isSubscribed = useQuery(api.notifications.isSubscribedToOnline, { targetUserId: userId, tokenOverride: token });
  const unblock = useMutation(api.blocks.unblock);
  const [busy, setBusy] = useState(false);

  const handleBlockToggle = async () => {
    setBusy(true);
    try {
      if (isBlocked) {
        await unblock({ targetUserId: userId, tokenOverride: token });
        dialog.alert(`تم إلغاء حظر ${userName}`);
      } else {
        await block({ targetUserId: userId, tokenOverride: token });
        dialog.alert(`تم حظر ${userName}`);
      }
      onClose();
    } catch (e: any) {
      dialog.alert(e?.message || "فشل");
    } finally {
      setBusy(false);
    }
  };

  const handleNotifyToggle = async () => {
    if (isSubscribed) {
      dialog.alert("أنت مشترك بالفعل 🔔");
      return;
    }
    setBusy(true);
    try {
      await subscribe({ targetUserId: userId, tokenOverride: token });
      dialog.alert("✅ سيصلك إشعار عند اتصاله");
    } catch (e: any) {
      dialog.alert(e?.message || "فشل الاشتراك");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] bg-black/90 flex items-end" dir="rtl" onClick={onClose}>
      <div
        className="w-full max-w-md mx-auto bg-gradient-to-b from-slate-900 to-black rounded-t-3xl border-t border-white/10 p-4 pb-6 space-y-2"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onOpenReport}
          className="w-full h-14 rounded-2xl bg-red-500/15 border border-red-400/30 flex items-center justify-center gap-2 text-red-200 font-black text-sm active:scale-[0.99]"
        >
          <AlertTriangle size={18} />
          إبلاغ
        </button>

        <button
          onClick={handleBlockToggle}
          disabled={busy}
          className="w-full h-14 rounded-2xl bg-orange-500/15 border border-orange-400/30 flex items-center justify-center gap-2 text-orange-200 font-black text-sm active:scale-[0.99] disabled:opacity-40"
        >
          {busy ? <Loader2 size={18} className="animate-spin" /> : (
            <>
              {isBlocked ? <UserMinus size={18} /> : <Ban size={18} />}
              {isBlocked ? "إلغاء الحظر" : "حظر"}
            </>
          )}
        </button>

        <button
          onClick={handleNotifyToggle}
          className="w-full h-14 rounded-2xl bg-cyan-500/15 border border-cyan-400/30 flex items-center justify-center gap-2 text-cyan-200 font-black text-sm active:scale-[0.99]"
        >
          <Bell size={18} />
          {isSubscribed ? "مشترك بالفعل 🔔" : "الإشعار عبر الإنترنت"}
        </button>

        <button
          onClick={onClose}
          className="w-full h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/70 font-black text-sm active:scale-[0.99]"
        >
          إلغاء
        </button>
      </div>
    </div>
  );
}
