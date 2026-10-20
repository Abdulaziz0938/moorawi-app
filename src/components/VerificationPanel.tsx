// [ezo-admin] مراجعة طلبات التوثيق
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { getDeviceId } from "../lib/device";
import { dialog } from "../lib/dialog";
import UserAvatar from "./UserAvatar";
import { Loader2, Check, X, ShieldCheck, Clock, User } from "lucide-react";

interface Props { token: string | null; }

export default function VerificationPanel({ token }: Props) {
  const deviceId = getDeviceId();
  const requests = useQuery(api.verification.listPending, { tokenOverride: token ?? deviceId });
  const review = useMutation(api.verification.review);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [previewImg, setPreviewImg] = useState<string | null>(null);

  const handleApprove = async (req: any) => {
    dialog.confirm(`قبول توثيق "${req.userName}"؟`, async () => {
      setBusyId(req._id);
      try {
        await review({ requestId: req._id, approve: true, tokenOverride: token ?? deviceId });
        dialog.alert("تم القبول");
      } catch (e: any) {
        dialog.alert(e?.message || "فشل");
      } finally {
        setBusyId(null);
      }
    }, "قبول", "قبول");
  };

  const handleReject = async (req: any) => {
    dialog.confirm(`رفض توثيق "${req.userName}"؟`, async () => {
      setBusyId(req._id);
      try {
        await review({ requestId: req._id, approve: false, tokenOverride: token ?? deviceId });
      } catch (e: any) {
        dialog.alert(e?.message || "فشل");
      } finally {
        setBusyId(null);
      }
    }, "رفض", "رفض");
  };

  if (requests === undefined) {
    return <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-white/40" /></div>;
  }

  if (requests.length === 0) {
    return (
      <div className="text-center py-16 text-white/40">
        <ShieldCheck size={48} className="mx-auto mb-3 opacity-30" />
        <p className="text-sm">لا توجد طلبات توثيق</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      <p className="text-white/60 text-xs text-center">{requests.length} طلب قيد الانتظار</p>

      {requests.map((r: any) => {
        const isBusy = busyId === r._id;
        return (
          <div key={r._id} className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
            {/* User info */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full overflow-hidden bg-purple-700 flex items-center justify-center flex-shrink-0">
                <UserAvatar avatarUrl={r.userAvatar} name={r.userName} className="w-full h-full" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-black truncate">{r.userName}</p>
                <p className="text-white/50 text-[10px]" dir="ltr">ID:{r.userNumber ?? "—"}</p>
                <p className="text-white/40 text-[10px] mt-0.5">
                  <Clock size={10} className="inline mr-1" />
                  {new Date(r.submittedAt).toLocaleString("ar-EG")}
                </p>
              </div>
            </div>

            {/* Image preview */}
            <button
              onClick={() => setPreviewImg(r.imageUrl)}
              className="w-full rounded-xl bg-black/40 border border-white/10 overflow-hidden aspect-square max-h-64"
            >
              <img src={r.imageUrl} alt="" className="w-full h-full object-cover" />
            </button>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => handleApprove(r)}
                disabled={isBusy}
                className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-white text-xs font-black flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {isBusy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                قبول
              </button>
              <button
                onClick={() => handleReject(r)}
                disabled={isBusy}
                className="flex-1 rounded-xl bg-red-600/80 py-2.5 text-white text-xs font-black flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <X size={14} />
                رفض
              </button>
            </div>
          </div>
        );
      })}

      {/* Full image modal */}
      {previewImg && (
        <div className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-4" onClick={() => setPreviewImg(null)}>
          <img src={previewImg} alt="" className="max-h-full max-w-full object-contain rounded-2xl" />
        </div>
      )}
    </div>
  );
}
