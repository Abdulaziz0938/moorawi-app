// [ezo-agency] Admin panel — review agency create requests
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { dialog } from "../lib/dialog";
import {
  Loader2, Check, X, Briefcase, Clock, User, FileText,
  ChevronLeft,
} from "lucide-react";

interface Props { token: string | null; }

export default function AgencyRequestsPanel({ token }: Props) {
  const reqs = useQuery(api.agencies.listCreateRequests, { tokenOverride: token ?? undefined });
  const review = useMutation(api.agencies.reviewCreateRequest);
  const [busyId, setBusyId] = useState<string | null>(null);

  const handleApprove = async (req: any) => {
    dialog.confirm(
      `موافقة على إنشاء وكالة "${req.agencyName}"؟`,
      async () => {
        setBusyId(req._id);
        try {
          const res = await review({
            requestId: req._id,
            approve: true,
            tokenOverride: token ?? undefined,
          });
          if (res.approved) {
            dialog.alert(`تمت الموافقة — رقم الوكالة: ${res.agencyNumber}`);
          }
        } catch (e: any) {
          dialog.alert(e?.message || "فشل");
        } finally {
          setBusyId(null);
        }
      },
      "موافقة",
      "موافقة"
    );
  };

  const handleReject = async (req: any) => {
    dialog.confirm(
      `رفض طلب "${req.agencyName}"؟`,
      async () => {
        setBusyId(req._id);
        try {
          await review({
            requestId: req._id,
            approve: false,
            tokenOverride: token ?? undefined,
          });
        } catch (e: any) {
          dialog.alert(e?.message || "فشل");
        } finally {
          setBusyId(null);
        }
      },
      "رفض",
      "رفض"
    );
  };

  if (reqs === undefined) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 size={24} className="animate-spin text-white/40" />
      </div>
    );
  }

  if (reqs.length === 0) {
    return (
      <div className="text-center py-16 text-white/40">
        <Briefcase size={48} className="mx-auto mb-3 opacity-30" />
        <p className="text-sm">لا توجد طلبات معلقة</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      <p className="text-white/60 text-xs text-center">
        {reqs.length} طلب في الانتظار
      </p>

      {reqs.map((r: any) => {
        const isBusy = busyId === r._id;
        return (
          <div key={r._id} className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
            {/* User info */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full overflow-hidden bg-purple-700 flex items-center justify-center flex-shrink-0">
                {r.userAvatar ? (
                  <img src={r.userAvatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User size={20} className="text-white/60" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-black truncate">{r.userName}</p>
                <p className="text-white/50 text-[10px]" dir="ltr">ID:{r.userNumber ?? "—"}</p>
              </div>
            </div>

            {/* Agency data */}
            <div className="rounded-xl bg-black/30 border border-white/5 p-3 space-y-2">
              {r.logoUrl && (
                <div className="flex justify-center">
                  <img src={r.logoUrl} alt="" className="w-20 h-20 rounded-2xl object-cover border border-white/10" />
                </div>
              )}
              <div className="flex items-center gap-2">
                <Briefcase size={14} className="text-teal-300 flex-shrink-0" />
                <p className="text-white text-sm font-black">{r.agencyName}</p>
              </div>
              {r.description && (
                <div className="flex items-start gap-2">
                  <FileText size={14} className="text-white/40 flex-shrink-0 mt-0.5" />
                  <p className="text-white/70 text-xs leading-relaxed">{r.description}</p>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Clock size={12} className="text-white/40" />
                <p className="text-white/40 text-[10px]" dir="ltr">
                  {new Date(r.createdAt).toLocaleString("ar-EG")}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => handleApprove(r)}
                disabled={isBusy}
                className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-white font-black text-xs flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
              >
                {isBusy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                موافقة
              </button>
              <button
                onClick={() => handleReject(r)}
                disabled={isBusy}
                className="flex-1 rounded-xl bg-red-600/80 py-2.5 text-white font-black text-xs flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
              >
                <X size={14} />
                رفض
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
