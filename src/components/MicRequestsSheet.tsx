import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { getDeviceId } from "../lib/device";
import { X, Check, Ban, Loader2, Mic } from "lucide-react";

interface Props {
  roomId: Id<"rooms">;
  onClose: () => void;
}

export default function MicRequestsSheet({ roomId, onClose }: Props) {
  const deviceId = getDeviceId();
  const requests = useQuery(api.mics.listRequests, { roomId });
  const approve = useMutation(api.mics.approveRequest);
  const reject = useMutation(api.mics.rejectRequest);

  const list = requests ?? [];
  const loading = requests === undefined;

  const handleApprove = (id: Id<"micRequests">) => {
    approve({ requestId: id, tokenOverride: deviceId }).catch(() => {});
  };

  const handleReject = (id: Id<"micRequests">) => {
    reject({ requestId: id, tokenOverride: deviceId }).catch(() => {});
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end" dir="rtl">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md mx-auto bg-gradient-to-b from-slate-800 via-slate-850 to-slate-900 rounded-t-3xl max-h-[80vh] flex flex-col overflow-hidden border-t border-white/20">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-white/30" />
        </div>

        {/* Header */}
        <div className="px-4 pb-3 flex items-center justify-between">
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition"
          >
            <X size={18} />
          </button>
          <h2 className="text-base font-black text-white">طلبات المايك</h2>
          <div className="w-9 h-9 flex items-center justify-center">
            {list.length > 0 && (
              <span className="bg-red-500 text-white text-xs font-black rounded-full min-w-[22px] h-[22px] flex items-center justify-center border border-white/30">
                {list.length}
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-3 pb-4">
          {loading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="animate-spin text-white" size={32} />
            </div>
          )}

          {!loading && list.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mb-4">
                <Mic size={28} className="text-white/60" />
              </div>
              <p className="text-white/80 font-bold">لا توجد طلبات</p>
              <p className="text-white/50 text-xs mt-1">عندما يطلب أحد المستمعين المايك سيظهر هنا</p>
            </div>
          )}

          {!loading && list.map((req) => (
            <div
              key={req._id}
              className="flex items-center gap-3 p-3 bg-white/5 backdrop-blur rounded-2xl mb-2 border border-white/10 hover:bg-white/10 transition"
            >
              {/* Avatar */}
              <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-white font-black flex-shrink-0 border-2 border-white/30">
                {req.avatarUrl ? (
                  <img src={req.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span>{(req.userName?.[0] || "?")}</span>
                )}
              </div>

              {/* Name + ID */}
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-black truncate">{req.userName}</p>
                {req.userNumber !== null && (
                  <p className="text-white/50 text-[10px]">ID:{req.userNumber}</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleReject(req._id)}
                  className="w-10 h-10 rounded-full bg-red-500/90 hover:bg-red-500 text-white flex items-center justify-center transition active:scale-90 border border-white/20"
                >
                  <Ban size={18} />
                </button>
                <button
                  onClick={() => handleApprove(req._id)}
                  className="w-10 h-10 rounded-full bg-emerald-500/90 hover:bg-emerald-500 text-white flex items-center justify-center transition active:scale-90 border border-white/20"
                >
                  <Check size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
