import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { X, Gift, MessageCircle, UserPlus, Mic, MicOff, ArrowDown, Ban, Crown, Loader2 } from "lucide-react";

interface Props {
  userId: string;
  roomId?: Id<"rooms">;
  currentUserRole?: "owner" | "moderator" | "speaker" | "listener";
  isCurrentUserOnMic?: boolean;
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

// خلفيات حسب VIP
const VIP_BG: Record<number, string> = {
  0: "from-slate-700 via-slate-800 to-slate-900",
  1: "from-sky-600 via-sky-700 to-sky-900",
  2: "from-emerald-600 via-emerald-700 to-emerald-900",
  3: "from-purple-600 via-purple-700 to-purple-900",
  4: "from-pink-600 via-pink-700 to-pink-900",
  5: "from-red-600 via-red-700 to-red-900",
  6: "from-orange-500 via-orange-600 to-orange-800",
  7: "from-yellow-500 via-amber-600 to-yellow-700",
};

const VIP_LABEL: Record<number, string> = {
  0: "",
  1: "VIP 1",
  2: "VIP 2",
  3: "VIP 3",
  4: "VIP 4",
  5: "VIP 5",
  6: "VIP 6",
  7: "VIP 7",
};

export default function MiniProfileSheet({
  userId,
  roomId,
  currentUserRole,
  isCurrentUserOnMic,
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
        <div className="absolute inset-0 bg-black/70" onClick={onClose} />
        <div className="relative w-full max-w-md mx-auto bg-slate-900 rounded-t-3xl p-8 flex items-center justify-center">
          <Loader2 className="animate-spin text-white" size={32} />
        </div>
      </div>
    );
  }

