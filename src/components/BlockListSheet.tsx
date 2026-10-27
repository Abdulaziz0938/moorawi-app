// [ezo-blocks] قائمة المحظورين
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { getActiveToken } from "../lib/session";
import { useBackButton } from "../lib/hooks/useBackButton";
import { dialog } from "../lib/dialog";
import VipAvatar from "./ui/VipAvatar";
import { ChevronLeft, Loader2, Ban, UserMinus } from "lucide-react";

interface Props { onClose: () => void; }

export default function BlockListSheet({ onClose }: Props) {
  useBackButton(true, onClose);
  const token = getActiveToken();
  const blocked = useQuery(api.blocks.myBlocked, { tokenOverride: token });
  const unblock = useMutation(api.blocks.unblock);
  const [busy, setBusy] = useState<string | null>(null);

  const handleUnblock = async (b: any) => {
    setBusy(b._id);
    try {
      await unblock({ targetUserId: b.blockedId, tokenOverride: token });
      dialog.alert(`تم إلغاء حظر ${b.blockedName}`);
    } catch (e: any) {
      dialog.alert(e?.message || "فشل");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] bg-gradient-to-b from-slate-900 to-black flex flex-col" dir="rtl">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 flex-shrink-0">
        <button onClick={onClose} className="p-2 -ml-2 rounded-full hover:bg-white/10 text-white">
          <ChevronLeft size={20} className="rotate-180" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-red-500/20 flex items-center justify-center">
            <Ban size={18} className="text-red-400" />
          </div>
          <h2 className="text-white text-base font-black">قائمة الحظر</h2>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {blocked === undefined ? (
          <div className="flex justify-center py-16">
            <Loader2 size={28} className="animate-spin text-white/40" />
          </div>
        ) : blocked.length === 0 ? (
          <div className="text-center py-16 text-white/40">
            <Ban size={48} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm font-black">لا يوجد محظورون</p>
          </div>
        ) : (
          blocked.map((b: any) => (
            <div key={b._id} className="rounded-2xl bg-white/5 border border-white/10 p-3 flex items-center gap-3">
              <VipAvatar src={null} name={b.blockedName} size={40} vip={0} />
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-black truncate">{b.blockedName}</p>
                <p className="text-white/40 text-[10px] tabular-nums">
                  ID: {b.blockedUserNumber ?? "—"}
                </p>
              </div>
              <button
                onClick={() => handleUnblock(b)}
                disabled={busy === b._id}
                className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 text-[11px] font-black active:scale-95 disabled:opacity-40 flex items-center gap-1"
              >
                {busy === b._id ? <Loader2 size={12} className="animate-spin" /> : <><UserMinus size={12} />إلغاء</>}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
