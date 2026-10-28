import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { getActiveToken } from "../lib/session";
import { useReactiveAssets } from "../lib/assets";
import type { Id } from "../../convex/_generated/dataModel";
import { dialog } from "../lib/dialog";
import {
  AlertTriangle, Gift, MessageCircle, UserPlus, Mic, MicOff, ArrowDown,
  Ban, Crown, Loader2, Shield, Copy, Check, ChevronLeft, MoreVertical,
} from "lucide-react";
import { UserName } from "./UserBadges";
import LevelBadge from "./LevelBadge";
import MedalsRow from "./MedalsRow";
import { levelFromValue } from "../lib/levels";
import VipAvatar from "./ui/VipAvatar";
import VipTopOrnament from "./ui/VipTopOrnament";
import ReportSheet from "./ReportSheet";
import ProfileActionsSheet from "./ProfileActionsSheet";

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
  onMention?: (name: string) => void;
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
  0: "from-slate-900 via-slate-800 to-slate-900",
  1: "from-sky-900 via-sky-800 to-slate-900",
  2: "from-emerald-900 via-emerald-800 to-slate-900",
  3: "from-purple-900 via-purple-800 to-slate-900",
  4: "from-pink-900 via-pink-800 to-slate-900",
  5: "from-red-900 via-red-800 to-slate-900",
  6: "from-orange-900 via-orange-800 to-slate-900",
  7: "from-yellow-900 via-amber-800 to-slate-900",
};

