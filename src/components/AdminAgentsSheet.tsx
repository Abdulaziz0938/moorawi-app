// [ezo-agents] لوحة الأدمن لإدارة وكلاء الشحن
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { getActiveToken } from "../lib/session";
import { dialog } from "../lib/dialog";
import VipAvatar from "./ui/VipAvatar";
import { Loader2, Search, Plus, Send, Power, Trash2, Coins, ShieldCheck, User as UserIcon, History, X, ChevronLeft } from "lucide-react";

interface Props {
  onClose: () => void;
}

export default function AdminAgentsSheet({ onClose }: Props) {
  const token = getActiveToken();
  const agents = useQuery(api.agents.listAgents, { tokenOverride: token });
  const createAgent = useMutation(api.agents.createAgent);
  const topUpAgent = useMutation(api.agents.topUpAgent);
  const setAgentActive = useMutation(api.agents.setAgentActive);
  const removeAgent = useMutation(api.agents.removeAgent);

  const [showCreate, setShowCreate] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<any>(null); // for topup
  const [showHistory, setShowHistory] = useState<any>(null);     // for history
  const [busy, setBusy] = useState(false);

  // Create form
  const [searchQ, setSearchQ] = useState("");
  const [pickedUser, setPickedUser] = useState<any>(null);
  const [agentName, setAgentName] = useState("");
  const [commission, setCommission] = useState("10");
  const results = useQuery(
    api.users.search,
    searchQ.trim().length >= 2 ? { q: searchQ.trim(), limit: 15 } : "skip" as any
  );

  // Topup form
  const [topupAmount, setTopupAmount] = useState("");

  const handleCreate = async () => {
    if (!pickedUser) return dialog.alert("اختر مستخدماً");
    if (!agentName.trim()) return dialog.alert("أدخل اسم الوكيل");
    setBusy(true);
    try {
      await createAgent({
        userId: pickedUser.userId as Id<"users">,
        name: agentName.trim(),
        commissionPct: Math.max(0, Math.min(100, parseInt(commission || "10", 10))),
        tokenOverride: token,
      });
      dialog.alert(`تم إنشاء وكيل: ${agentName}`);
      setShowCreate(false);
      setSearchQ(""); setPickedUser(null); setAgentName(""); setCommission("10");
    } catch (e: any) {
      dialog.alert(e?.message || "فشل الإنشاء");
    } finally {
      setBusy(false);
    }
  };

  const handleTopup = async () => {
    if (!selectedAgent) return;
    const amt = parseInt(topupAmount || "0", 10);
    if (!amt || amt <= 0) return dialog.alert("أدخل عدداً موجباً");
    setBusy(true);
    try {
      await topUpAgent({
        agentId: selectedAgent.agentId as Id<"agents">,
        coins: amt,
        tokenOverride: token,
      });
      dialog.alert(`تم شحن ${amt.toLocaleString()} للوكيل ${selectedAgent.name}`);
      setSelectedAgent(null); setTopupAmount("");
    } catch (e: any) {
      dialog.alert(e?.message || "فشل الشحن");
    } finally {
      setBusy(false);
    }
  };

  const handleToggleActive = async (a: any) => {
    try {
      await setAgentActive({
        agentId: a.agentId as Id<"agents">,
        active: !a.active,
        tokenOverride: token,
      });
    } catch (e: any) {
      dialog.alert(e?.message || "فشل التحديث");
    }
  };

  const handleRemove = (a: any) => {
    dialog.confirm(`حذف الوكيل "${a.name}"؟`, async () => {
      try {
        await removeAgent({ agentId: a.agentId as Id<"agents">, tokenOverride: token });
      } catch (e: any) {
        dialog.alert(e?.message || "فشل الحذف");
      }
    }, "حذف", "حذف");
  };

  const fmt = (n: number) => n.toLocaleString("en-US");

  // ═══ History view ═══
  if (showHistory) {
    return <AgentHistoryView agent={showHistory} onBack={() => setShowHistory(null)} />;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-2">
          <button onClick={onClose} className="p-2 -ml-2 rounded-full hover:bg-white/10 text-white">
            <X size={18} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <ShieldCheck size={18} className="text-emerald-400" />
            </div>
            <h2 className="text-white text-base font-black">إدارة وكلاء الشحن</h2>
          </div>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="h-9 px-3 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-xs font-black flex items-center gap-1.5 active:scale-95"
        >
          <Plus size={14} />
          وكيل جديد
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {agents === undefined ? (
          <div className="flex justify-center py-16">
            <Loader2 size={28} className="animate-spin text-white/40" />
          </div>
        ) : agents.length === 0 ? (
          <div className="text-center py-16 text-white/40">
            <ShieldCheck size={48} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm font-black">لا يوجد وكلاء بعد</p>
            <p className="text-[11px] mt-1">اضغط "وكيل جديد" للبدء</p>
          </div>
        ) : (
          agents.map((a: any) => (
            <div key={a.agentId} className="rounded-2xl bg-white/5 border border-white/10 p-4">
              {/* Row 1: name + active toggle */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${a.active ? "bg-emerald-500/20" : "bg-white/10"}`}>
                    <ShieldCheck size={16} className={a.active ? "text-emerald-400" : "text-white/40"} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-white text-sm font-black truncate">{a.name}</p>
                    <p className="text-white/40 text-[10px] tabular-nums">UID: {a.uid ?? "—"}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleToggleActive(a)}
                  className={`w-9 h-9 rounded-full flex items-center justify-center active:scale-95 ${a.active ? "bg-emerald-500/20 text-emerald-400" : "bg-white/10 text-white/40"}`}
                  title={a.active ? "تعطيل" : "تفعيل"}
                >
                  <Power size={16} />
                </button>
              </div>

              {/* Row 2: balance */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="rounded-xl bg-black/30 p-2.5">
                  <p className="text-white/50 text-[10px]">الرصيد الحالي</p>
                  <p className="text-white text-base font-black tabular-nums mt-0.5" dir="ltr">{fmt(a.balance)}</p>
                </div>
                <div className="rounded-xl bg-black/30 p-2.5">
                  <p className="text-white/50 text-[10px]">إجمالي الشحن</p>
                  <p className="text-white text-base font-black tabular-nums mt-0.5" dir="ltr">{fmt(a.totalRecharged)}</p>
                </div>
              </div>

              {/* Row 3: actions */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setSelectedAgent(a)}
                  className="h-9 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-[11px] font-black flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <Send size={13} />
                  شحن رصيد
                </button>
                <button
                  onClick={() => setShowHistory(a)}
                  className="h-9 rounded-xl bg-white/10 text-white text-[11px] font-black flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <History size={13} />
                  السجل
                </button>
                <button
                  onClick={() => handleRemove(a)}
                  className="h-9 rounded-xl bg-red-500/20 text-red-300 text-[11px] font-black flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <Trash2 size={13} />
                  حذف
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ═══ Create modal ═══ */}
      {showCreate && (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => !busy && setShowCreate(false)}>
          <div className="w-full max-w-md bg-slate-900 rounded-3xl border border-white/10 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h3 className="text-white text-sm font-black">إنشاء وكيل جديد</h3>
              <button onClick={() => !busy && setShowCreate(false)} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white active:scale-95">
                <X size={16} />
              </button>
            </div>
            <div className="p-4 space-y-3">
              {!pickedUser ? (
                <>
                  <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5">
                    <Search size={14} className="text-white/40" />
                    <input
                      value={searchQ}
                      onChange={(e) => setSearchQ(e.target.value)}
                      placeholder="ابحث بالـ UID أو الاسم..."
                      className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-white/30"
                    />
                  </div>
                  <div className="max-h-64 overflow-y-auto space-y-1.5">
                    {(results ?? []).map((u: any) => (
                      <button
                        key={u.userId}
                        onClick={() => {
                          setPickedUser(u);
                          setAgentName(u.name ?? "");
                        }}
                        className="w-full rounded-xl bg-white/5 border border-white/10 p-2.5 flex items-center gap-3 active:scale-95"
                      >
                        <VipAvatar src={u.avatarUrl} name={u.name ?? u.uid} size={36} vip={u.vipLevel ?? 0} />
                        <div className="flex-1 text-right min-w-0">
                          <p className="text-white text-xs font-black truncate">{u.name ?? "—"}</p>
                          <p className="text-white/40 text-[10px] tabular-nums">UID: {u.uid ?? "—"}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <div className="rounded-xl bg-white/5 border border-white/10 p-3 flex items-center gap-3">
                    <VipAvatar src={pickedUser.avatarUrl} name={pickedUser.name ?? pickedUser.uid} size={44} vip={pickedUser.vipLevel ?? 0} />
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-black truncate">{pickedUser.name ?? "—"}</p>
                      <p className="text-white/40 text-[10px] tabular-nums">UID: {pickedUser.uid}</p>
                    </div>
                    <button onClick={() => setPickedUser(null)} className="text-white/60 text-[11px] font-black">تغيير</button>
                  </div>
                  <input
                    value={agentName}
                    onChange={(e) => setAgentName(e.target.value)}
                    placeholder="اسم الوكيل"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm outline-none placeholder:text-white/30"
                  />
                  <div className="flex items-center gap-2">
                    <label className="text-white/60 text-[11px] font-black">نسبة العمولة</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={commission}
                      onChange={(e) => setCommission(e.target.value.replace(/\D/g, ""))}
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none tabular-nums"
                      dir="ltr"
                    />
                    <span className="text-white/60 text-xs font-black">%</span>
                  </div>
                  <button
                    onClick={handleCreate}
                    disabled={busy || !agentName.trim()}
                    className="w-full h-12 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black text-sm active:scale-95 disabled:opacity-40 flex items-center justify-center gap-2"
                  >
                    {busy ? <Loader2 size={18} className="animate-spin" /> : (<><Plus size={16} />إنشاء</>)}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══ Topup modal ═══ */}
      {selectedAgent && (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => !busy && setSelectedAgent(null)}>
          <div className="w-full max-w-sm bg-slate-900 rounded-3xl border border-white/10 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-white/10">
              <h3 className="text-white text-sm font-black">شحن رصيد الوكيل</h3>
              <p className="text-white/50 text-[11px] mt-1">{selectedAgent.name}</p>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-3">
                <Coins size={16} className="text-amber-400" />
                <input
                  type="number"
                  inputMode="numeric"
                  value={topupAmount}
                  onChange={(e) => setTopupAmount(e.target.value.replace(/\D/g, ""))}
                  placeholder="0"
                  className="flex-1 bg-transparent text-white text-lg font-black outline-none placeholder:text-white/30 tabular-nums"
                  dir="ltr"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[100000, 500000, 1000000].map((v) => (
                  <button
                    key={v}
                    onClick={() => setTopupAmount(String(v))}
                    className="h-9 rounded-lg bg-white/5 border border-white/10 text-white text-[10px] font-black active:scale-95 tabular-nums"
                    dir="ltr"
                  >
                    {v.toLocaleString()}
                  </button>
                ))}
              </div>
              <button
                onClick={handleTopup}
                disabled={busy || !topupAmount || parseInt(topupAmount) <= 0}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black text-sm active:scale-95 disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {busy ? <Loader2 size={18} className="animate-spin" /> : (<><Send size={16} />شحن</>)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Sub-component: Agent history view
// ═══════════════════════════════════════════════════════════
function AgentHistoryView({ agent, onBack }: { agent: any; onBack: () => void }) {
  const token = getActiveToken();
  const history = useQuery(api.agents.agentHistory, {
    agentId: agent.agentId as Id<"agents">,
    limit: 100,
    tokenOverride: token,
  });
  const fmt = (n: number) => n.toLocaleString("en-US");

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 flex-shrink-0">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-white/10 text-white">
          <ChevronLeft size={18} />
        </button>
        <div className="flex-1">
          <h2 className="text-white text-sm font-black">سجل: {agent.name}</h2>
          <p className="text-white/40 text-[10px]">آخر 100 عملية</p>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {history === undefined ? (
          <div className="flex justify-center py-16">
            <Loader2 size={24} className="animate-spin text-white/40" />
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-16 text-white/40">
            <History size={40} className="mx-auto mb-2 opacity-30" />
            <p className="text-[11px]">لا توجد عمليات</p>
          </div>
        ) : (
          history.map((h: any) => (
            <div key={h._id} className="rounded-xl bg-white/5 border border-white/10 p-3 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${h.type === "recharge" ? "bg-cyan-500/20" : "bg-emerald-500/20"}`}>
                {h.type === "recharge" ? <UserIcon size={16} className="text-cyan-300" /> : <Coins size={16} className="text-emerald-300" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-xs font-black truncate">
                  {h.type === "recharge" ? `إلى UID: ${h.targetUid}` : "شحن من الإدارة"}
                </p>
                <p className="text-white/40 text-[10px] tabular-nums mt-0.5" dir="ltr">
                  {new Date(h.createdAt).toLocaleString("ar-SY")}
                </p>
              </div>
              <p className={`text-sm font-black tabular-nums flex-shrink-0 ${h.type === "recharge" ? "text-red-300" : "text-emerald-300"}`} dir="ltr">
                {h.type === "recharge" ? "−" : "+"}{fmt(h.coins)}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
