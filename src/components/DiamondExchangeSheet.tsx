// [ezo-exchange] Diamond ↔ Gold exchange (Binmo style)
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/types";
import { getDeviceId } from "../lib/device";
import { getActiveToken } from "../lib/session";
import { dialog } from "../lib/dialog";
import { X, Loader2, ArrowRight, Gem, Coins, History } from "lucide-react";

interface Props {
  roomId?: Id<"rooms">;
  onClose: () => void;
}

export default function DiamondExchangeSheet({ onClose }: Props) {
  const token = getActiveToken() ?? getDeviceId();
  const me = useQuery(api.auth.me, { tokenOverride: token });
  const exchange = useMutation((api as any).users.exchangeDiamonds);
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);

  const myDiamonds = (me as any)?.diamonds ?? 0;
  const myCoins = (me as any)?.coins ?? 0;

  const doExchange = async () => {
    const n = parseInt(amount, 10);
    if (!n || n <= 0) { dialog.alert("أدخل كمية صحيحة"); return; }
    if (myDiamonds < n) { dialog.alert("رصيد الألماس غير كافٍ"); return; }
    setBusy(true);
    try {
      await (exchange as any)({ amount: n, tokenOverride: token });
      dialog.alert("✅ تم الاستبدال بنجاح");
      onClose();
    } catch (e: any) { dialog.alert(e?.message || "فشل الاستبدال"); }
    finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[150] bg-black/70 backdrop-blur-sm flex items-end justify-center" dir="rtl" onClick={onClose}>
      <div className="w-full max-w-md bg-white rounded-t-3xl p-5 space-y-4 max-h-[85dvh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-gray-200">
          <button onClick={onClose} className="text-gray-600 p-1">
            <ArrowRight size={22} />
          </button>
          <h2 className="text-gray-900 font-black text-lg">صرف العملات الذهبية</h2>
          <button className="text-gray-400 p-1"><History size={22} /></button>
        </div>

        {/* Balance Card */}
        <div className="rounded-2xl bg-yellow-50 p-4">
          <p className="text-gray-700 text-xs font-bold text-center mb-2">رصيدي</p>
          <div className="flex items-center justify-around">
            <div className="text-center">
              <p className="text-gray-900 text-2xl font-black">{myDiamonds}</p>
              <div className="flex items-center justify-center gap-1 mt-1">
                <Gem size={16} className="text-cyan-500" fill="currentColor" />
                <span className="text-gray-500 text-[10px]">ألماس</span>
              </div>
            </div>
            <div className="text-center">
              <p className="text-gray-900 text-2xl font-black">{myCoins}</p>
              <div className="flex items-center justify-center gap-1 mt-1">
                <Coins size={16} className="text-amber-500" fill="currentColor" />
                <span className="text-gray-500 text-[10px]">ذهب</span>
              </div>
            </div>
          </div>
        </div>

        <p className="text-gray-500 text-xs text-center">
          يمكن استبدال الألماس بعملات ذهبية 1 = 1
        </p>

        {/* Consume */}
        <div className="rounded-2xl border-2 border-cyan-200 bg-cyan-50 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-gray-700 text-sm font-bold">استهلك</span>
            <div className="flex items-center gap-1">
              <Gem size={20} className="text-cyan-500" fill="currentColor" />
            </div>
          </div>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
            placeholder="0"
            className="w-full bg-white border border-cyan-200 rounded-xl px-3 py-2 text-center text-gray-900 text-lg font-black outline-none focus:border-cyan-400"
          />
        </div>

        {/* Exchange */}
        <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center justify-between">
            <span className="text-gray-700 text-sm font-bold">صرف</span>
            <div className="flex items-center gap-1">
              <Coins size={20} className="text-amber-500" fill="currentColor" />
            </div>
          </div>
          <p className="text-center text-gray-900 text-2xl font-black">{amount || 0}</p>
        </div>

        {/* Notes */}
        <div className="text-gray-500 text-[11px] leading-relaxed space-y-1">
          <p>1. يمكنك الحصول على الألماس عند استلام الهدايا (التي يتم شراؤها بعملات ذهبية).</p>
          <p>2. لا يمكن ملء عدد الألماس إلا بمضاعفات 10.</p>
        </div>

        {/* Confirm */}
        <button
          onClick={doExchange}
          disabled={busy || !amount}
          className="w-full py-3.5 rounded-full bg-emerald-500 text-white font-black text-base disabled:opacity-50 active:scale-95 flex items-center justify-center gap-2"
        >
          {busy ? <Loader2 size={18} className="animate-spin" /> : null}
          {busy ? "جاري..." : "تأكيد"}
        </button>
      </div>
    </div>
  );
}
