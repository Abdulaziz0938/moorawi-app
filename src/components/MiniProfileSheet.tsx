import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import {
  X, Gift, MessageCircle, UserPlus, Mic, MicOff, ArrowDown,
  Ban, Crown, Loader2, UserMinus, VolumeX, Volume2,
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

// Reusable IconButton
function IconButton({
  icon,
  label,
  onClick,
  color = "default",
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  color?: "default" | "primary" | "danger" | "warning" | "success" | "gold";
}) {
  const colorMap = {
    default: "bg-white/15 hover:bg-white/25 text-white",
    primary: "bg-gradient-to-br from-pink-500 to-purple-600 hover:opacity-90 text-white",
    danger: "bg-red-500/90 hover:bg-red-500 text-white",
    warning: "bg-amber-500/90 hover:bg-amber-500 text-white",
    success: "bg-emerald-500/90 hover:bg-emerald-500 text-white",
    gold: "bg-gradient-to-br from-yellow-400 to-amber-500 hover:opacity-90 text-white",
  };

  return (
    <button
      onClick={onClick}
      className={`${colorMap[color]} rounded-2xl py-3 flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 backdrop-blur-md border border-white/20`}
    >
      {icon}
      <span className="text-[10px] font-bold">{label}</span>
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
        {/* Glass background layers */}
        <div className={`absolute inset-0 bg-gradient-to-b ${bgGradient}`} />
        <div className="absolute inset-0 bg-black/30 backdrop-blur-2xl" />
        <div className="absolute inset-x-0 top-0 h-px bg-white/40" />

        {/* Content */}
        <div className="relative z-10 flex flex-col max-h-[92vh] overflow-y-auto">
          {/* Header */}
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

          {/* Avatar + Name */}
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
              {profile.isAdmin && (
                <span className="text-[10px] font-black bg-red-500 text-white px-2 py-0.5 rounded-full">
                  ADMIN
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

          {/* Stats */}
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

          {/* === VARIANT 1: My Seat — Only 2 buttons === */}
          {isMySeat ? (
            <div className="mx-4 mb-4 grid grid-cols-2 gap-3">
              <IconButton
                icon={<MicOff size={28} />}
                label={isMySeatMuted ? "إلغاء الكتم" : "كتم"}
                color="warning"
                onClick={onMute}
              />
              <IconButton
                icon={<ArrowDown size={28} />}
                label="إنزال"
                color="danger"
                onClick={onRemoveFromSeat}
              />
            </div>
          ) : (
            <>
              {/* === VARIANT 2: Other User — Full Actions === */}
              <div className="mx-4 mb-3 grid grid-cols-3 gap-2">
                <IconButton
                  icon={<Gift size={22} />}
                  label="هدية"
                  color="primary"
                  onClick={onOpenGift}
                />
                <IconButton
                  icon={<MessageCircle size={22} />}
                  label="محادثة"
                  onClick={() => alert("قريباً")}
                />
                <IconButton
                  icon={<UserPlus size={22} />}
                  label="متابعة"
                  onClick={() => alert("قريباً")}
                />
              </div>

              {/* Room actions */}
              {roomId && (
                <div className="mx-4 mb-4 grid grid-cols-2 gap-2">
                  {!isTargetOnMic && (
                    <div className="col-span-2">
                      <IconButton
                        icon={<Mic size={22} />}
                        label="دعوة للمايك"
                        color="success"
                        onClick={onInviteToMic}
                      />
                    </div>
                  )}

                  {canKick && isTargetOnMic && (
                    <IconButton
                      icon={<VolumeX size={22} />}
                      label="كتم"
                      color="warning"
                      onClick={onMute}
                    />
                  )}

                  {canKick && isTargetOnMic && (
                    <IconButton
                      icon={<ArrowDown size={22} />}
                      label="إنزال"
                      color="danger"
                      onClick={onRemoveFromSeat}
                    />
                  )}

                  {canKick && (
                    <div className="col-span-2">
                      <IconButton
                        icon={<Ban size={22} />}
                        label="طرد من الغرفة"
                        color="danger"
                        onClick={onKick}
                      />
                    </div>
                  )}

                  {canPromote && (
                    <div className="col-span-2">
                      <IconButton
                        icon={<Crown size={22} />}
                        label="ترقية إلى مشرف"
                        color="gold"
                        onClick={onPromote}
                      />
                    </div>
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
