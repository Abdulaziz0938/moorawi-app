import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { dialog } from "../lib/dialog";
import {
  X, Gift, MessageCircle, UserPlus, Mic, MicOff, ArrowDown,
  Ban, Crown, Loader2, Shield, Award, ChevronLeft,
} from "lucide-react";
import { UserName } from "./UserBadges";

interface Props {
  userId: string;
  roomId?: Id<"rooms">;
  currentUserRole?: "owner" | "moderator" | "speaker" | "listener";
  isMySeat?: boolean;
  isMySeatMuted?: boolean;
  isTargetOnMic?: boolean;
  onClose: () => void;
  onOpenGift?: () => void;
  onOpenFullProfile?: () => void;
  onKick?: () => void;
  onBan?: () => void;
  onMute?: () => void;
  onRemoveFromSeat?: () => void;
  onPromote?: () => void;
  onDemote?: () => void;
  onInviteToMic?: () => void;
  targetIsMod?: boolean;
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
  onOpenFullProfile,
  onKick,
  onBan,
  onMute,
  onRemoveFromSeat,
  onPromote,
  onDemote,
  onInviteToMic,
  targetIsMod = false,
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
  const canBan = currentUserRole === "owner";
  const canPromoteOrDemote = currentUserRole === "owner";

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

          <div className="flex flex-col items-center px-4 pb-2">
            <button
              onClick={onOpenFullProfile}
              className="w-20 h-20 rounded-full overflow-hidden ring-4 ring-white/40 shadow-2xl bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-white font-black text-2xl active:scale-95 transition-transform cursor-pointer"
            >
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <span>{profile.name[0] || "?"}</span>
              )}
            </button>

            <div className="flex items-center justify-center gap-1.5 mt-2">
              <UserName
                name={profile.name}
                vip={profile.vip}
                adminRole={profile.adminRole}
                roomRole={profile.userNumber === 1 ? "owner" : null}
                size="md"
                nameClassName="text-white"
              />
            </div>

            <div className="flex items-center gap-2 mt-1">
              {profile.userNumber !== null && (
                <span className="text-white/80 text-xs">ID:{profile.userNumber}</span>
              )}
            </div>

            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap justify-center">
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

          {/* [moorawi-poppo] No Title placeholder */}
          <div className="mx-4 mb-2 flex justify-center">
            <span className="text-[10px] bg-white/10 backdrop-blur border border-white/20 text-white/60 px-3 py-1 rounded-full font-bold">
              No Title
            </span>
          </div>

          {/* [moorawi-poppo] وسام row */}
          <div className="mx-4 mb-2.5 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-300 to-slate-500 flex items-center justify-center">
                <Award size={20} className="text-white" />
              </div>
              <div className="flex flex-col">
                <p className="text-white font-black text-base leading-none">+0</p>
                <p className="text-white/60 text-[10px] mt-0.5">وسام</p>
              </div>
            </div>
            <ChevronLeft size={18} className="text-white/40" />
          </div>

          {/* [moorawi-poppo] 3 property cards: مركبة | إطار | هدية */}
          <div className="mx-4 mb-3 grid grid-cols-3 gap-2.5">
            <PropertyCard label="مركبة" value={0} tone="blue" />
            <PropertyCard label="إطار" value={0} tone="emerald" />
            <PropertyCard label="هدية" value={0} tone="purple" />
          </div>

          {isMySeat ? (
            <div className="mx-4 mb-4">
              {/* 3 بطاقات عريضة: هدية | كتم | نزول */}
              <div className="grid grid-cols-3 gap-2.5">
                {/* Gift */}
                <button
                  onClick={onOpenGift}
                  className="rounded-2xl bg-white/10 hover:bg-white/20 backdrop-blur-xl border border-white/25 flex flex-col items-center justify-center gap-2 py-4 active:scale-95 transition"
                >
                  <Gift size={22} className="text-white" />
                  <span className="text-[11px] font-black text-white">هدية</span>
                </button>

                {/* Mute / Unmute */}
                <button
                  disabled={isMySeatMuted}
                  onClick={onMute}
                  className={`rounded-2xl backdrop-blur-xl border flex flex-col items-center justify-center gap-2 py-4 active:scale-95 transition ${
                    isMySeatMuted
                      ? "bg-red-500/20 border-red-400/40 cursor-not-allowed"
                      : "bg-white/10 hover:bg-white/20 border-white/25"
                  }`}
                >
                  {isMySeatMuted ? (
                    <>
                      <MicOff size={22} className="text-red-300" />
                      <span className="text-[11px] font-black text-red-300">مكتوم إدارياً</span>
                    </>
                  ) : (
                    <>
                      <MicOff size={22} className="text-white" />
                      <span className="text-[11px] font-black text-white">كتم</span>
                    </>
                  )}
                </button>

                {/* Step Down */}
                <button
                  onClick={onRemoveFromSeat}
                  className="rounded-2xl bg-white/10 hover:bg-white/20 backdrop-blur-xl border border-white/25 flex flex-col items-center justify-center gap-2 py-4 active:scale-95 transition"
                >
                  <ArrowDown size={22} className="text-white" />
                  <span className="text-[11px] font-black text-white">نزول</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="mx-4 mb-3 flex items-center justify-center gap-4">
                <IconCircle icon={<Gift size={22} />} size={54} onClick={onOpenGift} />
                <IconCircle icon={<MessageCircle size={22} />} size={54} onClick={() => dialog.alert("قريباً")} />
                <IconCircle icon={<UserPlus size={22} />} size={54} onClick={() => dialog.alert("قريباً")} />
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

                  {canPromoteOrDemote && !targetIsMod && (
                    <IconCircle icon={<Crown size={20} />} size={50} onClick={onPromote} />
                  )}
                  {canPromoteOrDemote && targetIsMod && (
                    <IconCircle icon={<Shield size={20} />} size={50} onClick={onDemote} />
                  )}
                  {canBan && (
                    <IconCircle icon={<Ban size={20} />} size={50} onClick={onBan} />
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

// ============ Poppo-style property card ============
function PropertyCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "blue" | "emerald" | "purple";
}) {
  const toneMap = {
    blue:    { bg: "from-blue-900/40 to-blue-950/60",        border: "border-blue-500/30",    text: "text-blue-200"    },
    emerald: { bg: "from-emerald-900/40 to-emerald-950/60",  border: "border-emerald-500/30", text: "text-emerald-200" },
    purple:  { bg: "from-purple-900/40 to-purple-950/60",    border: "border-purple-500/30",  text: "text-purple-200"  },
  }[tone];

  return (
    <div
      className={`rounded-2xl border ${toneMap.border} bg-gradient-to-br ${toneMap.bg} backdrop-blur-xl p-2 flex flex-col items-center justify-center gap-0.5 aspect-[5/4]`}
    >
      <p className={`${toneMap.text} text-base font-black leading-none`}>{value}</p>
      <p className="text-white/60 text-[10px] leading-none mt-1">{label}</p>
    </div>
  );
}

