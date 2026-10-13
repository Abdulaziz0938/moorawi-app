import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAssets, useAssetsFull } from "../lib/assets";
import type { Id } from "../../convex/_generated/dataModel";
import { dialog } from "../lib/dialog";
import {
  X, Gift, MessageCircle, UserPlus, Mic, MicOff, ArrowDown,
  Ban, Crown, Loader2, Shield, Copy, Check, Home, Radio,
} from "lucide-react";
import { UserName } from "./UserBadges";
import LevelBadge from "./LevelBadge";
import MedalsRow from "./MedalsRow";
import { levelFromValue } from "../lib/levels";
import VipAvatar from "./ui/VipAvatar";

interface Props {
  userId: string;
  roomId?: Id<"rooms">;
  currentUserRole?: "owner" | "moderator" | "speaker" | "listener";
  isMySeat?: boolean;
  isMySeatMuted?: boolean;
  isTargetOnMic?: boolean;
  onClose: () => void;
  onOpenGift?: () => void;
  onOpenChat?: () => void;
  onFollowToggle?: () => void;
  isFollowing?: boolean;
  onOpenFullProfile?: () => void;
  onEnterRoom?: (roomId: any) => void;
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
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + "B";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(2) + "K";
  return n.toString();
}

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

function IconCircle({
  icon, onClick, tone = "default", size = 52,
}: {
  icon: React.ReactNode;
  onClick?: () => void;
  tone?: "default" | "danger";
  size?: number;
}) {
  const base = "rounded-full flex items-center justify-center transition-all active:scale-90 backdrop-blur-xl border shadow-lg";
  const cls = tone === "danger"
    ? "bg-red-500/20 hover:bg-red-500/30 border-red-400/40 text-red-200"
    : "bg-white/10 hover:bg-white/20 border-white/25 text-white";
  return (
    <button onClick={onClick} className={`${base} ${cls}`} style={{ width: `${size}px`, height: `${size}px` }}>
      {icon}
    </button>
  );
}

