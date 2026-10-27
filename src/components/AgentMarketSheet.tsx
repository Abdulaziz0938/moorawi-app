// [ezo-agents] سوق وكلاء الشحن — يعرض الوكلاء المعتمدين للتواصل المباشر
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { getDeviceId } from "../lib/device";
import { getActiveToken } from "../lib/session";
import { useBackButton } from "../lib/hooks/useBackButton";
import { dialog } from "../lib/dialog";
import VipAvatar from "./ui/VipAvatar";
import ProfilePage from "./ProfilePage";
import { ChevronLeft, Loader2, ShieldCheck, MessageCircle, User } from "lucide-react";

interface Props {
  onClose: () => void;
}

export default function AgentMarketSheet({ onClose }: Props) {
  useBackButton(true, onClose);
  const deviceId = getDeviceId();
  const token = getActiveToken() ?? deviceId;
  const agents = useQuery(api.agents.listPublicAgents, {});
  const [openProfile, setOpenProfile] = useState<Id<"users"> | null>(null);

  if (openProfile) {
    return (
      <ProfilePage
        userId={openProfile}
        isMe={false}
        onClose={() => setOpenProfile(null)}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-[180] bg-gradient-to-b from-slate-900 to-black flex flex-col" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 pt-5 border-b border-white/10">
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white active:scale-95"
        >
          <ChevronLeft size={20} className="rotate-180" />
        </button>
        <div className="flex-1">
          <h1 className="text-white text-base font-black">وكلاء الشحن المعتمدون</h1>
          <p className="text-white/50 text-[10px]">تواصل مباشر واتفق مع الوكيل</p>
        </div>
        <div className="w-9 h-9 rounded-full bg-emerald-500/20 flex items-center justify-center">
          <ShieldCheck size={18} className="text-emerald-400" />
        </div>
      </div>

      {/* Info banner */}
      <div className="mx-4 mt-3 rounded-2xl bg-emerald-500/10 border border-emerald-400/30 p-3">
        <p className="text-emerald-200 text-[11px] leading-relaxed">
          هؤلاء وكلاء معتمدون من الإدارة. تتفق معهم على طريقة الدفع والتسليم مباشرة.
          أرسل لهم رقم <span className="font-black">UID</span> الخاص بك عند الاتفاق.
        </p>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {agents === undefined ? (
          <div className="flex justify-center py-16">
            <Loader2 size={28} className="animate-spin text-white/40" />
          </div>
        ) : agents.length === 0 ? (
          <div className="text-center py-16 text-white/40">
            <ShieldCheck size={48} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm font-black">لا يوجد وكلاء معتمدون حالياً</p>
            <p className="text-[11px] mt-1">يمكنك الشحن عبر الباقات العامة</p>
          </div>
        ) : (
          agents.map((a: any) => (
            <div
              key={a.agentId}
              className="rounded-2xl bg-white/5 border border-white/10 p-3 flex items-center gap-3"
            >
              <button
                onClick={() => setOpenProfile(a.userId)}
                className="flex-shrink-0 active:scale-95"
              >
                <VipAvatar
                  src={a.avatarUrl}
                  name={a.name}
                  size={48}
                  vip={a.vipLevel ?? 0}
                />
              </button>

              <button
                onClick={() => setOpenProfile(a.userId)}
                className="flex-1 min-w-0 text-right"
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-white text-sm font-black truncate">
                    {a.name}
                  </span>
                  <ShieldCheck size={13} className="text-emerald-400 flex-shrink-0" />
                </div>
                <div className="text-white/50 text-[10px] mt-0.5 tabular-nums">
                  ID: {a.uid ?? "—"}
                </div>
              </button>

              <button
                onClick={() => setOpenProfile(a.userId)}
                className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-300 active:scale-95 flex-shrink-0"
                title="زيارة الحساب"
              >
                <User size={18} />
              </button>
              <button
                onClick={() => setOpenProfile(a.userId)}
                className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-300 active:scale-95 flex-shrink-0"
                title="مراسلة"
              >
                <MessageCircle size={18} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
