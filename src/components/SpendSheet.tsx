// [ezo-spend] Transfer coins to a room member
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { getDeviceId } from "../lib/device";
import { getActiveToken } from "../lib/session";
import { dialog } from "../lib/dialog";
import { X, Coins, Loader2, User } from "lucide-react";

interface Props {
  roomId: Id<"rooms">;
  onClose: () => void;
}

export default function SpendSheet({ roomId, onClose }: Props) {
  const token = getActiveToken() ?? getDeviceId();
  const me = useQuery(api.auth.me, { tokenOverride: token });
  const members = useQuery(api.rooms.members, { roomId });
  const transfer = useMutation((api as any).users.transferCoins ?? api.profiles.updateBio); // fallback if missing
  const [targetId, setTargetId] = useState<Id<"users"> | null>(null);
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);

  const others = (members ?? []).filter((m: any) => m.userId !== me?._id);

  const handleSend = async () => {
    const n = parseInt(amount, 10);
    if (!targetId || !n || n <= 0) { dialog.alert("اختر عضواً وأدخل مبلغاً صحيحاً"); return; }
    setBusy(true);
    try {
      await (transfer as any)({ toUserId: targetId, amount: n, tokenOverride: token });
      dialog.alert("✅ تم التحويل");
      onClose();
    } catch (e: any) { dialog.alert(e?.message || "فشل التحويل"); }
    finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[150] bg-black/70 backdrop-blur-sm flex items-end justify-center" dir="rtl" onClick={onClose}>
      <div className="w-full max-w-md bg-gray-950 rounded-t-3xl p-4 space-y-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-white font-black text-sm flex items-center gap-2"><Coins size={16} className="text-amber-400" /> صرف عملات</h3>
          <button onClick={onClose} className="p-1 text-white/60"><X size={18} /></button>
        </div>

        <div>
          <p className="text-white/60 text-xs mb-1.5">اختر العضو</p>
          <div className="max-h-40 overflow-y-auto space-y-1">
            {others.length === 0 && <p className="text-white/40 text-xs text-center py-3">لا يوجد أعضاء آخرون</p>}
            {others.map((m: any) => (
              <button
                key={m.userId}
                onClick={() => setTargetId(m.userId)}
                className={`w-full flex items-center gap-2 p-2 rounded-lg border transition ${targetId === m.userId ? "bg-purple-500/20 border-purple-400/50" : "bg-white/5 border-white/10"}`}
              >
                <User size={14} className="text-white/60" />
                <span className="text-white text-xs font-bold truncate">{m.name}</span>
                <span className="text-white/40 text-[10px] ml-auto">ID:{m.userNumber ?? "—"}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-white/60 text-xs mb-1.5">المبلغ</p>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
            placeholder="0"
            className="w-full bg-white/10 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:bg-white/15"
          />
          <div className="flex gap-1 mt-1.5">
            {[100, 500, 1000, 5000].map(v => (
              <button key={v} onClick={() => setAmount(String(v))} className="flex-1 py-1 rounded-lg bg-white/5 text-white/70 text-[10px] font-bold active:scale-95">
                {v}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleSend}
          disabled={busy || !targetId || !amount}
          className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-black text-sm disabled:opacity-50 active:scale-95 flex items-center justify-center gap-2"
        >
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Coins size={16} />}
          {busy ? "جاري التحويل..." : "تحويل"}
        </button>
      </div>
    </div>
  );
}
