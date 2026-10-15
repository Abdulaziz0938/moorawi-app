import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAssets, useAssetsFull } from "../lib/assets";
import type { Id } from "../../convex/_generated/dataModel";
import { getDeviceId } from "../lib/device";
import { getActiveToken } from "../lib/session";
import { uploadToCloudinary } from "../lib/cloudinary";
import { smartUpload } from "../lib/uploadAssets";
import { dialog } from "../lib/dialog";
import {
  ChevronLeft, ChevronRight, Home, Gift, MessageCircle, UserPlus, Crown, Loader2,
  Pencil, Camera, Eye, Trash2, ImageIcon, Copy, Check, Send, Inbox, Coins,
  Users, Heart, Award, Star, MoreHorizontal, ArrowRight, Zap, Gem,
} from "lucide-react";
import { UserName } from "./UserBadges";
import LevelBadge from "./LevelBadge";
import VipAvatar from "./ui/VipAvatar";
import VipTopOrnament from "./ui/VipTopOrnament";
import MedalsRow from "./MedalsRow";
import ImageCropper from "./ImageCropper";
import Card from "./ui/Card";
import MyItemsSheet from "./MyItemsSheet";
import UserListSheet from "./UserListSheet";
import ChatThreadSheet from "./ChatThreadSheet";
import { levelFromValue } from "../lib/levels";

interface Props {
  userId: string;
  currentUserRole?: "owner" | "moderator" | "speaker" | "listener";
  isMe?: boolean;
  onClose: () => void;
  onOpenGift?: () => void;
  onOpenAdminPanel?: () => void;
  onOpenOwnerPanel?: () => void;
  onEnterRoom?: (roomId: Id<"rooms">) => void;
  onOpenWallet?: () => void;
  onOpenVisits?: () => void;
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

type Tab = "info" | "assets" | "relation" | "moments";

export default function ProfilePage({
  userId: userIdProp, isMe: isMeOwn, onClose, onOpenGift,
  onOpenAdminPanel, onOpenOwnerPanel, onEnterRoom, onOpenWallet, onOpenVisits,
}: Props) {
  const deviceId = getDeviceId();
  const [viewUserId, setViewUserId] = useState<string>(userIdProp);
  const [scrollY, setScrollY] = useState(0);
  const userId = viewUserId;
  const isMe = !!isMeOwn && viewUserId === userIdProp;
  const [listMode, setListMode] = useState<"followers" | "following" | "fans" | null>(null);
  const profile = useQuery(api.profileFull.getFull, { userId: userId as Id<"users"> });
  const updateName = useMutation(api.users.updateName);
  const saveAvatar = useMutation(api.profiles.saveAvatar);
  const saveCover = useMutation(api.profiles.saveCover);
  const removeCover = useMutation(api.profiles.removeCover);
  const removeAvatar = useMutation(api.profiles.removeAvatar);
  const recordVisit = useMutation(api.visits.record);
  const toggleFollow = useMutation(api.follows.toggle);
  const isFollowing = useQuery(
    api.follows.isFollowing,
    !isMe && userId ? { tokenOverride: deviceId, targetUserId: userId as Id<"users"> } : ("skip" as any)
  );

  const [editingName, setEditingName] = useState(false);
  const [dmConversationId, setDmConversationId] = useState<string | null>(null);
  const [friendSent, setFriendSent] = useState(false);
  const openWith = useMutation(api.directMessages.openWith);
  const sendFriendRequest = useMutation(api.friends.sendRequest);
  const assets = useAssets();
  const assetsFull = useAssetsFull();
  const [newName, setNewName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingCover, setPendingCover] = useState<File | null>(null);
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);
  const [showCoverMenu, setShowCoverMenu] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [showCoverPreview, setShowCoverPreview] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<Tab>("info");
  const [showMyItems, setShowMyItems] = useState(false);
  const [myItemsCategory, setMyItemsCategory] = useState<"frame" | "vehicle" | "entryEffect" | "chatBubble" | "soundWave" | "profileCard">("frame");

  const inventory = useQuery(api.shop.myInventory, { tokenOverride: deviceId });
  const equipped = useQuery(api.shop.getEquippedAssets, { userId: userId as Id<"users"> });
  const itemCounts = useQuery(api.shop.countUserItems, { userId: userId as Id<"users"> });
  const invCounts: Record<string, number> = {};
  for (const inv of inventory ?? []) {
    invCounts[inv.category] = (invCounts[inv.category] ?? 0) + 1;
  }

