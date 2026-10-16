// [ezo-agents] لوحة وكيل الشحن — الرصيد + إرسال + السجل
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { getActiveToken } from "../lib/session";
import { useBackButton } from "../lib/hooks/useBackButton";
import VipAvatar from "./ui/VipAvatar";
import ProfilePage from "./ProfilePage";
import { Loader2, ChevronLeft, Coins, Wallet, Send, Receipt, TrendingUp, History, ShieldCheck } from "lucide-react";

interface Props {
  onClose: () => void;
}

export default function AgentPanelSheet({ onClose }: Props) {
  useBackButton(true, onClose);
  const token = getActiveToken();
  const agent = useQuery(api.agents.myAgent, { tokenOverride: token ?? undefined });
  const [openProfile, setOpenProfile] = useState<Id<"users"> | null>(null);
  const [tab, setTab] = useState<"recharge" | "topup">("recharge");

  const history = useQuery(
    api.agents.agentHistory,
    agent?.agentId ? { agentId: agent.agentId as Id<"agents">, limit: 100, tokenOverride: token ?? undefined } : "skip" as any
  );

  if (openProfile) {
    return (
      <ProfilePage userId={openProfile} isMe={false} onClose={() => setOpenProfile(null)} />
    );
  }

  const fmt = (n: number) => n.toLocaleString("en-US");

  return (
    <div className="fixed inset-0 z-[195] bg-gradient-to-b from-slate-900 to-black flex flex-col" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 pt-5 border-b border-white/10">
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white active:scale-95"
        >
          <ChevronLeft size={20} className="rotate-180" />
        </button>
        <div className="flex-1">
          <h1 className="text-white text-base font-black">لوحة وكيل الشحن</h1>
          <p className="text-white/50 text-[10px]">{agent?.name ?? "—"}</p>
        </div>
        <div className="w-9 h-9 rounded-full bg-emerald-500/20 flex items-center justify-center">
          <ShieldCheck size={18} className="text-emerald-400" />
        </div>
      </div>

      {!agent ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 size={28} className="animate-spin text-white/40" />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Balance hero */}
          <div className="rounded-3xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 p-5 shadow-2xl relative overflow-hidden">
            <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/10" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-1">
                <Wallet size={18} className="text-white/90" />
                <span className="text-white/85 text-xs font-bold">رصيد الوكيل</span>
              </div>
              <p className="text-white text-4xl font-black mb-3 tabular-nums" dir="ltr">
                {fmt(agent.balance)}
              </p>
              <div className="flex items-center gap-4 text-[11px]">
                <div>
                  <p className="text-white/70">إجمالي الشحن</p>
                  <p className="text-white font-black tabular-nums" dir="ltr">{fmt(agent.totalRecharged)}</p>
                </div>
                <div>
                  <p className="text-white/70">الحالة</p>
                  <p className="text-white font-black">{agent.active ? "نشط" : "معطّل"}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Recharge button — يفتح AgentRechargeSheet */}
          <button
            onClick={() => {
              const w = window as any;
              if (w.__ezo_openAgentRecharge) w.__ezo_openAgentRecharge();
            }}
            className="w-full h-14 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-black text-sm shadow-lg active:scale-95 flex items-center justify-center gap-2"
          >
            <Send size={18} />
            إعادة تعبئة مستخدم
          </button>

          {/* Tabs */}
          <div className="grid grid-cols-2 gap-2 mt-2">
            <button
              onClick={() => setTab("recharge")}
              className={`h-10 rounded-xl text-xs font-black transition active:scale-95 ${
                tab === "recharge" ? "bg-cyan-500/20 text-cyan-200 border border-cyan-400/40" : "bg-white/5 text-white/60 border border-white/10"
              }`}
            >
              سجل إعادة التعبئة
            </button>
            <button
              onClick={() => setTab("topup")}
              className={`h-10 rounded-xl text-xs font-black transition active:scale-95 ${
                tab === "topup" ? "bg-emerald-500/20 text-emerald-200 border border-emerald-400/40" : "bg-white/5 text-white/60 border border-white/10"
              }`}
            >
              رصيد من الإدارة
            </button>
          </div>

          {/* History list */}
          <div className="space-y-2">
            {history === undefined ? (
              <div className="flex justify-center py-8">
                <Loader2 size={22} className="animate-spin text-white/40" />
              </div>
            ) : (
              (() => {
                const filtered = (history as any[]).filter((h) =>
                  tab === "recharge" ? h.type === "recharge" : h.type === "topup"
                );
                if (filtered.length === 0) {
                  return (
                    <div className="text-center py-10 text-white/40">
                      <History size={32} className="mx-auto mb-2 opacity-30" />
                      <p className="text-[11px]">لا توجد عمليات بعد</p>
                    </div>
                  );
                }
                return filtered.map((h: any) => (
                  <div
                    key={h._id}
                    className="rounded-2xl bg-white/5 border border-white/10 p-3 flex items-center gap-3"
                  >
                    {tab === "recharge" ? (
                      <button
                        onClick={() => setOpenProfile(h.targetUserId)}
                        className="flex-shrink-0 active:scale-95"
                      >
                        <VipAvatar src={null} name={h.targetUid} size={40} vip={0} />
                      </button>
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                        <TrendingUp size={18} className="text-emerald-300" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-black truncate">
                        {tab === "recharge" ? `إلى UID: ${h.targetUid}` : "إعادة تعبئة من الإدارة"}
                      </p>
                      <p className="text-white/50 text-[10px] tabular-nums mt-0.5" dir="ltr">
                        {new Date(h.createdAt).toLocaleString("ar-SY")}
                      </p>
                    </div>
                    <div className="text-left flex-shrink-0">
                      <p className={`text-sm font-black tabular-nums ${tab === "recharge" ? "text-red-300" : "text-emerald-300"}`} dir="ltr">
                        {tab === "recharge" ? "−" : "+"}{fmt(h.coins)}
                      </p>
                    </div>
                  </div>
                ));
              })()
            )}
          </div>
        </div>
      )}
    </div>
  );
}
