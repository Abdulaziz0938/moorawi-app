import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { getActiveToken } from "../lib/session";
import { useAssets, useAssetsFull } from "../lib/assets";
import type { Id } from "../../convex/_generated/dataModel";
import { dialog } from "../lib/dialog";
import { AlertTriangle,
  Gift, MessageCircle, UserPlus, Mic, MicOff, ArrowDown,
  Ban, Crown, Loader2, Shield, Copy, Check, Car, Frame,
  ChevronLeft, MoreVertical,
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
  const [dmConversationId, setDmConversationId] = useState<string | null>(null);
  const [friendBusy, setFriendBusy] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const assets = useAssets();
  const assetsFull = useAssetsFull();

  if (profile === undefined) {
    return (
      <div className="fixed inset-0 z-[110] flex items-end" dir="rtl">
        <div className="absolute inset-0 bg-black" onClick={onClose} />
        <div className="relative w-full max-w-md mx-auto bg-white/10 backdrop-blur-2xl rounded-t-3xl p-8 flex items-center justify-center border-t border-white/20">
          <Loader2 className="animate-spin text-white" size={32} />
        </div>
      </div>
    );
  }
  if (profile === null) {
    return (
      <div className="fixed inset-0 z-[110] flex items-end" dir="rtl">
        <div className="absolute inset-0 bg-black" onClick={onClose} />
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
  

  const vipTopUrl = vipLevel > 0 ? assets[`vip.top.${vipLevel}`] : null;

  const canKick = currentUserRole === "owner" || currentUserRole === "moderator";
  const canBan = currentUserRole === "owner";
  const canPromoteOrDemote = currentUserRole === "owner";

  const giftTotal =
    ((profile as any).giftStats?.sent?.count ?? 0) +
    ((profile as any).giftStats?.received?.count ?? 0);

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
      <div className="absolute inset-0 bg-black" onClick={onClose} />

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

        {/* [ezo-top] القمة المزخرفة — على الحافة العليا للشيت */}
        {vipTopUrl && (
          <VipTopOrnament
            url={vipTopUrl}
            assetFull={assetsFull[`vip.top.${vipLevel}`]}
            className="z-20"
            style={{ top: "-45px" }}
          />
        )}

        {/* Sheet */}
        <div className="relative rounded-t-3xl max-h-[92vh] overflow-hidden flex flex-col">
          {/* [ezo-bg] VIP background أو gradient */}
          {vipBgUrl ? (
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${vipBgUrl})` }}
            />
          ) : (
            <div className={`absolute inset-0 bg-gradient-to-b ${bgGradient}`} />
          )}

          {/* [ezo-card] البطاقة كطبقة خلفية شبه شفافة */}
          {vipCardUrl && (
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `url(${vipCardUrl})`,
                backgroundSize: "100% 100%",
                backgroundRepeat: "no-repeat",
                opacity: 0.4,
              }}
            />
          )}

          {/* طبقة داكنة للقراءة */}
          <div className="absolute inset-0 bg-black/80" />

          {/* [ezo-card-frame] الإطار الرقيق كـ 9-patch — فوق الطبقات، تحت المحتوى */}
          {vipCardUrl && (
            <div
              className="absolute inset-0 z-[18] pointer-events-none"
              style={{
                borderImageSource: `url(${vipCardUrl})`,
                borderImageSlice: "80",
                borderImageRepeat: "stretch",
                borderImageWidth: "45px",
                borderStyle: "solid",
              }}
            />
          )}

          <div className="relative z-[25] flex flex-col max-h-[92vh] overflow-y-auto px-6 pt-7 pb-6">
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

            {/* Bottom actions — Ezo-style */}
            {isMeViewer ? (
              isMySeat ? (
                // أنا + على المايك: كتم + نزول
                <div className="mx-4 mt-4 mb-4 h-14 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 flex items-stretch divide-x divide-white/10 rtl:divide-x-reverse overflow-hidden">
                  <ActionBtn
                    icon={isMySeatMuted ? <MicOff size={22} className="text-red-300" /> : <Mic size={22} className="text-emerald-300" />}
                    onClick={onMute}
                  />
                  <ActionBtn icon={<ArrowDown size={22} />} onClick={onRemoveFromSeat} />
                </div>
              ) : null
              // أنا + لست على المايك: بلا أزرار
            ) : (
              // شخص آخر
              <div className="mx-4 mt-4 mb-4 h-14 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 flex items-stretch divide-x divide-white/10 rtl:divide-x-reverse overflow-hidden">
                <ActionBtn icon={<Gift size={22} />} onClick={onOpenGift} />
                <ActionBtn
                  icon={<MessageCircle size={22} />}
                  onClick={handleOpenChat}
                />
                <ActionBtn
                  icon={friendStatus?.status === "friends" ? <Check size={22} className="text-emerald-300" /> : friendStatus?.status === "sent" ? <Check size={22} className="text-amber-300" /> : <UserPlus size={22} />}
                  onClick={handleSendFriend}
                  disabled={friendBusy || friendStatus?.status === "sent" || friendStatus?.status === "friends"}
                />
                {onMention && (
                  <ActionBtn
                    icon={<span className="text-white text-xl font-black">@</span>}
                    onClick={() => onMention(profile.name ?? "")}
                  />
                )}
                {roomId && !isTargetOnMic && (
                  <ActionBtn icon={<Mic size={22} />} onClick={onInviteToMic} />
                )}
                <ActionBtn
                  icon={<MoreVertical size={22} />}
                  onClick={() => setShowActions(true)}
                />
              </div>
            )}

            {/* More actions drawer (kicks, bans, promotions) */}
            {showMore && !isMeViewer && (
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
                <SmallAction
                  icon={<AlertTriangle size={18} />}
                  label="إبلاغ"
                  onClick={() => setShowReport(true)}
                  tone="danger"
                />
              </div>
            )}

            <div className="h-6" />
          </div>
        </div>
      </div>

      {showActions && (
        <ProfileActionsSheet
          userId={userId as any}
          userName={profile?.name ?? "مستخدم"}
          onClose={() => setShowActions(false)}
          onOpenReport={() => {
            setShowActions(false);
            setShowReport(true);
          }}
        />
      )}

      {showReport && (
        <ReportSheet
          userId={userId as any}
          userName={profile?.name ?? "مستخدم"}
          roomId={roomId}
          onClose={() => setShowReport(false)}
        />
      )}
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
