import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import {
  X, Gift, MessageCircle, UserPlus, Mic, MicOff, ArrowDown,
  Ban, Crown, Loader2,
} from "lucide-react";

interface Props {
  userId: string;
  roomId?: Id<"rooms">;
  currentUserRole?: "owner" | "moderator" | "speaker" | "listener";
  isMySeat?: boolean;
  isMySeatMuted?: boolean;
  isTargetOnMic?: boolean;
  onClose: () => void;
  onOpenGift?: () => void;
  onKick?: () => void;
  onMute?: () => void;
  onRemoveFromSeat?: () => void;
  onPromote?: () => void;
  onInviteToMic?: () => void;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(2) + "K";
  return n.toString();
}

const VIP_BG: Record<number, string> = {
  0: "from-slate-700/70 via-slate-800/70 to-slate-900/70",
  1: "from-sky-600/70 via-sky-700/70 to-sky-900/70",
  2: "from-emerald-600/70 via-emerald-700/70 to-emerald-900/70",
  3: "from-purple-600/70 via-purple-700/70 to-purple-900/70",
  4: "from-pink-600/70 via-pink-700/70 to-pink-900/70",
  5: "from-red-600/70 via-red-700/70 to-red-900/70",
  6: "from-orange-500/70 via-orange-600/70 to-orange-800/70",
  7: "from-yellow-500/70 via-amber-600/70 to-yellow-700/70",
};

const VIP_LABEL: Record<number, string> = {
  0: "", 1: "VIP 1", 2: "VIP 2", 3: "VIP 3", 4: "VIP 4", 5: "VIP 5", 6: "VIP 6", 7: "VIP 7",
};

// Glass circular icon button — no colors, all white
function IconCircle({
  icon,
  onClick,
  size = 52,
}: {
  icon: React.ReactNode;
  onClick?: () => void;
  size?: number;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-full flex items-center justify-center transition-all active:scale-90 backdrop-blur-xl border border-white/25 shadow-lg bg-white/10 hover:bg-white/20 text-white"
      style={{ width: `${size}px`, height: `${size}px` }}
    >
      {icon}
    </button>
  );
}

