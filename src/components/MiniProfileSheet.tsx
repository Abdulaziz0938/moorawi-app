import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { getActiveToken } from "../lib/session";
import { useAssets, useAssetsFull } from "../lib/assets";
import type { Id } from "../../convex/_generated/dataModel";
import { dialog } from "../lib/dialog";
import {
  Gift, MessageCircle, UserPlus, Mic, MicOff, ArrowDown,
  Ban, Crown, Loader2, Shield, Copy, Check, Car, Frame,
  ChevronLeft, MoreVertical,
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

export default function MiniProfileSheet({
  userId, roomId, currentUserRole,
  isMySeat, isMySeatMuted, isTargetOnMic,
  onClose, onOpenGift, onOpenFullProfile, onOpenChat, onFollowToggle,
  onKick, onBan, onMute, onRemoveFromSeat,
  onPromote, onDemote, onInviteToMic,
  targetIsMod = false,
}: Props) {
  const profile = useQuery(api.profileFull.getFull, { userId: userId as Id<"users"> });
  const itemCounts = useQuery(api.shop.countUserItems, { userId: userId as Id<"users"> });
  const recordVisit = useMutation(api.visits.record);
  useEffect(() => {
    if (userId) {
      recordVisit({
        visitedUserId: userId as Id<"users">,
        source: "profile",
        tokenOverride: getActiveToken() ?? undefined,
      }).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);
  const [copied, setCopied] = useState(false);
  const [showAllMedals, setShowAllMedals] = useState(false);
  const [showMore, setShowMore] = useState(false);
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
        </div>
      </div>
    );
  }

  const vipLevel = profile.vip ?? 0;
  const bgGradient = VIP_BG[vipLevel] || VIP_BG[0];
  const charm = profile.totalReceived ?? 0;
  const wealth = profile.totalSent ?? 0;
  const medals = (profile as any).medals ?? [];
  const medalCount = (profile as any).stats?.medals ?? medals.length;
  const equippedVipLvl = (profile as any).equippedVipFrameLevel ?? null;
  const vipFrameData = equippedVipLvl ? assetsFull[`vip.frame.${equippedVipLvl}`] : null;
  const vipBgUrl = vipLevel > 0 ? assets[`vip.background.${vipLevel}`] : null;
  const vipCardUrl = vipLevel > 0 ? assets[`vip.card.${vipLevel}`] : null;
  console.log("[MiniProfile] vipLevel:", vipLevel, "| cardUrl:", vipCardUrl, "| keys with card:", Object.keys(assets).filter(k => k.includes("card")));

  // [ezo-gem] ألوان الجواهر لكل VIP
  const GEM_COLORS: Record<number, { primary: string; secondary: string; glow: string }> = {
    1: { primary: "#10b981", secondary: "#34d399", glow: "rgba(16,185,129,0.7)" },
    2: { primary: "#3b82f6", secondary: "#60a5fa", glow: "rgba(59,130,246,0.7)" },
    3: { primary: "#a855f7", secondary: "#c084fc", glow: "rgba(168,85,247,0.75)" },
    4: { primary: "#dc2626", secondary: "#f87171", glow: "rgba(220,38,38,0.75)" },
    5: { primary: "#eab308", secondary: "#facc15", glow: "rgba(234,179,8,0.8)" },
    6: { primary: "#f97316", secondary: "#fb923c", glow: "rgba(249,115,22,0.85)" },
    7: { primary: "#fbbf24", secondary: "#fde047", glow: "rgba(251,191,36,0.9)" },
  };
  const gem = vipLevel > 0 ? GEM_COLORS[vipLevel] : null;

  const canKick = currentUserRole === "owner" || currentUserRole === "moderator";
  const canBan = currentUserRole === "owner";
  const canPromoteOrDemote = currentUserRole === "owner";

  const giftTotal =
    ((profile as any).giftStats?.sent?.count ?? 0) +
    ((profile as any).giftStats?.received?.count ?? 0);

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

      <div className="relative w-full max-w-md mx-auto">
        {/* Avatar straddling top edge */}
        <div className="absolute -top-11 right-4 z-30">
          <button
            onClick={onOpenFullProfile}
            className="active:scale-95 transition-transform"
          >
            <VipAvatar
              src={profile?.avatarUrl}
              name={profile?.name ?? "?"}
              size={88}
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
        </div>

                {/* Sheet */}
        <div className="relative rounded-t-3xl max-h-[92vh] overflow-hidden flex flex-col">
          {/* [ezo-card] VIP card as base (fallback: bg → gradient) */}
          {vipCardUrl ? (
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `url(${vipCardUrl})`,
                backgroundSize: "100% 100%",
                backgroundRepeat: "no-repeat",
              }}
            />
          ) : vipBgUrl ? (
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${vipBgUrl})` }}
            />
          ) : (
            <div className={`absolute inset-0 bg-gradient-to-b ${bgGradient}`} />
          )}
          {/* subtle darkening only when card used (card has dark center) */}
          {!vipCardUrl && <div className="absolute inset-0 bg-black/55" />}


          <div className="relative z-10 flex flex-col max-h-[92vh] overflow-y-auto px-5 pb-4">
            {/* Name + ID — right-aligned */}
            <div className="px-4 pt-12 pb-2 flex flex-col items-start">
              <UserName
                name={profile.name ?? "ضيف"}
                adminRole={profile.adminRole}
                roomRole={profile.userNumber === 1 ? "owner" : null}
                size="md"
                nameClassName="text-white text-lg"
                showCapsules={false}
              />

              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                {profile.userNumber !== null && (
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1 bg-white/15 backdrop-blur border border-white/25 text-white text-[11px] px-2.5 py-1 rounded-full hover:bg-white/25 transition active:scale-95"
                    dir="ltr"
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

            {/* Badges row — LEFT aligned */}
            <div className="flex items-center justify-start gap-1.5 px-4 mt-3 flex-wrap">
              {charm > 0 && <LevelBadge kind="charm" level={levelFromValue(charm)} size="sm" />}
              {wealth > 0 && <LevelBadge kind="wealth" level={levelFromValue(wealth)} size="sm" />}
              {vipLevel > 0 && (
                <div className="badge-glow">
                  <img
                    src={assets[`vip.logo.${vipLevel}`] ?? ""}
                    alt={`VIP ${vipLevel}`}
                    className="h-6 w-auto object-contain"
                    draggable={false}
                  />
                </div>
              )}
            </div>

            {/* Medals bar — clickable to expand */}
            <button
              onClick={() => setShowAllMedals((v) => !v)}
              className="mx-4 mt-3 flex items-center justify-between gap-2 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl px-3 py-2.5 hover:bg-white/15 transition active:scale-[0.99]"
            >
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-white/70 text-xs font-black">
                  +{medalCount} وسام
                </span>
                <ChevronLeft
                  size={14}
                  className={`text-white/50 transition-transform ${showAllMedals ? "rotate-90" : ""}`}
                />
              </div>
              <div className="flex-1 flex justify-end overflow-hidden">
                {medals.length > 0 ? (
                  <MedalsRow
                    medals={showAllMedals ? medals : medals.slice(0, 6)}
                    max={showAllMedals ? 30 : 6}
                    size="xs"
                  />
                ) : (
                  <span className="text-white/40 text-[10px]">لا توجد أوسمة</span>
                )}
              </div>
            </button>

            {/* Property cards — horizontal rectangles */}
            <div className="mx-4 mt-3 grid grid-cols-3 gap-2">
              <PropertyBar label="هدية" value={giftTotal} tone="purple" />
              <PropertyBar label="إطار" value={itemCounts?.frame ?? 0} tone="emerald" />
              <PropertyBar label="مركبة" value={itemCounts?.vehicle ?? 0} tone="blue" />
            </div>

            {/* Bottom actions — one full bar */}
            {isMySeat ? (
              <div className="mx-4 mt-4 mb-4 h-14 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 flex items-stretch divide-x divide-white/10 rtl:divide-x-reverse overflow-hidden">
                <ActionBtn icon={<Gift size={22} />} onClick={onOpenGift} />
                <ActionBtn
                  icon={isMySeatMuted ? <MicOff size={22} className="text-red-300" /> : <MicOff size={22} />}
                  onClick={onMute}
                  disabled={isMySeatMuted}
                />
                <ActionBtn icon={<ArrowDown size={22} />} onClick={onRemoveFromSeat} />
              </div>
            ) : (
              <div className="mx-4 mt-4 mb-4 h-14 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 flex items-stretch divide-x divide-white/10 rtl:divide-x-reverse overflow-hidden">
                <ActionBtn icon={<Gift size={22} />} onClick={onOpenGift} />
                <ActionBtn
                  icon={<MessageCircle size={22} />}
                  onClick={onOpenChat ?? (() => dialog.alert("قريباً"))}
                />
                <ActionBtn
                  icon={<UserPlus size={22} />}
                  onClick={onFollowToggle ?? (() => dialog.alert("قريباً"))}
                />
                {roomId && !isTargetOnMic && (
                  <ActionBtn icon={<Mic size={22} />} onClick={onInviteToMic} />
                )}
                {(canKick || canBan || canPromoteOrDemote) && (
                  <ActionBtn
                    icon={<MoreVertical size={22} />}
                    onClick={() => setShowMore((v) => !v)}
                  />
                )}
              </div>
            )}

            {/* More actions drawer (kicks, bans, promotions) */}
            {showMore && roomId && (
              <div className="mx-4 mb-4 p-2 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center gap-2 flex-wrap">
                {canKick && isTargetOnMic && (
                  <SmallAction icon={<MicOff size={18} />} label="كتم" onClick={onMute} />
                )}
                {canKick && isTargetOnMic && (
                  <SmallAction icon={<ArrowDown size={18} />} label="نزول" onClick={onRemoveFromSeat} />
                )}
                {canKick && (
                  <SmallAction icon={<Ban size={18} />} label="طرد" onClick={onKick} tone="danger" />
                )}
                {canPromoteOrDemote && !targetIsMod && (
                  <SmallAction icon={<Crown size={18} />} label="ترقية" onClick={onPromote} />
                )}
                {canPromoteOrDemote && targetIsMod && (
                  <SmallAction icon={<Shield size={18} />} label="تخفيض" onClick={onDemote} />
                )}
                {canBan && (
                  <SmallAction icon={<Ban size={18} />} label="حظر" onClick={onBan} tone="danger" />
                )}
              </div>
            )}

            <div className="h-6" />
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionBtn({
  icon, onClick, disabled,
}: {
  icon: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex-1 flex items-center justify-center text-white transition active:bg-white/10 disabled:opacity-40 ${
        disabled ? "cursor-not-allowed" : "hover:bg-white/5"
      }`}
    >
      {icon}
    </button>
  );
}

