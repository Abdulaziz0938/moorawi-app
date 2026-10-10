import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { getActiveToken } from "../lib/session";
import { dialog } from "../lib/dialog";
import StaffSettingsSheet from "./StaffSettingsSheet";
import {
  X, ChevronLeft, Loader2, Home, Shield, User as UserIcon,
  Bell, Eye, Heart, Gift, Award, Settings, Crown, Trophy,
} from "lucide-react";

interface Props {
  roomId: Id<"rooms">;
  onClose: () => void;
  onUserClick?: (userId: string) => void;
  onOpenStaffSettings?: () => void;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(2) + "K";
  return n.toString();
}

export default function RoomInfoSheet({ roomId, onClose, onUserClick, onOpenStaffSettings }: Props) {
  const token = getActiveToken();
  const room = useQuery(api.rooms.get, { roomId });
  const members = useQuery(api.rooms.members, { roomId });
  const me = useQuery(api.auth.me, { tokenOverride: token });
  const rewardStatus = useQuery(api.rewards.getWeeklyRewardStatus, { roomId });
  const claimReward = useMutation(api.rewards.claimWeeklyReward);
  const [claiming, setClaiming] = useState(false);
  const [showStaff, setShowStaff] = useState(false);

  if (!room || members === undefined) {
    return (
      <div className="fixed inset-0 z-[100] flex items-end justify-center" dir="rtl" onClick={onClose}>
        <div className="absolute inset-0 bg-black/60" />
        <div className="relative w-full max-w-md bg-slate-900 rounded-t-3xl h-[70dvh] flex items-center justify-center">
          <Loader2 size={32} className="animate-spin text-white/50" />
        </div>
      </div>
    );
  }

  const owner = members.find((m: any) => m.role === "owner");
  const mods = members.filter((m: any) => m.role === "moderator");
  const isOwnerOrMod = me && (owner?.userId === me._id || mods.some((m: any) => m.userId === me._id));
  const isOwner = me && owner?.userId === me._id;

  const handleClaimReward = async () => {
    setClaiming(true);
    try {
      const res = await claimReward({ roomId, tokenOverride: token });
      dialog.alert(`تم استلام ${res.coinsAwarded.toLocaleString()} عملة + VIP${res.vipLevel} × ${res.vipCount} أعضاء`);
    } catch (e: any) {
      dialog.alert(e?.message || "فشل الاستلام");
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center" dir="rtl" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md bg-gradient-to-b from-slate-900 to-black rounded-t-3xl max-h-[85dvh] flex flex-col overflow-hidden border-t border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ===== Header ===== */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
              <Home size={18} className="text-white" />
            </div>
            <h2 className="text-white text-lg font-black">بطاقة الغرفة</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 text-white">
            <X size={20} />
          </button>
        </div>

        {/* ===== Body ===== */}
        <div className="flex-1 overflow-y-auto">
          {/* Room Header */}
          <div className="px-4 py-5 flex flex-col items-center text-center">
            {/* Shield badge */}
            <div className="relative mb-3">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center shadow-2xl">
                <Award size={36} className="text-white" />
              </div>
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-emerald-500 text-[9px] font-black text-white whitespace-nowrap">
                Lv.0
              </div>
            </div>

            {/* Room name + ID */}
            <h3 className="text-white text-xl font-black">{room.name}</h3>
            <p className="text-white/50 text-xs mt-1" dir="ltr">
              ID:{room._id.slice(-8)} • {room.memberCount} عضو
            </p>
          </div>

          {/* Stats (3) */}
          <div className="mx-4 mb-4 rounded-2xl bg-white/5 border border-white/10 grid grid-cols-3">
            <StatBox icon={Heart} label="المعجبين" value={0} color="text-pink-300" />
            <StatBox icon={Eye} label="الزوار" value={room.memberCount ?? 0} color="text-blue-300" />
            <StatBox icon={Gift} label="إجمالي الهدايا" value={0} color="text-amber-300" />
          </div>

          {/* Actions row */}
          <div className="mx-4 mb-4 grid grid-cols-2 gap-2">
            {isOwnerOrMod && (
              <button
                onClick={() => {
                  if (onOpenStaffSettings) onOpenStaffSettings();
                  else setShowStaff(true);
                }}
                className="rounded-2xl bg-gradient-to-r from-indigo-500/30 to-purple-500/30 border border-indigo-400/40 p-3 flex items-center justify-center gap-2 active:scale-95 transition"
              >
                <Shield size={16} className="text-indigo-300" />
                <span className="text-white text-xs font-black">أدمن الغرفة</span>
              </button>
            )}
            <button
              onClick={() => dialog.alert("الإشعارات — قريباً")}
              className="rounded-2xl bg-white/5 border border-white/15 p-3 flex items-center justify-center gap-2 active:scale-95 transition"
            >
              <Bell size={16} className="text-white/70" />
              <span className="text-white text-xs font-black">إشعار</span>
            </button>
          </div>

          {/* [moorawi-trophy] Reward Card (owner only) */}
          {isOwner && rewardStatus && (
            <div className="mx-4 mb-4">
              <div className="rounded-2xl bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-amber-500/20 border border-amber-400/40 p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Trophy size={18} className="text-amber-300" />
                    <p className="text-white text-xs font-black">مكافأة الأسبوع</p>
                  </div>
                  <span className="text-amber-200 text-[10px] font-black tabular-nums" dir="ltr">
                    {formatNumber(rewardStatus.total)} 🪙
                  </span>
                </div>

                {rewardStatus.tier === 0 ? (
                  <p className="text-white/60 text-[10px] text-center py-2">
                    اجمع 1M على الأقل هذا الأسبوع للحصول على مكافأة
                  </p>
                ) : rewardStatus.claimed ? (
                  <div className="text-center py-2">
                    <p className="text-emerald-300 text-xs font-black">✅ تم استلام مكافأة هذا الأسبوع</p>
                    <p className="text-white/50 text-[10px] mt-1">
                      المستوى {rewardStatus.claimRecord?.tier ?? 0}M • {formatNumber(rewardStatus.claimRecord?.coinsAwarded ?? 0)} عملة
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-around text-center py-2 border-t border-white/10">
                      <div>
                        <p className="text-white text-sm font-black tabular-nums" dir="ltr">
                          {formatNumber(rewardStatus.rewardInfo?.coins ?? 0)}
                        </p>
                        <p className="text-white/50 text-[9px]">عملة</p>
                      </div>
                      <div>
                        <p className="text-white text-sm font-black">VIP{rewardStatus.rewardInfo?.vip}</p>
                        <p className="text-white/50 text-[9px]">المستوى</p>
                      </div>
                      <div>
                        <p className="text-white text-sm font-black">{rewardStatus.rewardInfo?.vipCount}</p>
                        <p className="text-white/50 text-[9px]">أعضاء</p>
                      </div>
                    </div>
                    <button
                      onClick={handleClaimReward}
                      disabled={claiming}
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 text-white text-xs font-black shadow-lg active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
                    >
                      {claiming ? <Loader2 size={14} className="animate-spin" /> : <Trophy size={14} />}
                      استلام مكافأة {rewardStatus.tier}M
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Staff List */}
          <div className="px-4 pb-4">
            <h4 className="text-white/60 text-xs font-black mb-2">مسؤولو الغرفة ({1 + mods.length})</h4>
            <div className="space-y-2">
              {/* Owner */}
              {owner && (
                <StaffRow
                  user={owner}
                  role="owner"
                  onClick={() => onUserClick?.(owner.userId)}
                />
              )}
              {/* Mods */}
              {mods.map((m: any) => (
                <StaffRow
                  key={m._id}
                  user={m}
                  role="moderator"
                  onClick={() => onUserClick?.(m.userId)}
                />
              ))}
            </div>
          </div>

          <div className="h-4" />
        </div>
      </div>

      {/* Staff Settings Sheet — wrapped to prevent closing parent */}
      {showStaff && (
        <div onClick={(e) => e.stopPropagation()}>
          <StaffSettingsSheet roomId={roomId} onClose={() => setShowStaff(false)} />
        </div>
      )}
    </div>
  );
}

// ============ Stat Box ============
function StatBox({ icon: Icon, label, value, color }: any) {
  return (
    <div className="flex flex-col items-center gap-1 py-3">
      <Icon size={16} className={color} />
      <p className="text-white text-base font-black tabular-nums" dir="ltr">
        {typeof value === "number" ? formatNumber(value) : value}
      </p>
      <p className="text-white/50 text-[10px]">{label}</p>
    </div>
  );
}

// ============ Staff Row ============
function StaffRow({ user, role, onClick }: { user: any; role: "owner" | "moderator"; onClick?: () => void }) {
  const roleLabel = role === "owner" ? "صاحب" : "المشرف";
  const roleIcon = role === "owner" ? Home : Shield;
  const roleColor = role === "owner" ? "text-amber-400" : "text-sky-400";
  const RoleIcon = roleIcon;

  return (
    <button
      onClick={onClick}
      className="w-full rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 p-2 flex items-center gap-3 active:scale-[0.98] transition"
    >
      <div className="w-10 h-10 rounded-full overflow-hidden bg-white/10 flex items-center justify-center flex-shrink-0">
        {true ? (
          <img src={user.avatarUrl || "/avatar.png"} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="text-white text-sm font-black">{user.name?.[0] || "?"}</span>
        )}
      </div>
      <div className="flex-1 min-w-0 text-right">
        <p className="text-white text-xs font-bold truncate">{user.name || "—"}</p>
        <p className="text-white/40 text-[10px]" dir="ltr">ID:{user.userNumber ?? "—"}</p>
      </div>
      <div className={`flex items-center gap-1 px-2 py-1 rounded-full bg-white/10 ${roleColor}`}>
        <RoleIcon size={11} />
        <span className="text-[10px] font-black">{roleLabel}</span>
      </div>
    </button>
  );
}