export default function MiniProfileSheet({
  userId,
  roomId,
  currentUserRole,
  isMySeat,
  isMySeatMuted,
  isTargetOnMic,
  onClose,
  onOpenGift,
  onKick,
  onMute,
  onRemoveFromSeat,
  onPromote,
  onInviteToMic,
}: Props) {
  const profile = useQuery(api.profiles.getById, { userId: userId as Id<"users"> });

  if (profile === undefined) {
    return (
      <div className="fixed inset-0 z-[110] flex items-end" dir="rtl">
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
        <div className="relative w-full max-w-md mx-auto bg-white/10 backdrop-blur-2xl rounded-t-3xl p-8 flex items-center justify-center border-t border-white/20">
          <Loader2 className="animate-spin text-white" size={32} />
        </div>
      </div>
    );
  }

  if (profile === null) {
    return (
      <div className="fixed inset-0 z-[110] flex items-end" dir="rtl">
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
        <div className="relative w-full max-w-md mx-auto bg-white/10 backdrop-blur-2xl rounded-t-3xl p-8 text-center border-t border-white/20">
          <p className="text-white">المستخدم غير موجود</p>
          <button onClick={onClose} className="mt-4 text-white/60">إغلاق</button>
        </div>
      </div>
    );
  }

  const vipLevel = profile.vip;
  const bgGradient = VIP_BG[vipLevel] || VIP_BG[0];
  const vipLabel = VIP_LABEL[vipLevel];
  const canKick = currentUserRole === "owner" || currentUserRole === "moderator";
  const canPromote = currentUserRole === "owner";

  return (
    <div className="fixed inset-0 z-[110] flex items-end" dir="rtl">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md mx-auto rounded-t-3xl max-h-[92vh] overflow-hidden flex flex-col">
        <div className={`absolute inset-0 bg-gradient-to-b ${bgGradient}`} />
        <div className="absolute inset-0 bg-black/30 backdrop-blur-2xl" />
        <div className="absolute inset-x-0 top-0 h-px bg-white/40" />

        <div className="relative z-10 flex flex-col max-h-[92vh] overflow-y-auto">
          <div className="flex items-center justify-between px-4 pt-3 pb-2">
            <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/15 backdrop-blur border border-white/20 flex items-center justify-center text-white hover:bg-white/25 transition">
              <X size={18} />
            </button>
            {vipLabel && (
              <span className="text-[11px] font-black text-yellow-300 bg-black/30 backdrop-blur px-3 py-1 rounded-full border border-yellow-300/30">
                {vipLabel}
              </span>
            )}
          </div>

          <div className="flex flex-col items-center px-4 pb-4">
            <div className="w-24 h-24 rounded-full overflow-hidden ring-4 ring-white/40 shadow-2xl bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-white font-black text-3xl">
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <span>{profile.name[0] || "?"}</span>
              )}
            </div>

            <h3 className="text-white text-lg font-black mt-3 truncate max-w-full drop-shadow">
              {profile.name}
            </h3>

            <div className="flex items-center gap-2 mt-1">
              {profile.userNumber !== null && (
                <span className="text-white/80 text-xs">ID:{profile.userNumber}</span>
              )}
              {profile.adminRole === "super" && (
                <span className="text-[10px] font-black bg-gradient-to-r from-yellow-400 via-amber-500 to-red-500 text-white px-2 py-0.5 rounded-full border border-yellow-300/50 shadow">
                  👑 SUPER ADMIN
                </span>
              )}
              {profile.adminRole === "moderator" && (
                <span className="text-[10px] font-black bg-sky-500 text-white px-2 py-0.5 rounded-full border border-sky-300/50 shadow">
                  MOD
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 mt-2 flex-wrap justify-center">
              {profile.age && (
                <span className="text-[10px] bg-white/15 backdrop-blur border border-white/20 text-white px-2 py-0.5 rounded-full">
                  {profile.age} سنة
                </span>
              )}
              {profile.gender && (
                <span className="text-[10px] bg-white/15 backdrop-blur border border-white/20 text-white px-2 py-0.5 rounded-full">
                  {profile.gender === "male" ? "♂ ذكر" : profile.gender === "female" ? "♀ أنثى" : "آخر"}
                </span>
              )}
              {profile.country && (
                <span className="text-[10px] bg-white/15 backdrop-blur border border-white/20 text-white px-2 py-0.5 rounded-full">
                  {profile.country}
                </span>
              )}
            </div>
          </div>

          <div className="mx-4 mb-3 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-3 grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-lg">💎</p>
              <p className="text-white text-xs font-bold">{formatNumber(profile.totalSent)}</p>
              <p className="text-white/60 text-[10px]">ثروة</p>
            </div>
            <div>
              <p className="text-lg">✨</p>
              <p className="text-white text-xs font-bold">{formatNumber(profile.totalReceived)}</p>
              <p className="text-white/60 text-[10px]">جاذبية</p>
            </div>
            <div>
              <p className="text-lg">❤️</p>
              <p className="text-white text-xs font-bold">{formatNumber(profile.charms)}</p>
              <p className="text-white/60 text-[10px]">شارات</p>
            </div>
          </div>

          {isMySeat ? (
            <div className="mx-4 mb-4 flex items-center justify-center gap-5">
              <IconCircle icon={<Gift size={22} />} size={56} onClick={onOpenGift} />
              <IconCircle
                icon={isMySeatMuted ? <Mic size={22} /> : <MicOff size={22} />}
                size={56}
                onClick={onMute}
              />
              <IconCircle icon={<ArrowDown size={22} />} size={56} onClick={onRemoveFromSeat} />
            </div>
          ) : (
            <>
              <div className="mx-4 mb-3 flex items-center justify-center gap-4">
                <IconCircle icon={<Gift size={22} />} size={54} onClick={onOpenGift} />
                <IconCircle icon={<MessageCircle size={22} />} size={54} onClick={() => alert("قريباً")} />
                <IconCircle icon={<UserPlus size={22} />} size={54} onClick={() => alert("قريباً")} />
              </div>

              {roomId && (
                <div className="mx-4 mb-4 flex items-center justify-center gap-3 flex-wrap">
                  {!isTargetOnMic && (
                    <IconCircle icon={<Mic size={20} />} size={50} onClick={onInviteToMic} />
                  )}

                  {canKick && isTargetOnMic && (
                    <IconCircle icon={<MicOff size={20} />} size={50} onClick={onMute} />
                  )}

                  {canKick && isTargetOnMic && (
                    <IconCircle icon={<ArrowDown size={20} />} size={50} onClick={onRemoveFromSeat} />
                  )}

                  {canKick && (
                    <IconCircle icon={<Ban size={20} />} size={50} onClick={onKick} />
                  )}

                  {canPromote && (
                    <IconCircle icon={<Crown size={20} />} size={50} onClick={onPromote} />
                  )}
                </div>
              )}
            </>
          )}

          <div className="h-6" />
        </div>
      </div>
    </div>
  );
}
