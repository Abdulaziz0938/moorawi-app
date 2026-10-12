// [ezo-friends] طلبات الصداقة الواردة
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { getDeviceId } from "../lib/device";
import { dialog } from "../lib/dialog";
import { useBackButton } from "../lib/hooks/useBackButton";
import UserAvatar from "./UserAvatar";
import { Header } from "./VisitsSheet";
import { Loader2, Check, X, UserPlus } from "lucide-react";

interface Props { onClose: () => void; onUserClick?: (id: any) => void; }

export default function FriendRequestsSheet({ onClose, onUserClick }: Props) {
  useBackButton(true, onClose);
  const deviceId = getDeviceId();
  const requests = useQuery(api.friends.pendingRequests, { tokenOverride: deviceId });
  const review = useMutation(api.friends.review);
  const [busyId, setBusyId] = useState<string | null>(null);

  const handle = async (req: any, accept: boolean) => {
    setBusyId(req._id);
    try {
      await review({ requestId: req._id, accept, tokenOverride: deviceId });
    } catch (e: any) {
      dialog.alert(e?.message || "فشل");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[170] bg-gradient-to-b from-slate-900 to-black flex flex-col" dir="rtl">
      <Header onClose={onClose} title="طلبات الصداقة" assetKey="ui.sheet.friends" />

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {requests === undefined ? (
          <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-white/40" /></div>
        ) : requests.length === 0 ? (
          <div className="text-center py-16 text-white/40">
            <UserPlus size={48} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">لا توجد طلبات</p>
            <p className="text-xs mt-1">طلبات الصداقة الجديدة ستظهر هنا</p>
          </div>
        ) : (
          requests.map((r: any) => {
            const isBusy = busyId === r._id;
            return (
              <div key={r._id} className="rounded-2xl bg-white/5 border border-white/10 p-3 space-y-3">
                <button
                  onClick={() => onUserClick?.(r.userId)}
                  className="w-full flex items-center gap-3 active:opacity-80"
                >
                  <div className="w-14 h-14 rounded-full overflow-hidden bg-purple-700 flex items-center justify-center flex-shrink-0">
                    <UserAvatar avatarUrl={r.avatarUrl} name={r.name} className="w-full h-full" />
                  </div>
                  <div className="flex-1 min-w-0 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {r.verified && <Check size={11} className="text-blue-400" />}
                      <p className="text-white text-sm font-black truncate">{r.name}</p>
                    </div>
                    <p className="text-white/40 text-[10px]" dir="ltr">ID:{r.userNumber ?? "—"}</p>
                    <p className="text-white/40 text-[10px] mt-0.5">
                      {new Date(r.createdAt).toLocaleDateString("ar-EG")}
                    </p>
                  </div>
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => handle(r, true)}
                    disabled={isBusy}
                    className="flex-1 rounded-xl bg-emerald-600 py-2 text-white text-xs font-black flex items-center justify-center gap-1 active:scale-95 disabled:opacity-50"
                  >
                    {isBusy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                    قبول
                  </button>
                  <button
                    onClick={() => handle(r, false)}
                    disabled={isBusy}
                    className="flex-1 rounded-xl bg-red-600/80 py-2 text-white text-xs font-black flex items-center justify-center gap-1 active:scale-95 disabled:opacity-50"
                  >
                    <X size={14} />
                    رفض
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
