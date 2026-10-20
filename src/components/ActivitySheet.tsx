// [moorawi] Activity Sheet — room actions log
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { getDeviceId } from "../lib/device";
import {
  X, Activity, MicOff, Mic, Ban, ShieldOff, Shield, Crown,
  ArrowDown, UserMinus, Loader2,
} from "lucide-react";

interface Props {
  roomId: Id<"rooms">;
  onClose: () => void;
  currentUserId?: string;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

function actionMeta(action: string) {
  const map: Record<string, { icon: any; label: string; color: string }> = {
    kick: { icon: UserMinus, label: "طرد", color: "text-red-400" },
    ban: { icon: Ban, label: "حظر", color: "text-red-500" },
    unban: { icon: Shield, label: "رفع الحظر", color: "text-emerald-400" },
    mute: { icon: MicOff, label: "كتم", color: "text-amber-400" },
    unmute: { icon: Mic, label: "إلغاء الكتم", color: "text-emerald-400" },
    promote: { icon: Crown, label: "ترقية إلى مشرف", color: "text-yellow-400" },
    demote: { icon: ShieldOff, label: "إزالة الإشراف", color: "text-orange-400" },
    removeFromSeat: { icon: ArrowDown, label: "إنزال من المايك", color: "text-orange-400" },
    adminMute: { icon: MicOff, label: "كتم إداري", color: "text-red-400" },
    adminUnmute: { icon: Mic, label: "إلغاء الكتم الإداري", color: "text-emerald-400" },
  };
  return map[action] ?? { icon: Activity, label: action, color: "text-white/70" };
}

export default function ActivitySheet({ roomId, onClose, currentUserId }: Props) {
  const deviceId = getDeviceId();
  const actions = useQuery(api.mics.listActivity, { roomId, limit: 100 });

  return (
    <div className="fixed inset-0 z-[110] flex items-end" dir="rtl">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div
        className="relative w-full max-w-md mx-auto rounded-t-3xl max-h-[85vh] flex flex-col overflow-hidden"
        style={{
          background: "linear-gradient(145deg, rgba(30,27,75,0.95) 0%, rgba(15,12,40,0.98) 100%)",
          backdropFilter: "blur(28px)",
          WebkitBackdropFilter: "blur(28px)",
          borderTop: "1px solid rgba(255,255,255,0.2)",
        }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-white/30" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Activity size={16} className="text-white/80" />
            <h2 className="text-sm font-black text-white">نشاط الغرفة</h2>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {actions === undefined && (
            <div className="flex justify-center py-12">
              <Loader2 className="animate-spin text-white/60" size={28} />
            </div>
          )}

          {actions && actions.length === 0 && (
            <div className="text-center py-12">
              <Activity size={32} className="text-white/30 mx-auto mb-3" />
              <p className="text-white/50 text-sm">لا يوجد نشاط بعد</p>
            </div>
          )}

          {actions?.map((a: any) => {
            const meta = actionMeta(a.action);
            const Icon = meta.icon;
            const isMe = currentUserId && a.actorId === currentUserId;

            return (
              <div
                key={a._id}
                className="p-2.5 rounded-2xl flex items-center gap-2"
                style={{
                  background: "linear-gradient(135deg, rgba(30,27,75,0.5) 0%, rgba(15,12,40,0.7) 100%)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                {/* Time */}
                <span className="text-[10px] text-white/40 font-bold flex-shrink-0" dir="ltr">
                  {formatTime(a.createdAt)}
                </span>

                {/* Icon */}
                <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                  <Icon size={14} className={meta.color} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 text-right">
                  <div className="flex items-center justify-end gap-1.5 flex-wrap">
                    {/* Actor */}
                    <div className="flex items-center gap-1">
                      <span className="text-[11px] font-black text-white truncate max-w-[80px]">
                        {isMe ? "أنت" : a.actorName}
                      </span>
                      {!isMe && a.actorAvatar && (
                        <div className="w-4 h-4 rounded-full overflow-hidden bg-purple-500 flex-shrink-0">
                          <img src={a.actorAvatar} alt="" className="w-full h-full object-cover" />
                        </div>
                      )}
                    </div>

                    {/* Action label */}
                    <span className={`text-[11px] font-black ${meta.color}`}>{meta.label}</span>

                    {/* Target */}
                    <div className="flex items-center gap-1">
                      {a.targetAvatar && (
                        <div className="w-4 h-4 rounded-full overflow-hidden bg-purple-500 flex-shrink-0">
                          <img src={a.targetAvatar} alt="" className="w-full h-full object-cover" />
                        </div>
                      )}
                      <span className="text-[11px] font-black text-white/80 truncate max-w-[80px]">
                        {a.targetName}
                      </span>
                    </div>
                  </div>

                  {/* IDs row */}
                  <div className="flex items-center justify-end gap-2 mt-0.5 text-[9px] text-white/40 font-bold" dir="ltr">
                    {a.actorNumber && !isMe && <span>Actor ID:{a.actorNumber}</span>}
                    {a.targetNumber && <span>Target ID:{a.targetNumber}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