  useEffect(() => {
    if (!isMe && userId) {
      recordVisit({ visitedUserId: userId as Id<"users">, source: "profile", tokenOverride: getActiveToken() ?? deviceId }).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, isMe]);

  if (profile === undefined) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md">
        <Loader2 className="animate-spin text-white" size={40} />
      </div>
    );
  }
  if (!profile) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md">
        <p className="text-white">المستخدم غير موجود</p>
      </div>
    );
  }

  const vipLevel = profile.vip ?? 0;
  const equippedFrame = (equipped as any)?.frame;
  const equippedVipLevel = (profile as any).equippedVipFrameLevel ?? null;
  const equippedVipKey = equippedVipLevel ? `vip.frame.${equippedVipLevel}` : null;
  const equippedVipData = equippedVipKey ? (assetsFull as any)[equippedVipKey] : null;
  const finalFrameUrl = equippedFrame?.imageUrl ?? equippedVipData?.url ?? null;
  const finalFrameScale = equippedFrame?.frameScale ?? equippedVipData?.frameScale ?? 1.4;
  const finalFrameOffsetX = equippedFrame?.frameOffsetX ?? equippedVipData?.frameOffsetX ?? 0;
  const finalFrameOffsetY = equippedFrame?.frameOffsetY ?? equippedVipData?.frameOffsetY ?? 0;
  const finalCanvasSize = equippedFrame?.canvasSize ?? equippedVipData?.canvasSize ?? null;
  const finalHoleSize = equippedFrame?.holeSize ?? equippedVipData?.holeSize ?? null;
  const finalOffsetX = equippedFrame?.offsetX ?? equippedVipData?.offsetX ?? 0;
  const finalOffsetY = equippedFrame?.offsetY ?? equippedVipData?.offsetY ?? 0;
  const finalAssetType = equippedFrame?.assetType ?? equippedVipData?.assetType ?? null;
  const bgGradient = VIP_BG[vipLevel] || VIP_BG[0];
  const vipBgUrl = vipLevel > 0 ? assets[`vip.background.${vipLevel}`] : null;
  const vipTopUrl = vipLevel > 0 ? assets[`vip.top.${vipLevel}`] : null;

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
  const isOwner = profile.userNumber === 1;
  const isAdmin = profile.adminRole === "super" || profile.adminRole === "moderator";
  const charm = profile.totalReceived ?? 0;
  const wealth = profile.totalSent ?? 0;
  const stats = profile.stats ?? { visitors: 0, fans: 0, followers: 0, following: 0, medals: 0 };
  const giftStats = (profile as any).giftStats ?? {
    sent: { count: 0, total: 0 }, received: { count: 0, total: 0 },
  };
  const medals = (profile as any).medals ?? [];
  const room = (profile as any).room;

  const handleAvatarUpload = (file: File) => { if (!isMe) return; setPendingFile(file); };
  const handleCroppedConfirm = async (croppedFile: File) => {
    setPendingFile(null);
    setUploading(true);
    try {
      const result = await smartUpload(croppedFile, { allowVideo: true });
      await saveAvatar({ avatarUrl: result.url, tokenOverride: deviceId });
      dialog.alert("تم تحديث الصورة");
    } catch (e: any) { dialog.alert(e?.message || "فشل الرفع"); }
    finally { setUploading(false); }
  };
  const handleCoverCroppedConfirm = async (croppedFile: File) => {
    setPendingCover(null);
    setUploading(true);
    try {
      const result = await smartUpload(croppedFile, { allowVideo: false });
      await saveCover({ coverUrl: result.url, tokenOverride: deviceId });
      dialog.alert("تم تحديث الغلاف");
    } catch (e: any) { dialog.alert(e?.message || "فشل الرفع"); }
    finally { setUploading(false); }
  };
  const handleSaveName = async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    try {
      await updateName({ name: trimmed, tokenOverride: deviceId });
      setEditingName(false);
      dialog.alert("تم حفظ الاسم");
    } catch (e: any) { dialog.alert(e?.message || "فشل الحفظ"); }
  };
  const handleAvatarClick = () => {
    if (isMe) setShowAvatarMenu(true);
    else if (profile.avatarUrl) setShowImagePreview(true);
  };
  const handleRemoveAvatar = async () => {
    setShowAvatarMenu(false);
    dialog.confirm("حذف الصورة؟", async () => {
      try { await removeAvatar({ tokenOverride: deviceId }); dialog.alert("تم"); }
      catch (e: any) { dialog.alert(e?.message || "فشل"); }
    }, "", "حذف", "إلغاء");
  };
  const handleCopy = async () => {
    if (!profile.userNumber) return;
    const v = String(profile.userNumber);
    try { await navigator.clipboard.writeText(v); } catch {
      const ta = document.createElement("textarea");
      ta.value = v; document.body.appendChild(ta); ta.select();
      document.execCommand("copy"); document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: "info", label: "معلومات" },
    { key: "assets", label: "الأصول" },
    { key: "relation", label: "العلاقة" },
    { key: "moments", label: "لحظات" },
  ];

  return (
    <div className="fixed inset-0 z-[200] flex flex-col" dir="rtl">
      {vipBgUrl ? (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${vipBgUrl})` }}
        />
      ) : (
        <div className={`absolute inset-0 bg-gradient-to-b ${bgGradient}`} />
      )}
      <div className="absolute inset-0 bg-black/55" />

      <div
        className="relative z-10 flex flex-col h-full overflow-y-auto"
        onScroll={(e) => setScrollY(e.currentTarget.scrollTop)}
      >
        {/* ============ Cover + Header ============ */}
        <div className="relative aspect-video flex-shrink-0">
          {profile.coverUrl ? (
            <img src={profile.coverUrl} alt="" className="w-full h-full object-cover" draggable={false} />
          ) : vipBgUrl ? (
            <div
              className="w-full h-full bg-cover bg-center"
              style={{ backgroundImage: `url(${vipBgUrl})` }}
            />
          ) : (
            <div className={`w-full h-full bg-gradient-to-b ${bgGradient}`} />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/80" />

          {/* [ezo-top] القمة المزخرفة على الخط الفاصل */}
          {vipTopUrl && (
            <VipTopOrnament
              url={vipTopUrl}
              assetFull={assetsFull[`vip.top.${vipLevel}`]}
              className="z-30"
              style={{ bottom: "-30px" }}
              fadeOut={Math.max(0, 1 - scrollY / 80)}
            />
          )}

          {isMe && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setShowCoverMenu((v) => !v); }}
              className="absolute inset-0 z-10"
              aria-label="خيارات الغلاف"
            />
          )}

          {/* Header row: Back arrow (left) + More (right) */}
          <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 pt-4 pb-2 z-30">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (viewUserId !== userIdProp) {
                  setViewUserId(userIdProp);
                } else {
                  onClose();
                }
              }}
              className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-xl border border-white/25 flex items-center justify-center text-white hover:bg-black/60 transition active:scale-95"
              aria-label="رجوع"
            >
              <ArrowRight size={20} />
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setShowMoreMenu((v) => !v); }}
                className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-xl border border-white/25 flex items-center justify-center text-white hover:bg-black/60 transition active:scale-95"
                aria-label="المزيد"
              >
                <MoreHorizontal size={20} />
              </button>

              {showMoreMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowMoreMenu(false)} />
                  <div
                    className="absolute top-12 left-0 z-[300] w-52 rounded-2xl overflow-hidden border border-white/20 shadow-2xl backdrop-blur-2xl"
                    style={{ background: "linear-gradient(145deg, rgba(30,27,75,0.95), rgba(15,12,40,0.98))" }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {isMe && isOwner && (
                      <button
                        onClick={() => { setShowMoreMenu(false); onOpenOwnerPanel?.(); }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-white hover:bg-white/10"
                      >
                        <Crown size={16} className="text-amber-300" />
                        لوحة المالك
                      </button>
                    )}
                    {isMe && isAdmin && !isOwner && (
                      <button
                        onClick={() => { setShowMoreMenu(false); onOpenAdminPanel?.(); }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-white hover:bg-white/10"
                      >
                        <Crown size={16} className="text-sky-300" />
                        لوحة الأدمن
                      </button>
                    )}
                    {isMe && (
                      <button
                        onClick={() => { setShowMoreMenu(false); setShowAvatarMenu(true); }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-white hover:bg-white/10 border-t border-white/10"
                      >
                        <Camera size={16} />
                        صورة الحساب
                      </button>
                    )}
                    {isMe && (
                      <button
                        onClick={() => { setShowMoreMenu(false); setShowCoverMenu(true); }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-white hover:bg-white/10 border-t border-white/10"
                      >
                        <ImageIcon size={16} />
                        صورة الغلاف
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Cover menu */}
          {isMe && showCoverMenu && (
            <>
              <div className="absolute inset-0 z-40" onClick={() => setShowCoverMenu(false)} />
              <div
                className="absolute bottom-3 left-3 z-50 w-48 rounded-2xl overflow-hidden border border-white/20 shadow-2xl backdrop-blur-2xl"
                style={{ background: "linear-gradient(145deg, rgba(30,27,75,0.95), rgba(15,12,40,0.98))" }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => { setShowCoverMenu(false); setShowCoverPreview(true); }}
                  disabled={!profile.coverUrl}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold ${profile.coverUrl ? "text-white hover:bg-white/10" : "text-white/30 cursor-not-allowed"}`}
                >
                  <Eye size={16} /> عرض الصورة
                </button>
                <label className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-white hover:bg-white/10 cursor-pointer border-t border-white/10">
                  <ImageIcon size={16} /> تغيير الصورة
                  <input
                    type="file" accept="image/*" className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) { setShowCoverMenu(false); setPendingCover(f); }
                      e.target.value = "";
                    }}
                  />
                </label>
                <button
                  onClick={() => {
                    setShowCoverMenu(false);
                    dialog.confirm("حذف صورة الغلاف؟", async () => {
                      try { await removeCover({ tokenOverride: deviceId }); dialog.alert("تم الحذف"); }
                      catch (e: any) { dialog.alert(e?.message || "فشل"); }
                    }, "حذف", "حذف");
                  }}
                  disabled={!profile.coverUrl}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold border-t border-white/10 ${profile.coverUrl ? "text-red-400 hover:bg-red-500/10" : "text-white/30 cursor-not-allowed"}`}
                >
                  <Trash2 size={16} /> حذف الصورة
                </button>
              </div>
            </>
          )}
        </div>

        {/* ============ Avatar + Name + Info ============ */}
        <div className="px-6 flex flex-col items-start -mt-12 relative z-20">
          <div className="relative">
            <div onClick={handleAvatarClick} className="active:scale-95 transition-transform cursor-pointer">
              <VipAvatar
                src={profile?.avatarUrl}
                name={profile?.name ?? "?"}
                size={90}
                vip={vipLevel}
                ring={vipLevel === 0}
                customFrameUrl={finalFrameUrl}
                frameScale={finalFrameScale}
                frameOffsetX={finalFrameOffsetX}
                frameOffsetY={finalFrameOffsetY}
                canvasSize={finalCanvasSize}
                holeSize={finalHoleSize}
                offsetX={finalOffsetX}
                offsetY={finalOffsetY}
                assetType={finalAssetType}
              />
            </div>
            {isMe && (
              <div className="absolute bottom-1 right-1 w-7 h-7 rounded-full bg-black/70 backdrop-blur-xl border border-white/30 flex items-center justify-center pointer-events-none z-20">
                <Camera size={12} className="text-white/90" />
              </div>
            )}
          </div>

          {/* Name — pushed down slightly to avoid frame overlap */}
          <div className="mt-5 flex items-center gap-2 justify-start w-full">
            {editingName ? (
              <>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder={profile.name ?? ""}
                  className="flex-1 min-w-0 bg-white/15 backdrop-blur border border-white/25 rounded-xl px-3 py-2 text-white text-sm text-center outline-none focus:border-purple-400"
                  autoFocus
                />
                <button onClick={handleSaveName} className="px-3 py-2 bg-purple-600 rounded-xl text-white text-xs font-black">حفظ</button>
                <button onClick={() => setEditingName(false)} className="px-3 py-2 bg-white/15 rounded-xl text-white text-xs">إلغاء</button>
              </>
            ) : (
              <>
                <UserName
                  name={profile.name ?? "ضيف"}
                  adminRole={profile.adminRole}
                  roomRole={isOwner ? "owner" : null}
                  size="lg"
                  nameClassName="text-white text-lg drop-shadow"
                  showCapsules={false}
                />
                {isMe && (
                  <button
                    onClick={() => { setNewName(profile.name ?? ""); setEditingName(true); }}
                    className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center text-white/80 hover:bg-white/25 flex-shrink-0"
                  >
                    <Pencil size={12} />
                  </button>
                )}
              </>
            )}
          </div>

          {/* ID + Age + Gender + Country */}
          <div className="flex items-center justify-start gap-1.5 mt-2 flex-wrap w-full">
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
            {profile.country && <CountryFlag code={profile.country} />}
          </div>
        </div>

        {/* ============ VIP + Wealth + Charm (RTL: VIP first from right) ============ */}
        <div className="flex items-center justify-start gap-2 px-6 mt-3 flex-wrap">
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
          {wealth > 0 && <LevelBadge kind="wealth" level={levelFromValue(wealth)} size="sm" />}
          {charm > 0 && <LevelBadge kind="charm" level={levelFromValue(charm)} size="sm" />}
        </div>

        {/* Bio */}
        {profile.bio && (
          <p className="text-white/85 text-xs text-right px-6 mt-3 leading-relaxed">{profile.bio}</p>
        )}

        {/* ============ Stats inline (no card, tappable for isMe) ============ */}
        <div className="flex items-center justify-around gap-2 px-6 mt-4">
          <InlineStat
            label="متابعين"
            value={stats.followers}
            onClick={() => setListMode("followers")}
          />
          <span className="w-px h-8 bg-white/15" />
          <InlineStat
            label="معجبين"
            value={stats.fans}
            onClick={() => setListMode("fans")}
          />
          <span className="w-px h-8 bg-white/15" />
          <InlineStat
            label="زوار"
            value={stats.visitors}
            onClick={isMe && onOpenVisits ? onOpenVisits : undefined}
          />
        </div>

        {/* ============ Medals draggable strip ============ */}
        {medals.length > 0 && (
          <div className="mt-4 overflow-x-auto scrollbar-hide px-4">
            <div className="flex items-center gap-2 min-w-max pr-2">
              <MedalsRow medals={medals} max={20} size="sm" />
            </div>
          </div>
        )}

        {/* ============ Recharge badge ============ */}
        {(profile as any).totalPurchased > 0 && (
          <div className="flex justify-end px-6 mt-3">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500/20 to-yellow-500/10 border border-amber-400/40">
              <Zap size={12} className="text-amber-300" />
              <span className="text-[10px] font-black text-amber-200">
                مشحون {formatNumber((profile as any).totalPurchased)}
              </span>
            </div>
          </div>
        )}

        {/* ============ Room Card (wide) ============ */}
        {room && (
          <div className="mx-4 mt-4">
            <button
              onClick={() => {
                if (!room?._id) {
                  dialog.alert("معرف الغرفة غير متوفر");
                  return;
                }
                dialog.confirm(
                  `هل تريد الذهاب إلى غرفة "${room.name}"؟`,
                  () => {
                    if (onEnterRoom) {
                      onClose();
                      onEnterRoom(room._id);
                    }
                  },
                  "الذهاب إلى الغرفة",
                  "اذهب",
                  "إلغاء"
                );
              }}
              className="w-full rounded-2xl overflow-hidden relative active:scale-[0.99] transition"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-purple-600/30 via-pink-600/20 to-indigo-600/30" />
              <div className="absolute inset-0 bg-black/40 backdrop-blur-xl" />
              <div className="relative p-3 flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl overflow-hidden bg-black/40 flex items-center justify-center flex-shrink-0 border border-white/20">
                  {room.coverUrl ? (
                    <img src={room.coverUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Home size={24} className="text-white/70" />
                  )}
                </div>
                <div className="flex-1 min-w-0 text-right">
                  <p className="text-white text-sm font-black truncate">{room.name}</p>
                  <p className="text-white/50 text-[10px] mt-0.5" dir="ltr">ID:{room.roomNumber ?? "—"}</p>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <div className="flex items-center gap-1">
                    <Users size={11} className="text-emerald-300" />
                    <span className="text-[10px] font-black text-emerald-200 tabular-nums">{room.memberCount ?? 0}</span>
                    <AnimatedSignal className="mr-1" />
                  </div>
                  <span className="text-[9px] font-black text-amber-200 px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-400/30">
                    Lv.0
                  </span>
                </div>
              </div>
            </button>
          </div>
        )}

        {/* ============ Tabs ============ */}
        <div className="mx-4 mt-5 flex items-center gap-1 p-1 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl sticky top-2 z-20">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 py-2 px-2 rounded-xl text-xs font-black transition ${
                tab === t.key
                  ? "bg-gradient-to-br from-purple-600 to-purple-700 text-white shadow-lg shadow-purple-500/30"
                  : "text-white/50 hover:text-white/80 hover:bg-white/5"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ============ Tab content ============ */}
        <div className="px-4 py-4 min-h-[200px]">
          {tab === "info" && (
            <div className="space-y-3">
              <Card padding="md">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white/60 text-xs font-black" dir="ltr">0/9</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-white/60 text-xs font-black">صور الحياة</span>
                    <ImageIcon size={14} className="text-white/60" />
                  </div>
                </div>
                <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                  {isMe ? (
                    <div className="w-20 h-20 rounded-xl bg-white/5 border border-dashed border-white/20 flex items-center justify-center flex-shrink-0">
                      <UserPlus size={20} className="text-white/40" />
                    </div>
                  ) : (
                    <p className="text-white/40 text-xs py-4">لا توجد صور</p>
                  )}
                </div>
              </Card>

              <Card padding="md">
                <div className="flex items-center justify-end gap-1.5 mb-2">
                  <span className="text-amber-200 text-xs font-black">أفضل داعم</span>
                  <Heart size={14} className="text-amber-300" />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="aspect-[5/4] rounded-xl bg-gradient-to-br from-amber-900/30 to-black/40 border border-amber-500/20 flex flex-col items-center justify-center gap-1"
                    >
                      <div className="w-8 h-8 rounded-full bg-white/10 border border-white/20" />
                      <p className="text-white/50 text-[9px]">انتظر...</p>
                    </div>
                  ))}
                </div>
              </Card>

              <Card padding="md">
                <div className="flex items-center justify-end gap-1.5 mb-2">
                  <span className="text-white text-xs font-black">شرف</span>
                  <Star size={14} className="text-white" />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-xl bg-gradient-to-br from-amber-700/40 to-amber-900/40 border border-amber-500/30 p-2.5 flex flex-col items-center">
                    <span className="text-white font-black text-base leading-tight" dir="ltr">VIP {vipLevel}</span>
                    <span className="text-white/60 text-[10px] mt-1">امتيازات</span>
                  </div>
                  <div className="rounded-xl bg-gradient-to-br from-orange-700/40 to-orange-900/40 border border-orange-500/30 p-2.5 flex flex-col items-center">
                    <span className="text-white font-black text-base leading-tight" dir="ltr">Lv.{levelFromValue(wealth)}</span>
                    <span className="text-white/60 text-[10px] mt-1">ثروة</span>
                  </div>
                  <div className="rounded-xl bg-gradient-to-br from-purple-700/40 to-purple-900/40 border border-purple-500/30 p-2.5 flex flex-col items-center">
                    <span className="text-white font-black text-base leading-tight" dir="ltr">Lv.{levelFromValue(charm)}</span>
                    <span className="text-white/60 text-[10px] mt-1">جاذبية</span>
                  </div>
                </div>
              </Card>

              <Card padding="md">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-white/50 text-[10px] font-black" dir="ltr">
                    {formatNumber(stats.medals ?? medals.length)}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-white text-xs font-black">الأساطير</span>
                    <Award size={14} className="text-white" />
                  </div>
                </div>
                <div className="rounded-xl bg-gradient-to-r from-amber-900/40 via-yellow-800/30 to-amber-900/40 border border-amber-500/30 p-3 flex items-center justify-between">
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/20 border border-blue-400/30">
                    <Gem size={10} className="text-blue-300" />
                    <span className="text-[10px] font-black text-blue-200">محطة بارزة 20</span>
                  </div>
                  <span className="text-amber-100 text-[11px] font-black">
                    تم وصول مستوى الثروة 50
                  </span>
                </div>
              </Card>
            </div>
          )}

          {tab === "assets" && (
            <div className="space-y-3">
              <AssetRow
                label="هدية"
                count={giftStats.received.count + giftStats.sent.count}
                tone="purple"
                onOpen={isMe ? () => dialog.alert("قريباً") : undefined}
              />
              <AssetRow
                label="أوسمة"
                count={medals.length}
                tone="gold"
                onOpen={isMe ? () => dialog.alert("قريباً") : undefined}
              />
              <AssetRow
                label="إطار"
                count={itemCounts?.frame ?? 0}
                tone="emerald"
                onOpen={isMe ? () => { setMyItemsCategory("frame"); setShowMyItems(true); } : undefined}
              />
              <AssetRow
                label="مركبة"
                count={itemCounts?.vehicle ?? 0}
                tone="default"
                onOpen={isMe ? () => { setMyItemsCategory("vehicle"); setShowMyItems(true); } : undefined}
              />
              <AssetRow
                label="فقاعة دردشة"
                count={itemCounts?.chatBubble ?? 0}
                tone="pink"
                onOpen={isMe ? () => { setMyItemsCategory("chatBubble"); setShowMyItems(true); } : undefined}
              />
              <AssetRow
                label="دخولية"
                count={itemCounts?.entryEffect ?? 0}
                tone="purple"
                onOpen={isMe ? () => { setMyItemsCategory("entryEffect"); setShowMyItems(true); } : undefined}
              />
              <AssetRow
                label="موجات صوتية"
                count={itemCounts?.soundWave ?? 0}
                tone="default"
                onOpen={isMe ? () => { setMyItemsCategory("soundWave"); setShowMyItems(true); } : undefined}
              />
              <AssetRow
                label="بطاقة الملف"
                count={itemCounts?.profileCard ?? 0}
                tone="gold"
                onOpen={isMe ? () => { setMyItemsCategory("profileCard"); setShowMyItems(true); } : undefined}
              />
            </div>
          )}

          {tab === "relation" && (
            <Card tone="default" padding="lg">
              <div className="flex flex-col items-center justify-center py-8 text-white/40">
                <Heart size={40} className="mb-3 opacity-40" />
                <p className="text-sm font-black text-white/70">إنها فارغة هنا</p>
                <p className="text-xs mt-1">نؤمن بأن الحب سيأتي في النهاية</p>
                <button
                  onClick={() => dialog.alert("فتح الدردشة مع المستخدم وطلب علاقة — قريباً")}
                  className="mt-4 px-6 py-2.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-xs font-black active:scale-95"
                >
                  كيف تحصل عليها؟
                </button>
              </div>
            </Card>
          )}

          {tab === "moments" && (
            <Card tone="default" padding="lg">
              <div className="flex flex-col items-center justify-center py-8 text-white/40">
                <ImageIcon size={40} className="mb-3 opacity-40" />
                <p className="text-sm">لا توجد منشورات</p>
              </div>
            </Card>
          )}
        </div>

        {/* ============ Actions (not me) ============ */}
        {!isMe && (
          <div className="mx-4 mb-6 flex items-center justify-center gap-4">
            <button
              onClick={onOpenGift}
              className="w-14 h-14 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white shadow-lg active:scale-90 transition"
            >
              <Gift size={24} />
            </button>
            <button
              onClick={async () => {
                try {
                  const res = await openWith({
                    otherUserId: userId as Id<"users">,
                    tokenOverride: deviceId,
                  });
                  setDmConversationId(res.conversationId);
                } catch (e: any) {
                  dialog.alert(e?.message || "فشل فتح المحادثة");
                }
              }}
              className="w-14 h-14 rounded-full bg-white/15 backdrop-blur border border-white/25 flex items-center justify-center text-white hover:bg-white/25 transition active:scale-90"
              title="مراسلة"
            >
              <MessageCircle size={22} />
            </button>
            <button
              onClick={async () => {
                try {
                  if (friendSent) {
                    dialog.alert("تم إرسال الطلب مسبقاً");
                    return;
                  }
                  await sendFriendRequest({
                    targetUserId: userId as Id<"users">,
                    tokenOverride: deviceId,
                  });
                  setFriendSent(true);
                  dialog.alert("✅ تم إرسال طلب الصداقة");
                } catch (e: any) {
                  dialog.alert(e?.message || "فشل إرسال الطلب");
                }
              }}
              className={`w-14 h-14 rounded-full backdrop-blur border flex items-center justify-center text-white transition active:scale-90 ${
                friendSent
                  ? "bg-emerald-500/30 border-emerald-400/50"
                  : "bg-white/15 border-white/25 hover:bg-white/25"
              }`}
              title="إضافة صديق"
            >
              {friendSent ? (
                <Check size={22} className="text-emerald-300" />
              ) : (
                <UserPlus size={22} />
              )}
            </button>
          </div>
        )}

        <div className="h-8" />
      </div>

      {/* ============ Direct Chat ============ */}
      {dmConversationId && (
        <ChatThreadSheet
          conversationId={dmConversationId as any}
          onClose={() => setDmConversationId(null)}
        />
      )}

      {/* ============ Avatar Menu ============ */}
      {isMe && showAvatarMenu && (
        <>
          <div className="fixed inset-0 z-[250]" onClick={() => setShowAvatarMenu(false)} />
          <div
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[260] w-[260px] rounded-3xl overflow-hidden shadow-2xl"
            style={{
              background: "linear-gradient(145deg, rgba(30,27,75,0.92) 0%, rgba(15,12,40,0.96) 100%)",
              backdropFilter: "blur(28px)",
              WebkitBackdropFilter: "blur(28px)",
              border: "1px solid rgba(255,255,255,0.2)",
            }}
          >
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-400/70 to-transparent" />
            <button
              onClick={() => { setShowAvatarMenu(false); if (profile.avatarUrl) setShowImagePreview(true); }}
              disabled={!profile.avatarUrl}
              className={`w-full flex items-center gap-3 px-5 py-3.5 text-sm font-bold ${profile.avatarUrl ? "text-white hover:bg-white/10" : "text-white/30 cursor-not-allowed"}`}
            >
              <Eye size={18} /> عرض الصورة
            </button>
            <label className="w-full flex items-center gap-3 px-5 py-3.5 text-sm font-bold text-white hover:bg-white/10 cursor-pointer">
              {uploading ? <Loader2 size={18} className="animate-spin" /> : <ImageIcon size={18} />}
              {uploading ? "جاري الرفع..." : "تغيير الصورة"}
              <input
                type="file" accept="image/*" className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) { setShowAvatarMenu(false); handleAvatarUpload(f); }
                }}
              />
            </label>
            <button
              onClick={handleRemoveAvatar}
              disabled={!profile.avatarUrl}
              className={`w-full flex items-center gap-3 px-5 py-3.5 text-sm font-bold border-t border-white/10 ${profile.avatarUrl ? "text-red-400 hover:bg-red-500/10" : "text-white/30 cursor-not-allowed"}`}
            >
              <Trash2 size={18} /> حذف الصورة
            </button>
          </div>
        </>
      )}

      {/* ============ Image Preview (avatar) ============ */}
      {showImagePreview && profile.avatarUrl && (
        <div
          className="fixed inset-0 z-[260] flex items-center justify-center bg-black/95 backdrop-blur-md"
          onClick={() => setShowImagePreview(false)}
        >
          <button
            onClick={() => setShowImagePreview(false)}
            className="absolute top-4 right-4 w-11 h-11 rounded-full bg-white/15 backdrop-blur-xl border border-white/25 flex items-center justify-center text-white hover:bg-white/25 transition"
          >
            <ChevronLeft size={22} />
          </button>
          <img
            src={profile?.avatarUrl || "/avatar.png"}
            alt=""
            className="max-w-[95vw] max-h-[85vh] object-contain rounded-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* ============ Cover Preview ============ */}
      {showCoverPreview && profile.coverUrl && (
        <div
          className="fixed inset-0 z-[260] flex items-center justify-center bg-black/95 backdrop-blur-md"
          onClick={() => setShowCoverPreview(false)}
        >
          <button
            onClick={() => setShowCoverPreview(false)}
            className="absolute top-4 right-4 w-11 h-11 rounded-full bg-white/15 backdrop-blur-xl border border-white/25 flex items-center justify-center text-white hover:bg-white/25 transition"
          >
            <ChevronLeft size={22} />
          </button>
          <img
            src={profile.coverUrl}
            alt=""
            className="max-w-[95vw] max-h-[85vh] object-contain rounded-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Croppers */}
      {pendingFile && (
        <ImageCropper
          file={pendingFile}
          aspect={1}
          shape="circle"
          onCancel={() => setPendingFile(null)}
          onConfirm={handleCroppedConfirm}
        />
      )}
      {pendingCover && (
        <ImageCropper
          file={pendingCover}
          aspect={16/9}
          shape="rect"
          onCancel={() => setPendingCover(null)}
          onConfirm={handleCoverCroppedConfirm}
        />
      )}

      {listMode && (
        <UserListSheet
          userId={userId}
          mode={listMode}
          onClose={() => setListMode(null)}
          onUserClick={(id) => {
            setListMode(null);
            dialog.alert("فتح ملف " + id + " قريباً");
          }}
        />
      )}

      {showMyItems && (
        <MyItemsSheet
          onClose={() => setShowMyItems(false)}
          initialCategory={myItemsCategory}
        />
      )}
    </div>
  );
}

// ============ Inline Stat (no card) ============
function InlineStat({
  label, value, onClick,
}: {
  label: string;
  value: number;
  onClick?: () => void;
}) {
  const Comp: any = onClick ? "button" : "div";
  return (
    <Comp
      onClick={onClick}
      className={`flex flex-col items-center gap-0.5 ${onClick ? "active:scale-95 transition" : ""}`}
    >
      <span className="text-white text-xl font-black tabular-nums leading-none" dir="ltr">
        {formatNumber(value)}
      </span>
      <span className="text-white/60 text-[11px] font-bold">{label}</span>
    </Comp>
  );
}

// ============ Animated Signal ============
function AnimatedSignal({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-end gap-0.5 ${className}`} style={{ height: 12 }}>
      <span className="w-0.5 bg-emerald-300 rounded-full animate-pulse" style={{ height: "40%", animationDuration: "0.6s" }} />
      <span className="w-0.5 bg-emerald-300 rounded-full animate-pulse" style={{ height: "100%", animationDuration: "0.8s" }} />
      <span className="w-0.5 bg-emerald-300 rounded-full animate-pulse" style={{ height: "60%", animationDuration: "0.7s" }} />
    </span>
  );
}