export default function MiniProfileSheet({
  userId, roomId, currentUserRole,
  isMySeat, isMySeatMuted, isTargetOnMic,
  onClose, onOpenGift, onOpenFullProfile, onOpenChat, onFollowToggle, isFollowing, onEnterRoom,
  onKick, onBan, onMute, onRemoveFromSeat,
  onPromote, onDemote, onInviteToMic,
  targetIsMod = false,
}: Props) {
  const profile = useQuery(api.profileFull.getFull, { userId: userId as Id<"users"> });
  const [copied, setCopied] = useState(false);
  const assets = useAssets();
  const assetsFull = useAssetsFull();

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

  const vipLevel = profile.vip ?? 0;
  const bgGradient = VIP_BG[vipLevel] || VIP_BG[0];
  const charm = profile.totalReceived ?? 0;
  const wealth = profile.totalSent ?? 0;
  const stats = profile.stats ?? { visitors: 0, fans: 0, followers: 0 };
  const medals = (profile as any).medals ?? [];
  const equippedVipLvl = (profile as any).equippedVipFrameLevel ?? null;
  const vipFrameData = equippedVipLvl ? assetsFull[`vip.frame.${equippedVipLvl}`] : null;

  const canKick = currentUserRole === "owner" || currentUserRole === "moderator";
  const canBan = currentUserRole === "owner";
  const canPromoteOrDemote = currentUserRole === "owner";

  const handleCopy = async () => {
    if (!profile.userNumber) return;
    try {
      await navigator.clipboard.writeText(String(profile.userNumber));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = String(profile.userNumber);
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-end" dir="rtl">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md mx-auto rounded-t-3xl max-h-[92vh] overflow-hidden flex flex-col">
        <div className={`absolute inset-0 bg-gradient-to-b ${bgGradient}`} />
        <div className="absolute inset-0 bg-black/30 backdrop-blur-2xl" />
        <div className="absolute inset-x-0 top-0 h-px bg-white/40" />

        <div className="relative z-10 flex flex-col max-h-[92vh] overflow-y-auto">
          {/* ============ Header row (Close + VIP badge) ============ */}
          <div className="flex items-center justify-between px-4 pt-3 pb-2">
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/15 backdrop-blur border border-white/20 flex items-center justify-center text-white hover:bg-white/25 transition"
            >
              <X size={18} />
            </button>
            {vipLevel > 0 && (
              <span className="text-[11px] font-black text-yellow-300 bg-black/30 backdrop-blur px-3 py-1 rounded-full border border-yellow-300/30">
                VIP {vipLevel}
              </span>
            )}
          </div>

          {/* ============ Avatar + Info ============ */}
          <div className="relative">
            {/* Avatar + Name block — right-aligned */}
            <div className="px-4 pt-2 flex flex-col items-start relative z-10">
              <button
                onClick={onOpenFullProfile}
                className="active:scale-95 transition-transform"
              >
                <VipAvatar
                  src={profile?.avatarUrl}
                  name={profile?.name ?? "?"}
                  size={84}
                  vip={vipLevel}
                  ring={vipLevel === 0}
                  customFrameUrl={vipFrameData?.url ?? null}
                  canvasSize={vipFrameData?.canvasSize ?? null}
                  holeSize={vipFrameData?.holeSize ?? null}
                  offsetX={vipFrameData?.offsetX ?? 0}
                  offsetY={vipFrameData?.offsetY ?? 0}
                  assetType={vipFrameData?.assetType ?? null}
                />
              </button>

              {/* Name */}
              <div className="mt-2 flex items-center gap-2">
                <UserName
                  name={profile.name ?? "ضيف"}
                  adminRole={profile.adminRole}
                  roomRole={profile.userNumber === 1 ? "owner" : null}
                  size="md"
                  nameClassName="text-white text-lg"
                  showCapsules={false}
                />
              </div>

              {/* ID + chips */}
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                {profile.userNumber !== null && (
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1 bg-white/15 backdrop-blur border border-white/25 text-white text-[11px] px-2.5 py-1 rounded-full hover:bg-white/25 transition active:scale-95"
                    dir="ltr"
                    title="نسخ المعرف"
                  >
                    <span>ID:{profile.userNumber}</span>
                    {copied ? <Check size={11} className="text-green-300" /> : <Copy size={11} className="opacity-70" />}
                  </button>
                )}
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
          </div>

          {/* ============ Charm + Wealth + VIP banner ============ */}
          <div className="flex items-center justify-end gap-2 px-4 mt-3 flex-wrap">
            {vipLevel > 0 && (
              <div className="badge-glow">
                <img src={assets[`vip.logo.${vipLevel}`] ?? ""} alt={`VIP ${vipLevel}`} className="h-6 w-auto object-contain" draggable={false} />
              </div>
            )}
            {charm > 0 && (
              <LevelBadge kind="charm" level={levelFromValue(charm)} size="sm" />
            )}
            {wealth > 0 && (
              <LevelBadge kind="wealth" level={levelFromValue(wealth)} size="sm" />
            )}
          </div>

          {/* ============ Bio ============ */}
          {profile.bio && (
            <p className="text-white/85 text-xs text-center px-6 mt-3 leading-relaxed">{profile.bio}</p>
          )}

          {/* ============ Stats (3) ============ */}
          <div className="mx-4 mt-4 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl grid grid-cols-3">
            <StatBox label="المتابعين" value={stats.followers} />
            <StatBox label="المعجبين" value={stats.fans} />
            <StatBox label="الزوار" value={stats.visitors} />
          </div>

          {/* ============ Medals ============ */}
          {medals.length > 0 && (
            <div className="mx-4 mt-3 flex justify-center">
              <MedalsRow medals={medals} max={10} size="xs" />
            </div>
          )}

          {/* ============ Property cards ============ */}
          <div className="mx-4 mt-3 grid grid-cols-3 gap-2.5">
            <PropertyCard label="هدية" value={0} tone="purple" />
            <PropertyCard label="إطار" value={0} tone="emerald" />
            <PropertyCard label="مركبة" value={0} tone="blue" />
          </div>

          {/* ============ Actions ============ */}
          {isMySeat ? (
            <div className="mx-4 mt-4 mb-4">
              <div className="grid grid-cols-3 gap-2.5">
                <button onClick={onOpenGift} className="rounded-2xl bg-white/10 hover:bg-white/20 backdrop-blur-xl border border-white/25 flex flex-col items-center justify-center gap-2 py-4 active:scale-95 transition">
                  <Gift size={22} className="text-white" />
                  <span className="text-[11px] font-black text-white">هدية</span>
                </button>
                <button
                  disabled={isMySeatMuted}
                  onClick={onMute}
                  className={`rounded-2xl backdrop-blur-xl border flex flex-col items-center justify-center gap-2 py-4 active:scale-95 transition ${
                    isMySeatMuted ? "bg-red-500/20 border-red-400/40 cursor-not-allowed" : "bg-white/10 hover:bg-white/20 border-white/25"
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
                <button onClick={onRemoveFromSeat} className="rounded-2xl bg-white/10 hover:bg-white/20 backdrop-blur-xl border border-white/25 flex flex-col items-center justify-center gap-2 py-4 active:scale-95 transition">
                  <ArrowDown size={22} className="text-white" />
                  <span className="text-[11px] font-black text-white">نزول</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="mx-4 mt-4 mb-3 flex items-center justify-center gap-4">
                <IconCircle icon={<Gift size={22} />} size={54} onClick={onOpenGift} />
                <IconCircle icon={<MessageCircle size={22} />} size={54} onClick={onOpenChat ?? (() => dialog.alert("قريباً"))} />
                <IconCircle icon={<UserPlus size={22} />} size={54} onClick={onFollowToggle ?? (() => dialog.alert("قريباً"))} />
              </div>

              {roomId && (
                <div className="mx-4 mb-4 flex items-center justify-center gap-3 flex-wrap">
                  {!isTargetOnMic && <IconCircle icon={<Mic size={20} />} size={50} onClick={onInviteToMic} />}
                  {canKick && isTargetOnMic && <IconCircle icon={<MicOff size={20} />} size={50} onClick={onMute} />}
                  {canKick && isTargetOnMic && <IconCircle icon={<ArrowDown size={20} />} size={50} onClick={onRemoveFromSeat} />}
                  {canKick && <IconCircle icon={<Ban size={20} />} size={50} onClick={onKick} tone="danger" />}
                  {canPromoteOrDemote && !targetIsMod && <IconCircle icon={<Crown size={20} />} size={50} onClick={onPromote} />}
                  {canPromoteOrDemote && targetIsMod && <IconCircle icon={<Shield size={20} />} size={50} onClick={onDemote} />}
                  {canBan && <IconCircle icon={<Ban size={20} />} size={50} onClick={onBan} tone="danger" />}
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

function StatBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-center gap-0.5 py-3">
      <p className="text-white text-base font-black tabular-nums" dir="ltr">{formatNumber(value)}</p>
      <p className="text-white/60 text-[10px]">{label}</p>
    </div>
  );
}

function PropertyCard({ label, value, tone }: { label: string; value: number; tone: "blue" | "emerald" | "purple" }) {
  const toneMap = {
    blue:    { bg: "from-blue-900/40 to-blue-950/60",       border: "border-blue-500/30",    text: "text-blue-200" },
    emerald: { bg: "from-emerald-900/40 to-emerald-950/60", border: "border-emerald-500/30", text: "text-emerald-200" },
    purple:  { bg: "from-purple-900/40 to-purple-950/60",   border: "border-purple-500/30",  text: "text-purple-200" },
  }[tone];
  return (
    <div className={`rounded-2xl border ${toneMap.border} bg-gradient-to-br ${toneMap.bg} backdrop-blur-xl p-2 flex flex-col items-center justify-center gap-0.5 aspect-[5/4]`}>
      <p className={`${toneMap.text} text-base font-black leading-none tabular-nums`}>{formatNumber(value)}</p>
      <p className="text-white/60 text-[10px] leading-none mt-1">{label}</p>
    </div>
  );
}