function SmallAction({
  icon, label, onClick, tone = "default",
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  tone?: "default" | "danger";
}) {
  const cls = tone === "danger"
    ? "bg-red-500/20 border-red-400/40 text-red-200 hover:bg-red-500/30"
    : "bg-white/10 border-white/20 text-white hover:bg-white/20";
  return (
    <button
      onClick={onClick}
      className={`px-3 py-2 rounded-xl border backdrop-blur-xl text-[11px] font-black flex items-center gap-1.5 active:scale-95 transition ${cls}`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function PropertyBar({
  label, value, tone,
}: {
  label: string;
  value: number;
  tone: "blue" | "emerald" | "purple";
}) {
  const t = {
    blue: { bg: "from-blue-900/40 to-blue-950/60", border: "border-blue-500/30", text: "text-blue-200" },
    emerald: { bg: "from-emerald-900/40 to-emerald-950/60", border: "border-emerald-500/30", text: "text-emerald-200" },
    purple: { bg: "from-purple-900/40 to-purple-950/60", border: "border-purple-500/30", text: "text-purple-200" },
  }[tone];
  return (
    <div className={`h-14 rounded-2xl border ${t.border} bg-gradient-to-br ${t.bg} backdrop-blur-xl px-3 flex items-center justify-between gap-1`}>
      <span className={`${t.text} text-xs font-black shrink-0`}>{label}</span>
      <span className={`${t.text} text-base font-black tabular-nums shrink-0`}>
        {formatNumber(value)}
      </span>
    </div>
  );
}
