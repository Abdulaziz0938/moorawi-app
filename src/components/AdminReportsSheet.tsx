// [ezo-reports] لوحة الأدمن لمراجعة الإبلاغات
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { getActiveToken } from "../lib/session";
import { dialog } from "../lib/dialog";
import { ChevronLeft, Loader2, AlertTriangle, User, Check, X, Ban, Eye } from "lucide-react";

interface Props { onClose: () => void; }

type Tab = "pending" | "dismissed" | "actioned";

export default function AdminReportsSheet({ onClose }: Props) {
  const token = getActiveToken();
  const [tab, setTab] = useState<Tab>("pending");
  const [busyId, setBusyId] = useState<string | null>(null);

  const reports = useQuery(api.reports.listByStatus, {
    status: tab,
    limit: 100,
    tokenOverride: token,
  });
  const review = useMutation(api.reports.review);

  const handleAction = async (r: any, action: "dismissed" | "actioned", ban: boolean = false) => {
    setBusyId(r._id);
    try {
      await review({
        reportId: r._id as Id<"reports">,
        action,
        banTarget: ban,
        tokenOverride: token,
      });
      dialog.alert(ban ? "✅ تم الحظر والمراجعة" : action === "actioned" ? "✅ تم اتخاذ إجراء" : "✅ تم تجاهل الإبلاغ");
    } catch (e: any) {
      dialog.alert(e?.message || "فشل");
    } finally {
      setBusyId(null);
    }
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: "pending",   label: "قيد المراجعة" },
    { id: "actioned",  label: "تم اتخاذ إجراء" },
    { id: "dismissed", label: "متجاهلة" },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-2">
          <button onClick={onClose} className="p-2 -ml-2 rounded-full hover:bg-white/10 text-white">
            <ChevronLeft size={18} className="rotate-180" />
          </button>
          <div className="w-9 h-9 rounded-full bg-red-500/20 flex items-center justify-center">
            <AlertTriangle size={18} className="text-red-400" />
          </div>
          <h2 className="text-white text-base font-black">الإبلاغات</h2>
        </div>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-3 gap-2 p-3 border-b border-white/10 flex-shrink-0">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`h-10 rounded-xl text-[11px] font-black transition active:scale-95 ${
              tab === t.id
                ? "bg-red-500/20 text-red-200 border border-red-400/40"
                : "bg-white/5 text-white/50 border border-white/10"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {reports === undefined ? (
          <div className="flex justify-center py-16">
            <Loader2 size={28} className="animate-spin text-white/40" />
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-16 text-white/40">
            <AlertTriangle size={48} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm font-black">لا توجد إبلاغات</p>
          </div>
        ) : (
          reports.map((r: any) => (
            <div key={r._id} className="rounded-2xl bg-white/5 border border-white/10 p-4">
              {/* Row 1: target */}
              <div className="flex items-center gap-2 mb-3">
                <div className="w-9 h-9 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                  <User size={16} className="text-red-300" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-white text-sm font-black truncate">{r.targetName}</p>
                  <p className="text-white/40 text-[10px] tabular-nums">
                    ID: {r.targetUserNumber ?? "—"} · من {r.reporterName}
                  </p>
                </div>
                <span className="text-white/40 text-[10px] flex-shrink-0" dir="ltr">
                  {new Date(r.createdAt).toLocaleString("ar-SY")}
                </span>
              </div>

              {/* Reason */}
              <div className="rounded-xl bg-red-500/10 border border-red-400/30 p-2.5 mb-2">
                <p className="text-red-200 text-xs font-black">{r.reason}</p>
                {r.details && (
                  <p className="text-white/70 text-[11px] mt-1 leading-relaxed">{r.details}</p>
                )}
              </div>

              {/* Admin note (if reviewed) */}
              {r.adminNote && (
                <div className="rounded-xl bg-white/5 p-2.5 mb-2">
                  <p className="text-white/50 text-[10px] mb-0.5">ملاحظة الأدمن</p>
                  <p className="text-white/70 text-[11px]">{r.adminNote}</p>
                </div>
              )}

              {/* Actions */}
              {tab === "pending" && (
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => handleAction(r, "dismissed")}
                    disabled={busyId === r._id}
                    className="h-10 rounded-xl bg-white/10 text-white/80 text-xs font-black flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-40"
                  >
                    <X size={14} />تجاهل
                  </button>
                  <button
                    onClick={() => handleAction(r, "actioned")}
                    disabled={busyId === r._id}
                    className="h-10 rounded-xl bg-amber-500/20 text-amber-200 text-xs font-black flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-40"
                  >
                    <Check size={14} />إجراء
                  </button>
                  <button
                    onClick={() => handleAction(r, "actioned", true)}
                    disabled={busyId === r._id}
                    className="h-10 rounded-xl bg-red-500/20 text-red-200 text-xs font-black flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-40"
                  >
                    {busyId === r._id ? <Loader2 size={14} className="animate-spin" /> : (<><Ban size={14} />حظر</>)}
                  </button>
                </div>
              )}

              {tab !== "pending" && r.reviewedAt && (
                <p className="text-white/40 text-[10px] text-center">
                  {tab === "actioned" ? "تم اتخاذ إجراء" : "تم التجاهل"} — {new Date(r.reviewedAt).toLocaleString("ar-SY")}
                </p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