// ============ Country Flag ============
const COUNTRY_MAP: Record<string, string> = {
  syria: "SY", sy: "SY", "سوريا": "SY", "سورية": "SY",
  saudi: "SA", "السعودية": "SA", "المملكة العربية السعودية": "SA",
  egypt: "EG", "مصر": "EG", eg: "EG",
  iraq: "IQ", "العراق": "IQ", iq: "IQ",
  jordan: "JO", "الأردن": "JO",
  lebanon: "LB", "لبنان": "LB",
  uae: "AE", "الإمارات": "AE", "الامارات": "AE",
  kuwait: "KW", "الكويت": "KW",
  qatar: "QA", "قطر": "QA",
  bahrain: "BH", "البحرين": "BH",
  oman: "OM", "عمان": "OM",
  yemen: "YE", "اليمن": "YE",
  palestine: "PS", "فلسطين": "PS",
  turkey: "TR", "تركيا": "TR",
  usa: "US", "أمريكا": "US", "امريكا": "US",
  uk: "GB", "بريطانيا": "GB",
  germany: "DE", "ألمانيا": "DE", "المانيا": "DE",
  france: "FR", "فرنسا": "FR",
};

function CountryFlag({ code }: { code: string }) {
  if (!code) return null;
  const normalized = code.trim();
  const iso = COUNTRY_MAP[normalized.toLowerCase()] || normalized.toUpperCase().slice(0, 2);
  let emoji = "";
  try {
    emoji = iso.replace(/./g, (ch) => String.fromCodePoint(0x1F1E6 + ch.charCodeAt(0) - 65));
  } catch { emoji = ""; }
  return (
    <span className="text-[10px] bg-white/15 backdrop-blur border border-white/20 text-white px-2 py-0.5 rounded-full flex items-center gap-1" dir="ltr">
      <span className="font-black">{iso}</span>
      <span className="text-xs">{emoji}</span>
    </span>
  );
}