export default function MiniProfileSheet({
  userId, roomId, currentUserRole,
  isMySeat, isMySeatMuted, isTargetOnMic,
  onClose, onOpenGift, onOpenFullProfile, onOpenChat, onFollowToggle, onMention,
  onKick, onBan, onMute, onRemoveFromSeat,
  onPromote, onDemote, onInviteToMic,
  targetIsMod = false,
}: Props) {
  const profile = useQuery(api.profileFull.getFull, { userId: userId as Id<"users"> });
  const itemCounts = useQuery(api.shop.countUserItems, { userId: userId as Id<"users"> });
  const recordVisit = useMutation(api.visits.record);
  const authMe = useQuery(api.auth.me, { tokenOverride: getActiveToken() });
  const isMeViewer = !!authMe && String(authMe._id) === String(userId);
  const sendFriendRequest = useMutation(api.friends.sendRequest);
  const openWith = useMutation(api.directMessages.openWith);
  const friendStatus = useQuery(
    api.friends.isFriend,
    userId ? { otherUserId: userId as Id<"users">, tokenOverride: getActiveToken() } : ("skip" as any)
  );
  
  useEffect(() => {
    if (userId && !isMeViewer) {
      recordVisit({ visitedUserId: userId as Id<"users">, source: "profile", tokenOverride: getActiveToken() ?? undefined }).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);
  
  const [copied, setCopied] = useState(false);
  const [showAllMedals, setShowAllMedals] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [dmConversationId, setDmConversationId] = useState<string | null>(null);
  const [friendBusy, setFriendBusy] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const reactive = useReactiveAssets();
  const assets = reactive.map;
  const assetsFull = reactive.fullMap;

  if (profile === undefined) {
    return (
      <div className="fixed inset-0 z-[110] flex items-end" dir="rtl">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
        <div className="relative w-full max-w-md mx-auto bg-[#151b24] rounded-t-[32px] p-8 flex items-center justify-center border-t border-white/10 shadow-2xl">
          <Loader2 className="animate-spin text-purple-500" size={32} />
        </div>
      </div>
    );
  }
  if (profile === null) {
    return (
      <div className="fixed inset-0 z-[110] flex items-end" dir="rtl">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
        <div className="relative w-full max-w-md mx-auto bg-[#151b24] rounded-t-[32px] p-8 text-center border-t border-white/10 shadow-2xl">
          <p className="text-white font-bold">المستخدم غير موجود</p>
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
  const vipTopUrl = vipLevel > 0 ? assets[`vip.top.${vipLevel}`] : null;

  const canKick = currentUserRole === "owner" || currentUserRole === "moderator";
  const canBan = currentUserRole === "owner";
  const canPromoteOrDemote = currentUserRole === "owner";

  const giftTotal = ((profile as any).giftStats?.sent?.count ?? 0) + ((profile as any).giftStats?.received?.count ?? 0);

  const handleOpenChat = async () => {
    if (onOpenChat) { onOpenChat(); return; }
    try {
      const res = await openWith({ otherUserId: userId as Id<"users">, tokenOverride: getActiveToken() });
      setDmConversationId(res.conversationId);
    } catch (e: any) { dialog.alert(e?.message || "فشل فتح المحادثة"); }
  };

  const handleSendFriend = async () => {
    if (friendBusy) return;
    if (friendStatus?.status === "sent") { dialog.alert("تم إرسال الطلب مسبقاً"); return; }
    if (friendStatus?.status === "friends") { dialog.alert("أنتما صديقان بالفعل"); return; }
    setFriendBusy(true);
    try {
      const result = await sendFriendRequest({ targetUserId: userId as Id<"users">, tokenOverride: getActiveToken() });
      dialog.alert(result.autoAccepted ? "✅ أصبحتما صديقين" : "✅ تم إرسال طلب الصداقة");
    } catch (e: any) { dialog.alert(e?.message || "فشل إرسال الطلب"); }
    finally { setFriendBusy(false); }
  };

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
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md mx-auto animate-in slide-in-from-bottom duration-300">
        {/* Avatar straddling top edge */}
        <div className="absolute -top-11 right-6 z-30">
          <button onClick={onOpenFullProfile} className="active:scale-95 transition-transform">
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

        {/* Vip Top Ornament */}
        {vipTopUrl && (
          <VipTopOrnament url={vipTopUrl} assetFull={assetsFull[`vip.top.${vipLevel}`]} className="z-20" anchorPercent={0} />
        )}

        {/* Sheet Body */}
        <div className="relative rounded-t-[32px] max-h-[85vh] overflow-hidden flex flex-col bg-[#151b24] border-t border-white/10 shadow-[0_-10px_40px_rgba(0,0,0,0.8)]">
          {/* VIP background */}
          {vipBgUrl ? (
            <div className="absolute inset-0 bg-cover bg-center opacity-40 blur-sm" style={{ backgroundImage: `url(${vipBgUrl})` }} />
          ) : (
            <div className={`absolute inset-0 bg-gradient-to-b ${bgGradient} opacity-20 blur-sm`} />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-[#151b24]/80 to-[#151b24]" />

          <div className="relative z-[25] flex flex-col max-h-[85vh] overflow-y-auto px-6 pt-7 pb-6">
            
            {/* Name + ID */}
            <div className="px-2 pt-10 pb-2 flex flex-col items-start">
              <UserName name={profile.name ?? "ضيف"} adminRole={profile.adminRole} roomRole={profile.userNumber === 1 ? "owner" : null} size="md" nameClassName="text-white text-xl font-black drop-shadow" showCapsules={false} />
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                {profile.userNumber !== null && (
                  <button onClick={handleCopy} className="flex items-center gap-1 bg-white/10 backdrop-blur border border-white/15 text-white text-[11px] px-3 py-1 rounded-full hover:bg-white/20 transition active:scale-95" dir="ltr">
                    <span>ID:{profile.userNumber}</span>
                    {copied ? <Check size={11} className="text-green-400" /> : <Copy size={11} className="opacity-70" />}
                  </button>
                )}
                {profile.age && <span className="text-[10px] bg-white/10 backdrop-blur border border-white/15 text-white/80 px-2 py-0.5 rounded-full">{profile.age} سنة</span>}
                {profile.gender && <span className="text-[10px] bg-white/10 backdrop-blur border border-white/15 text-white/80 px-2 py-0.5 rounded-full">{profile.gender === "male" ? "♂ ذكر" : profile.gender === "female" ? "♀ أنثى" : "آخر"}</span>}
              </div>
            </div>

            {/* Badges */}
            <div className="flex items-center justify-start gap-1.5 px-2 mt-3 flex-wrap">
              {charm > 0 && <LevelBadge kind="charm" level={levelFromValue(charm)} size="sm" />}
              {wealth > 0 && <LevelBadge kind="wealth" level={levelFromValue(wealth)} size="sm" />}
              {vipLevel > 0 && (
                <div className="badge-glow">
                  <img src={assets[`vip.logo.${vipLevel}`] ?? ""} alt={`VIP ${vipLevel}`} className="h-5 w-auto object-contain" draggable={false} />
                </div>
              )}
            </div>

            {/* Medals bar */}
            <button onClick={() => setShowAllMedals((v) => !v)} className="mx-2 mt-4 flex items-center justify-between gap-2 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 hover:bg-white/10 transition active:scale-[0.99]">
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-white/70 text-xs font-black">+{medalCount} وسام</span>
                <ChevronLeft size={14} className={`text-white/50 transition-transform ${showAllMedals ? "rotate-90" : ""}`} />
              </div>
              <div className="flex-1 flex justify-end overflow-hidden">
                {medals.length > 0 ? <MedalsRow medals={showAllMedals ? medals : medals.slice(0, 6)} max={showAllMedals ? 30 : 6} size="xs" /> : <span className="text-white/40 text-[10px]">لا توجد أوسمة</span>}
              </div>
            </button>

            {/* Property cards */}
            <div className="mx-2 mt-3 grid grid-cols-3 gap-2">
              <PropertyBar label="هدية" value={giftTotal} tone="purple" />
              <PropertyBar label="إطار" value={itemCounts?.frame ?? 0} tone="emerald" />
              <PropertyBar label="مركبة" value={itemCounts?.vehicle ?? 0} tone="blue" />
            </div>

            {/* Bottom actions */}
            {isMeViewer ? (
              isMySeat ? (
                <div className="mx-2 mt-5 mb-2 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-stretch divide-x divide-white/10 rtl:divide-x-reverse overflow-hidden">
                  <ActionBtn icon={isMySeatMuted ? <MicOff size={22} className="text-red-400" /> : <Mic size={22} className="text-emerald-400" />} onClick={onMute} />
                  <ActionBtn icon={<ArrowDown size={22} />} onClick={onRemoveFromSeat} />
                </div>
              ) : null
            ) : (
              <div className="mx-2 mt-5 mb-2 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-stretch divide-x divide-white/10 rtl:divide-x-reverse overflow-hidden">
                <ActionBtn icon={<Gift size={22} className="text-purple-400" />} onClick={onOpenGift} />
                <ActionBtn icon={<MessageCircle size={22} className="text-blue-400" />} onClick={handleOpenChat} />
                <ActionBtn icon={friendStatus?.status === "friends" ? <Check size={22} className="text-emerald-400" /> : friendStatus?.status === "sent" ? <Check size={22} className="text-amber-400" /> : <UserPlus size={22} className="text-emerald-400" />} onClick={handleSendFriend} disabled={friendBusy || friendStatus?.status === "sent" || friendStatus?.status === "friends"} />
                {onMention && <ActionBtn icon={<span className="text-white/80 text-xl font-black">@</span>} onClick={() => onMention(profile.name ?? "")} />}
                {roomId && !isTargetOnMic && <ActionBtn icon={<Mic size={22} className="text-teal-400" />} onClick={onInviteToMic} />}
                <ActionBtn icon={<MoreVertical size={22} className="text-white/60" />} onClick={() => setShowMore(!showMore)} />
              </div>
            )}

            {/* More actions drawer */}
            {showMore && !isMeViewer && (
              <div className="mx-2 mb-4 p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center gap-2 flex-wrap animate-in fade-in zoom-in-95">
                {canKick && isTargetOnMic && <SmallAction icon={<MicOff size={18} />} label="كتم" onClick={onMute} />}
                {canKick && isTargetOnMic && <SmallAction icon={<ArrowDown size={18} />} label="نزول" onClick={onRemoveFromSeat} />}
                {canKick && <SmallAction icon={<Ban size={18} />} label="طرد" onClick={onKick} tone="danger" />}
                {canPromoteOrDemote && !targetIsMod && <SmallAction icon={<Crown size={18} />} label="ترقية" onClick={onPromote} />}
                {canPromoteOrDemote && targetIsMod && <SmallAction icon={<Shield size={18} />} label="تخفيض" onClick={onDemote} />}
                {canBan && <SmallAction icon={<Ban size={18} />} label="حظر" onClick={onBan} tone="danger" />}
                <SmallAction icon={<AlertTriangle size={18} />} label="إبلاغ" onClick={() => setShowReport(true)} tone="danger" />
              </div>
            )}
            <div className="h-4" />
          </div>
        </div>
      </div>

      {showActions && <ProfileActionsSheet userId={userId as any} userName={profile?.name ?? "مستخدم"} onClose={() => setShowActions(false)} onOpenReport={() => { setShowActions(false); setShowReport(true); }} />}
      {showReport && <ReportSheet userId={userId as any} userName={profile?.name ?? "مستخدم"} roomId={roomId} onClose={() => setShowReport(false)} />}
      {dmConversationId && <ChatThreadSheet conversationId={dmConversationId as any} onClose={() => setDmConversationId(null)} />}
    </div>
  );
}

function ActionBtn({ icon, onClick, disabled }: { icon: React.ReactNode; onClick?: () => void; disabled?: boolean; }) {
  return (
    <button onClick={onClick} disabled={disabled} className={`flex-1 flex items-center justify-center text-white transition active:bg-white/10 disabled:opacity-40 ${disabled ? "cursor-not-allowed" : "hover:bg-white/5"}`}>
      {icon}
    </button>
  );
}

function SmallAction({ icon, label, onClick, tone = "default" }: { icon: React.ReactNode; label: string; onClick?: () => void; tone?: "default" | "danger"; }) {
  const cls = tone === "danger" ? "bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20" : "bg-white/5 border-white/10 text-white/80 hover:bg-white/10";
  return (
    <button onClick={onClick} className={`px-3 py-2 rounded-xl border backdrop-blur-md text-[11px] font-black flex items-center gap-1.5 active:scale-95 transition ${cls}`}>
      {icon}
      <span>{label}</span>
    </button>
  );
}

function PropertyBar({ label, value, tone }: { label: string; value: number; tone: "blue" | "emerald" | "purple"; }) {
  const t = {
    blue: { bg: "from-blue-500/10 to-blue-600/5", border: "border-blue-500/20", text: "text-blue-300" },
    emerald: { bg: "from-emerald-500/10 to-emerald-600/5", border: "border-emerald-500/20", text: "text-emerald-300" },
    purple: { bg: "from-purple-500/10 to-purple-600/5", border: "border-purple-500/20", text: "text-purple-300" },
  }[tone];
  return (
    <div className={`h-14 rounded-2xl border ${t.border} bg-gradient-to-br ${t.bg} backdrop-blur-md px-3 flex flex-col items-center justify-center gap-0.5`}>
      <span className="text-white/50 text-[10px] font-bold">{label}</span>
      <span className={`${t.text} text-sm font-black tabular-nums`}>{formatNumber(value)}</span>
    </div>
  );
}
