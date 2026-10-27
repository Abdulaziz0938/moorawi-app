// [ezo-recharge] لوحة الأدمن لمراجعة طلبات الشحن
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { getActiveToken } from "../lib/session";
import { dialog } from "../lib/dialog";
import VipAvatar from "./ui/VipAvatar";
import ProfilePage from "./ProfilePage";
import { Loader2, ChevronLeft, Coins, Receipt, Check, X, Clock, CheckCircle, XCircle, User } from "lucide-react";

interface Props {
  onClose: () => void;
}

type Tab = "pending" | "approved" | "rejected";

export default function AdminRechargeSheet({ onClose }: Props) {
  const token = getActiveToken();
  const [tab, setTab] = useState<Tab>("pending");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [openProfile, setOpenProfile] = useState<Id<"users"> | null>(null);

  const requests = useQuery(api.wallet.listRechargeRequests, {
    status: tab,
    limit: 100,
    tokenOverride: token,
  });

  const approve = useMutation(api.wallet.approveRecharge);
  const reject = useMutation(api.wallet.rejectRecharge);

  if (openProfile) {
    return <ProfilePage userId={openProfile} isMe={false} onClose={() => setOpenProfile(null)} />;
  }

  const handleApprove = async (r: any) => {
    setBusyId(r._id);
    try {
      const res = await approve({ requestId: r._id as Id<"rechargeRequests">, tokenOverride: token });
      dialog.alert(`تم شحن ${r.totalCoins.toLocaleString()} إلى UID ${r.uid}`);
    } catch (e: any) {
      dialog.alert(e?.message || "فشل الموافقة");
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = (r: any) => {
    dialog.confirm(
      `رفض طلب UID ${r.uid}؟`,
      async () => {
        try {
          await reject({ requestId: r._id as Id<"rechargeRequests">, tokenOverride: token });
        } catch (e: any) {
          dialog.alert(e?.message || "فشل الرفض");
        }
      },
      "رفض",
      "رفض"
    );
  };

  const fmt = (n: number) => n.toLocaleString("en-US");

  const tabs: { id: Tab; label: string; icon: any; color: string; bg: string }[] = [
    { id: "pending", label: "قيد المراجعة", icon: Clock, color: "text-amber-300", bg: "bg-amber-500/15 border-amber-400/40" },
    { id: "approved", label: "مقبولة", icon: CheckCircle, color: "text-emerald-300", bg: "bg-emerald-500/15 border-emerald-400/40" },
    { id: "rejected", label: "مرفوضة", icon: XCircle, color: "text-red-300", bg: "bg-red-500/15 border-red-400/40" },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-2">
          <button onClick={onClose} className="p-2 -ml-2 rounded-full hover:bg-white/10 text-white">
            <ChevronLeft size={18} className="rotate-180" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-cyan-500/20 flex items-center justify-center">
              <Receipt size={18} className="text-cyan-300" />
            </div>
            <h2 className="text-white text-base font-black">طلبات الشحن</h2>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-3 gap-2 p-3 border-b border-white/10 flex-shrink-0">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`h-10 rounded-xl text-[11px] font-black transition active:scale-95 flex items-center justify-center gap-1.5 ${
                active ? `${t.bg} ${t.color} border` : "bg-white/5 text-white/50 border border-white/10"
              }`}
            >
              <Icon size={13} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {requests === undefined ? (
          <div className="flex justify-center py-16">
            <Loader2 size={28} className="animate-spin text-white/40" />
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-16 text-white/40">
            <Receipt size={48} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm font-black">لا توجد طلبات في هذه الحالة</p>
          </div>
        ) : (
          requests.map((r: any) => (
            <div key={r._id} className="rounded-2xl bg-white/5 border border-white/10 p-4">
              {/* Row 1: user + time */}
              <div className="flex items-center justify-between mb-3">
                <button
                  onClick={() => setOpenProfile(r.userId)}
                  className="flex items-center gap-2 min-w-0 active:scale-95"
                >
                  <div className="w-9 h-9 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                    <User size={16} className="text-cyan-300" />
                  </div>
                  <div className="min-w-0 text-right">
                    <p className="text-white text-sm font-black truncate">{r.userName ?? "—"}</p>
                    <p className="text-white/40 text-[10px] tabular-nums">UID: {r.uid}</p>
                  </div>
                </button>
                <span className="text-white/40 text-[10px] tabular-nums flex-shrink-0" dir="ltr">
                  {new Date(r.createdAt).toLocaleString("ar-SY")}
                </span>
              </div>

              {/* Row 2: package + txnRef */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="rounded-xl bg-black/30 p-2.5">
                  <p className="text-white/50 text-[10px]">العملات</p>
                  <p className="text-amber-300 text-base font-black tabular-nums mt-0.5" dir="ltr">
                    {fmt(r.totalCoins)}
                  </p>
                </div>
                <div className="rounded-xl bg-black/30 p-2.5">
                  <p className="text-white/50 text-[10px]">السعر</p>
                  <p className="text-emerald-300 text-base font-black tabular-nums mt-0.5" dir="ltr">
                    ${((r.priceUSD ?? 0) / 100).toFixed(2)}
                  </p>
                </div>
              </div>

              {/* txnRef */}
              {r.txnRef && (
                <div className="rounded-xl bg-black/40 border border-white/10 p-2.5 mb-3">
                  <p className="text-white/50 text-[10px] mb-1">رقم عملية التحويل</p>
                  <p className="text-white text-[11px] font-mono break-all" dir="ltr">{r.txnRef}</p>
                </div>
              )}

              {/* Admin note (if processed) */}
              {r.adminNote && (
                <div className="rounded-xl bg-white/5 p-2.5 mb-3">
                  <p className="text-white/60 text-[10px]">{r.adminNote}</p>
                </div>
              )}

              {/* Actions */}
              {tab === "pending" && (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleApprove(r)}
                    disabled={busyId === r._id}
                    className="h-10 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-xs font-black flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-40"
                  >
                    {busyId === r._id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <><Check size={14} />موافقة</>
                    )}
                  </button>
                  <button
                    onClick={() => handleReject(r)}
                    disabled={busyId === r._id}
                    className="h-10 rounded-xl bg-red-500/20 text-red-300 text-xs font-black flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-40"
                  >
                    <X size={14} />
                    رفض
                  </button>
                </div>
              )}

              {tab !== "pending" && r.adminId && (
                <p className="text-white/40 text-[10px] text-center">
                  {tab === "approved" ? "تمت الموافقة" : "تم الرفض"}
                </p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
