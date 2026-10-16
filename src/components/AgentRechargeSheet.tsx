// [ezo-agents] إعادة تعبئة مستخدم عبر UID
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { getActiveToken } from "../lib/session";
import { useBackButton } from "../lib/hooks/useBackButton";
import { dialog } from "../lib/dialog";
import VipAvatar from "./ui/VipAvatar";
import { ChevronLeft, Search, Loader2, Check, Coins, Send } from "lucide-react";

interface Props {
  onClose: () => void;
}

export default function AgentRechargeSheet({ onClose }: Props) {
  useBackButton(true, onClose);
  const token = getActiveToken();
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<any>(null);
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);

  const results = useQuery(
    api.users.search,
    q.trim().length >= 2 ? { q: q.trim(), limit: 15 } : "skip" as any
  );
  const agent = useQuery(api.agents.myAgent, { tokenOverride: token ?? undefined });
  const agentRecharge = useMutation(api.agents.agentRecharge);

  const handleSend = async () => {
    if (!selected) {
      dialog.alert("اختر مستخدماً أولاً");
      return;
    }
    const amt = parseInt(amount || "0", 10);
    if (!amt || amt <= 0) {
      dialog.alert("أدخل عدداً صحيحاً موجباً");
      return;
    }
    if (agent && amt > agent.balance) {
      dialog.alert(`رصيدك ${agent.balance}. لا يكفي`);
      return;
    }
    setBusy(true);
    try {
      const res = await agentRecharge({
        targetUid: selected.uid,
        coins: amt,
        tokenOverride: token ?? undefined,
      });
      dialog.alert(`تم شحن ${amt.toLocaleString()} عملة إلى ${selected.name ?? selected.uid}`);
      setSelected(null);
      setQ("");
      setAmount("");
    } catch (e: any) {
      dialog.alert(e?.message || "فشل الإرسال");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-gradient-to-b from-slate-900 to-black flex flex-col" dir="rtl">
      <div className="flex items-center gap-3 p-4 pt-5 border-b border-white/10">
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white active:scale-95"
        >
          <ChevronLeft size={20} className="rotate-180" />
        </button>
        <div className="flex-1">
          <h1 className="text-white text-base font-black">إعادة تعبئة مستخدم</h1>
          <p className="text-white/50 text-[10px]">ابحث بالـ UID أو الاسم</p>
        </div>
        <div className="px-3 py-1.5 rounded-full bg-emerald-500/20 text-emerald-200 text-[11px] font-black tabular-nums" dir="ltr">
          {(agent?.balance ?? 0).toLocaleString()}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {!selected ? (
          <>
            {/* Search */}
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
              <Search size={16} className="text-white/40" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="UID أو اسم أو username..."
                className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-white/30"
              />
            </div>

            {/* Results */}
            {q.trim().length >= 2 && results === undefined ? (
              <div className="flex justify-center py-8">
                <Loader2 size={22} className="animate-spin text-white/40" />
              </div>
            ) : (
              <div className="space-y-2">
                {(results ?? []).map((u: any) => (
                  <button
                    key={u.userId}
                    onClick={() => setSelected(u)}
                    className="w-full rounded-2xl bg-white/5 border border-white/10 p-3 flex items-center gap-3 active:scale-95"
                  >
                    <VipAvatar src={u.avatarUrl} name={u.name ?? u.uid} size={40} vip={u.vipLevel ?? 0} />
                    <div className="flex-1 min-w-0 text-right">
                      <p className="text-white text-sm font-black truncate">{u.name ?? "—"}</p>
                      <p className="text-white/50 text-[10px] tabular-nums">UID: {u.uid ?? "—"}</p>
                    </div>
                    <Check size={18} className="text-white/20" />
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            {/* Selected user */}
            <div className="rounded-3xl bg-gradient-to-br from-cyan-500/20 to-blue-600/10 border border-cyan-400/40 p-5 flex items-center gap-4">
              <VipAvatar src={selected.avatarUrl} name={selected.name ?? selected.uid} size={64} vip={selected.vipLevel ?? 0} />
              <div className="flex-1 min-w-0">
                <p className="text-white text-base font-black truncate">{selected.name ?? "—"}</p>
                <p className="text-white/60 text-xs tabular-nums mt-0.5">UID: {selected.uid}</p>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="px-3 py-1.5 rounded-full bg-white/10 text-white/70 text-[11px] font-black active:scale-95"
              >
                تغيير
              </button>
            </div>

            {/* Amount */}
            <div>
              <label className="text-white/60 text-[11px] font-black px-2 mb-2 block">عدد العملات</label>
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
                <Coins size={16} className="text-amber-400" />
                <input
                  type="number"
                  inputMode="numeric"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
                  placeholder="0"
                  className="flex-1 bg-transparent text-white text-lg font-black outline-none placeholder:text-white/30 tabular-nums"
                  dir="ltr"
                />
              </div>
              {/* Quick amounts */}
              <div className="grid grid-cols-4 gap-2 mt-3">
                {[1000, 5000, 10000, 50000].map((v) => (
                  <button
                    key={v}
                    onClick={() => setAmount(String(v))}
                    className="h-9 rounded-xl bg-white/5 border border-white/10 text-white text-[11px] font-black active:scale-95 tabular-nums"
                    dir="ltr"
                  >
                    {v.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>

            {/* Confirm */}
            <button
              onClick={handleSend}
              disabled={busy || !amount || parseInt(amount) <= 0}
              className="w-full h-14 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-black text-sm shadow-2xl active:scale-95 disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {busy ? <Loader2 size={18} className="animate-spin" /> : (<><Send size={18} />إرسال</>)}
            </button>

            <p className="text-white/40 text-[10px] text-center leading-relaxed">
              سيُخصم المبلغ من رصيدك ويُضاف للحساب المستهدف فوراً
            </p>
          </>
        )}
      </div>
    </div>
  );
}