  if (profile === null) {
    return (
      <div className="fixed inset-0 z-[110] flex items-end" dir="rtl">
        <div className="absolute inset-0 bg-black/70" onClick={onClose} />
        <div className="relative w-full max-w-md mx-auto bg-slate-900 rounded-t-3xl p-8 text-center">
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
  const canInvite = !isTargetOnMic && isCurrentUserOnMic === undefined ? true : !isTargetOnMic;

  return (
    <div className="fixed inset-0 z-[110] flex items-end" dir="rtl">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />

      {/* Sheet */}
      <div className={`relative w-full max-w-md mx-auto bg-gradient-to-b ${bgGradient} rounded-t-3xl max-h-[90vh] overflow-hidden flex flex-col`}>
        {/* Handle + close */}
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/15 backdrop-blur flex items-center justify-center text-white hover:bg-white/25">
            <X size={18} />
          </button>
          {vipLabel && (
            <span className="text-[11px] font-black text-yellow-300 bg-black/30 px-2 py-0.5 rounded-full">
              {vipLabel}
            </span>
          )}
        </div>

        {/* Avatar + Name */}
        <div className="flex flex-col items-center px-4 pb-4">
          <div className="w-24 h-24 rounded-full overflow-hidden ring-4 ring-white/50 shadow-2xl bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-white font-black text-3xl">
            {profile.avatarUrl ? (
              <img src={profile.avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <span>{profile.name[0] || "?"}</span>
            )}
          </div>

          <h3 className="text-white text-lg font-black mt-3 truncate max-w-full">{profile.name}</h3>
          <div className="flex items-center gap-2 mt-1">
            {profile.userNumber !== null && (
              <span className="text-white/70 text-xs">ID:{profile.userNumber}</span>
            )}
            {profile.isAdmin && (
              <span className="text-[10px] font-black bg-red-500 text-white px-2 py-0.5 rounded-full">
                ADMIN
              </span>
            )}
            {profile.banned && (
              <span className="text-[10px] font-black bg-gray-900 text-white px-2 py-0.5 rounded-full">
                BANNED
              </span>
            )}
          </div>

          {profile.bio && (
            <p className="text-white/80 text-xs mt-2 text-center max-w-[90%] line-clamp-2">{profile.bio}</p>
          )}

          {/* Info badges: age, gender, country */}
          <div className="flex items-center gap-2 mt-2">
            {profile.age && (
              <span className="text-[10px] bg-white/20 backdrop-blur text-white px-2 py-0.5 rounded-full">
                {profile.age} سنة
              </span>
            )}
            {profile.gender && (
              <span className="text-[10px] bg-white/20 backdrop-blur text-white px-2 py-0.5 rounded-full">
                {profile.gender === "male" ? "♂ ذكر" : profile.gender === "female" ? "♀ أنثى" : "آخر"}
              </span>
            )}
            {profile.country && (
              <span className="text-[10px] bg-white/20 backdrop-blur text-white px-2 py-0.5 rounded-full">
                {profile.country}
              </span>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="mx-4 mb-3 bg-black/25 backdrop-blur rounded-2xl p-3 grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-yellow-300 text-lg font-black">💎</p>
            <p className="text-white text-xs font-bold">{formatNumber(profile.totalSent)}</p>
            <p className="text-white/60 text-[10px]">ثروة</p>
          </div>
          <div>
            <p className="text-pink-300 text-lg font-black">✨</p>
            <p className="text-white text-xs font-bold">{formatNumber(profile.totalReceived)}</p>
            <p className="text-white/60 text-[10px]">جاذبية</p>
          </div>
          <div>
            <p className="text-red-300 text-lg font-black">❤️</p>
            <p className="text-white text-xs font-bold">{formatNumber(profile.charms)}</p>
            <p className="text-white/60 text-[10px]">شارات</p>
          </div>
        </div>

        {/* Primary actions */}
        <div className="mx-4 mb-3 grid grid-cols-3 gap-2">
          <button
            onClick={onOpenGift}
            className="bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl py-2.5 flex flex-col items-center gap-1 hover:opacity-90 transition"
          >
            <Gift size={18} />
            <span className="text-[10px] font-bold">هدية</span>
          </button>
          <button
            onClick={() => alert("قريباً")}
            className="bg-white/15 backdrop-blur text-white rounded-xl py-2.5 flex flex-col items-center gap-1 hover:bg-white/25 transition"
          >
            <MessageCircle size={18} />
            <span className="text-[10px] font-bold">محادثة</span>
          </button>
          <button
            onClick={() => alert("قريباً")}
            className="bg-white/15 backdrop-blur text-white rounded-xl py-2.5 flex flex-col items-center gap-1 hover:bg-white/25 transition"
          >
            <UserPlus size={18} />
            <span className="text-[10px] font-bold">متابعة</span>
          </button>
        </div>

        {/* Room actions (contextual) */}
        {roomId && (
          <div className="mx-4 mb-4 grid grid-cols-2 gap-2">
            {/* Invite to mic (anyone, if target not on mic) */}
            {!isTargetOnMic && (
              <button
                onClick={onInviteToMic}
                className="bg-emerald-500/90 text-white rounded-xl py-2.5 flex items-center justify-center gap-2 hover:bg-emerald-500 transition col-span-2"
              >
                <Mic size={16} />
                <span className="text-xs font-bold">دعوة للمايك</span>
              </button>
            )}

            {/* Mute (owner + mod, if target on mic) */}
            {canKick && isTargetOnMic && (
              <button
                onClick={onMute}
                className="bg-amber-500/90 text-white rounded-xl py-2.5 flex items-center justify-center gap-2 hover:bg-amber-500 transition"
              >
                <MicOff size={16} />
                <span className="text-xs font-bold">كتم</span>
              </button>
            )}

            {/* Remove from seat (owner + mod, if target on mic) */}
            {canKick && isTargetOnMic && (
              <button
                onClick={onRemoveFromSeat}
                className="bg-orange-600/90 text-white rounded-xl py-2.5 flex items-center justify-center gap-2 hover:bg-orange-600 transition"
              >
                <ArrowDown size={16} />
                <span className="text-xs font-bold">إنزال</span>
              </button>
            )}

            {/* Kick (owner + mod) */}
            {canKick && (
              <button
                onClick={onKick}
                className="bg-red-600/90 text-white rounded-xl py-2.5 flex items-center justify-center gap-2 hover:bg-red-600 transition col-span-2"
              >
                <Ban size={16} />
                <span className="text-xs font-bold">طرد من الغرفة</span>
              </button>
            )}

            {/* Promote (owner only) */}
            {canPromote && (
              <button
                onClick={onPromote}
                className="bg-gradient-to-r from-yellow-400 to-amber-500 text-white rounded-xl py-2.5 flex items-center justify-center gap-2 hover:opacity-90 transition col-span-2"
              >
                <Crown size={16} />
                <span className="text-xs font-bold">ترقية إلى مشرف</span>
              </button>
            )}
          </div>
        )}

        <div className="h-6" />
      </div>
    </div>
  );
}