// ============ Asset Row ============
function AssetRow({
  label, count, tone, onOpen,
}: {
  label: string;
  count: number;
  tone: "purple" | "gold" | "emerald" | "default" | "pink";
  onOpen?: () => void;
}) {
  const t = {
    purple:  { bg: "from-purple-900/40 to-purple-950/60",   border: "border-purple-500/30",  text: "text-purple-200" },
    gold:    { bg: "from-amber-900/40 to-amber-950/60",     border: "border-amber-500/30",   text: "text-amber-200" },
    emerald: { bg: "from-emerald-900/40 to-emerald-950/60", border: "border-emerald-500/30", text: "text-emerald-200" },
    pink:    { bg: "from-pink-900/40 to-pink-950/60",       border: "border-pink-500/30",    text: "text-pink-200" },
    default: { bg: "from-slate-800/40 to-slate-950/60",     border: "border-white/20",       text: "text-white/80" },
  }[tone];
  const inner = (
    <div className="flex items-center justify-between">
      <div className={`h-10 min-w-[40px] px-3 rounded-xl bg-black/30 flex items-center justify-center ${t.text}`}>
        <span className="text-sm font-black tabular-nums">{count}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-white text-sm font-black">{label}</span>
        {onOpen && <ChevronRight size={16} className="text-white/40 rotate-180" />}
      </div>
    </div>
  );
  if (onOpen) {
    return (
      <button
        onClick={onOpen}
        className={`w-full rounded-2xl border ${t.border} bg-gradient-to-br ${t.bg} backdrop-blur-xl p-3 active:scale-[0.99] transition text-right`}
      >
        {inner}
      </button>
    );
  }
  return (
    <div className={`w-full rounded-2xl border ${t.border} bg-gradient-to-br ${t.bg} backdrop-blur-xl p-3`}>
      {inner}
    </div>
  );
}
