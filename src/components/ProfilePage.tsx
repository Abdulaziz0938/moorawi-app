import MemberEntryEffect from "./ui/MemberEntryEffect";
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useReactiveAssets } from "../lib/assets";
import type { Id } from "../../convex/_generated/dataModel";
import { getDeviceId } from "../lib/device";
import { getActiveToken } from "../lib/session";
import { smartUpload } from "../lib/uploadAssets";
import { dialog } from "../lib/dialog";
import {
  Radio, ChevronLeft, ChevronRight, Home, Gift, MessageCircle, UserPlus, Crown, Loader2,
  Pencil, Camera, Eye, Trash2, ImageIcon, Copy, Check, Send, Coins,
  Users, Heart, Award, Star, MoreHorizontal, ArrowRight, Zap, Gem, Plus, X
} from "lucide-react";
import { UserName } from "./UserBadges";
import LevelBadge from "./LevelBadge";
import VipAvatar from "./ui/VipAvatar";
import AssetVideo from "./ui/AssetVideo";
import VipTopOrnament from "./ui/VipTopOrnament";
import MedalsRow from "./MedalsRow";
import ImageCropper from "./ImageCropper";
import Card from "./ui/Card";
import MyItemsSheet from "./MyItemsSheet";
import GiftHistorySheet from "./GiftHistorySheet";
import MedalsSheet from "./MedalsSheet";
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
  0: "from-slate-900 via-slate-800 to-slate-900",
  1: "from-emerald-900 via-emerald-700 to-slate-900",
  2: "from-blue-900 via-blue-700 to-slate-900",
  3: "from-purple-900 via-purple-700 to-slate-900",
  4: "from-red-900 via-red-700 to-slate-900",
  5: "from-yellow-900 via-yellow-700 to-slate-900",
  6: "from-orange-900 via-orange-700 to-slate-900",
  7: "from-amber-900 via-yellow-500 to-slate-900",
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
  const activeRoom = useQuery(api.rooms.getUserActiveRoom, { userId: userId as Id<"users"> });

  const momentsFeed = useQuery(
    api.moments.feed,
    userId ? { userId: userId as Id<"users">, limit: 50, tokenOverride: getActiveToken() ?? deviceId } : ("skip" as any)
  );

  const receivedGifts = useQuery(
    api.giftHistory.myReceivedGifts,
    userId ? { userId: userId as Id<"users">, limit: 20, tokenOverride: getActiveToken() ?? deviceId } : ("skip" as any)
  );

  const lifePhotos = useQuery(
    api.lifePhotos.listByUser,
    userId ? { userId: userId as Id<"users"> } : ("skip" as any)
  );
  
  const addLifePhoto = useMutation(api.lifePhotos.add);
  const removeLifePhoto = useMutation(api.lifePhotos.remove);
  const updateName = useMutation(api.users.updateName);
  const saveAvatar = useMutation(api.profiles.saveAvatar);
  const saveCover = useMutation(api.profiles.saveCover);
  const removeCover = useMutation(api.profiles.removeCover);
  const removeAvatar = useMutation(api.profiles.removeAvatar);
  const recordVisit = useMutation(api.visits.record);
  const toggleFollow = useMutation(api.follows.toggle);
  const toggleLikeMut = useMutation(api.likes.toggleLike);
  const updateBioMut = useMutation(api.profiles.updateBio);
  
  const isLiked = useQuery(
    api.likes.isLiked,
    !isMe && userId ? { tokenOverride: getActiveToken() ?? deviceId, targetUserId: userId as Id<"users"> } : ("skip" as any)
  );
  const isFollowing = useQuery(
    api.follows.isFollowing,
    !isMe && userId ? { tokenOverride: getActiveToken() ?? deviceId, targetUserId: userId as Id<"users"> } : ("skip" as any)
  );

  const [editingName, setEditingName] = useState(false);
  const [dmConversationId, setDmConversationId] = useState<string | null>(null);
  const [friendSentLocal, setFriendSentLocal] = useState(false);
  const [editBio, setEditBio] = useState(false);
  const [bioText, setBioText] = useState("");
  
  const friendStatus = useQuery(
    api.friends.isFriend,
    !isMe && userId ? { otherUserId: userId as Id<"users">, tokenOverride: getActiveToken() ?? deviceId } : ("skip" as any)
  );
  const friendSent = friendSentLocal || friendStatus?.status === "sent" || friendStatus?.status === "friends";
  const setFriendSent = setFriendSentLocal;
  
  const openWith = useMutation(api.directMessages.openWith);
  const sendFriendRequest = useMutation(api.friends.sendRequest);

  const reactive = useReactiveAssets();
  const assets = reactive.map;
  const assetsFull = reactive.fullMap;
  
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
  const [playVehicleOnOpen, setPlayVehicleOnOpen] = useState(true);
  const [tab, setTab] = useState<Tab>("info");
  const [showMyItems, setShowMyItems] = useState(false);
  const [showGiftHistory, setShowGiftHistory] = useState(false);
  const [showMedals, setShowMedals] = useState(false);
  const [myItemsCategory, setMyItemsCategory] = useState<"frame" | "vehicle" | "entryEffect" | "chatBubble" | "soundWave" | "profileCard">("frame");

  const inventory = useQuery(api.shop.myInventory, { tokenOverride: getActiveToken() ?? deviceId });
  const equipped = useQuery(api.shop.getEquippedAssets, { userId: userId as Id<"users"> });
  const itemCounts = useQuery(api.shop.countUserItems, { userId: userId as Id<"users"> });
  
  useEffect(() => {
    if (!isMe && userId) {
      recordVisit({ visitedUserId: userId as Id<"users">, source: "profile", tokenOverride: getActiveToken() ?? deviceId })
        .catch((e) => console.warn("[visit] record failed:", e));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, isMe]);

  if (profile === undefined) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#080411]/90 backdrop-blur-xl">
        <Loader2 className="animate-spin text-purple-500" size={40} />
      </div>
    );
  }
  if (!profile) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#080411]/90 backdrop-blur-xl">
        <p className="text-white font-bold">المستخدم غير موجود</p>
      </div>
    );
  }

  const vipLevel = profile.vip ?? 0;
  const equippedFrame = (equipped as any)?.frame;
  const equippedVipLevel = (profile as any).equippedVipFrameLevel || (vipLevel > 0 ? vipLevel : null);
  const equippedVipKey = equippedVipLevel ? `vip.frame.${equippedVipLevel}` : null;
  const equippedVipData = equippedVipKey ? (assetsFull as any)[equippedVipKey] : null;
  
  const finalFrameUrl = (equippedFrame?.imageUrl || null) ?? equippedVipData?.url ?? (equippedVipKey ? assets[equippedVipKey] : null) ?? null;
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
  const vipTopUrl = vipLevel > 0 ? (assets[`vip.top.full.${vipLevel}`] ?? assets[`vip.top.${vipLevel}`]) : null;

  const isOwner = profile.userNumber === 1;
  const isAdmin = profile.adminRole === "super" || profile.adminRole === "moderator";
  const charm = profile.totalReceived ?? 0;
  const wealth = profile.totalSent ?? 0;
  
  const stats = profile.stats ?? { visitors: 0, fans: 0, followers: 0, following: 0, medals: 0 };
  const medals = (profile as any).medals ?? [];
  const room = (profile as any).room;

  const handleAvatarUpload = (file: File) => { if (!isMe) return; setPendingFile(file); };
  const handleCroppedConfirm = async (croppedFile: File) => {
    setPendingFile(null);
    setUploading(true);
    try {
      const result = await smartUpload(croppedFile, { allowVideo: true });
      await saveAvatar({ avatarUrl: result.url, tokenOverride: getActiveToken() ?? deviceId });
      dialog.alert("تم تحديث الصورة");
    } catch (e: any) { dialog.alert(e?.message || "فشل الرفع"); }
    finally { setUploading(false); }
  };
  
  const handleCoverCroppedConfirm = async (croppedFile: File) => {
    setPendingCover(null);
    setUploading(true);
    try {
      const result = await smartUpload(croppedFile, { allowVideo: false });
      await saveCover({ coverUrl: result.url, tokenOverride: getActiveToken() ?? deviceId });
      dialog.alert("تم تحديث الغلاف");
    } catch (e: any) { dialog.alert(e?.message || "فشل الرفع"); }
    finally { setUploading(false); }
  };
  
  const handleSaveName = async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    try {
      await updateName({ name: trimmed, tokenOverride: getActiveToken() ?? deviceId });
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
      try { await removeAvatar({ tokenOverride: getActiveToken() ?? deviceId }); dialog.alert("تم"); }
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
    <div className="fixed inset-0 z-[200] flex flex-col bg-[#080411]" dir="rtl">
      
      {/* 🌟 الخلفية الزجاجية */}
      {vipBgUrl ? (
        <div className="absolute inset-0 bg-cover bg-center opacity-40 blur-sm" style={{ backgroundImage: `url(${vipBgUrl})` }} />
      ) : (
        <div className={`absolute inset-0 bg-gradient-to-b ${bgGradient} opacity-40 blur-sm`} />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-[#080411]/80 to-[#080411]" />

      <div className="relative z-10 flex flex-col h-full overflow-y-auto scrollbar-hide" onScroll={(e) => setScrollY(e.currentTarget.scrollTop)}>
        
        {/* ============ 1. الغلاف والصورة ============ */}
        <div className="relative aspect-[16/9] w-full flex-shrink-0">
          {profile.coverUrl ? (
            <AssetVideo url={profile.coverUrl} type="auto" className="w-full h-full object-cover" />
          ) : (
            <div className={`w-full h-full bg-gradient-to-b ${bgGradient}`} />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-[#080411]" />

          {/* أزرار الرجوع والمزيد */}
          <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 pt-12 pb-2 z-30">
            <button onClick={() => { if (viewUserId !== userIdProp) setViewUserId(userIdProp); else onClose(); }} className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white active:scale-95 transition">
              <ArrowRight size={20} />
            </button>
            <button onClick={() => setShowMoreMenu((v) => !v)} className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white active:scale-95 transition">
              <MoreHorizontal size={20} />
            </button>
          </div>

          {/* القمة المزخرفة VIP */}
          {vipTopUrl && (
            <VipTopOrnament url={vipTopUrl} assetFull={assetsFull[`vip.top.full.${vipLevel}`] ?? assetsFull[`vip.top.${vipLevel}`]} className="z-[5]" fadeOut={Math.max(0, 1 - scrollY / 80)} />
          )}
        </div>

        {/* ============ 2. الصورة الشخصية والاسم ============ */}
        <div className="px-5 flex flex-col items-center -mt-16 relative z-20">
          <div className="relative group">
            <div className="absolute inset-0 bg-purple-500 rounded-full blur-2xl opacity-20 group-hover:opacity-40 transition-opacity" />
            <div onClick={handleAvatarClick} className="relative active:scale-95 transition-transform cursor-pointer rounded-full border-4 border-[#080411] shadow-2xl">
              <VipAvatar
                src={profile?.avatarUrl}
                name={profile?.name ?? "?"}
                size={100}
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
              <div className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-purple-600 border-2 border-[#080411] flex items-center justify-center pointer-events-none z-20 shadow-lg">
                <Camera size={14} className="text-white" />
              </div>
            )}
          </div>

          {/* الاسم */}
          <div className="mt-4 flex flex-col items-center gap-1 w-full">
            {editingName ? (
              <div className="flex items-center gap-2 w-full max-w-[200px]">
                <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={profile.name ?? ""} className="flex-1 bg-white/10 border border-white/20 rounded-xl px-3 py-1.5 text-white text-sm text-center outline-none focus:border-purple-400" autoFocus />
                <button onClick={handleSaveName} className="px-3 py-1.5 bg-purple-600 rounded-xl text-white text-xs font-black">حفظ</button>
                <button onClick={() => setEditingName(false)} className="px-3 py-1.5 bg-white/10 rounded-xl text-white text-xs">إلغاء</button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <UserName name={profile.name ?? "ضيف"} adminRole={profile.adminRole} roomRole={isOwner ? "owner" : null} size="lg" nameClassName="text-white text-2xl font-black drop-shadow-lg" showCapsules={false} />
                {isMe && (
                  <button onClick={() => { setNewName(profile.name ?? ""); setEditingName(true); }} className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white/80 hover:bg-white/20">
                    <Pencil size={12} />
                  </button>
                )}
              </div>
            )}
            
            <div className="flex items-center gap-2 mt-1">
              {profile.userNumber && (
                <button onClick={handleCopy} className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md border border-white/10 text-white text-[11px] px-3 py-1 rounded-full active:scale-95 transition" dir="ltr">
                  <span>ID: {profile.userNumber}</span>
                  {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} className="opacity-70" />}
                </button>
              )}
              {profile.age && (
                <span className="text-[11px] bg-white/10 backdrop-blur-md border border-white/10 text-white/80 px-2.5 py-1 rounded-full">
                  {profile.age} سنة
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ============ 3. شارات VIP والمستويات ============ */}
        <div className="flex items-center justify-center gap-2 mt-4 px-6 flex-wrap">
          {vipLevel > 0 && (
            <div className="badge-glow px-3 py-1 bg-white/5 rounded-full border border-white/10 backdrop-blur-md">
              <img src={assets[`vip.logo.${vipLevel}`] ?? ""} alt={`VIP ${vipLevel}`} className="h-5 w-auto object-contain" />
            </div>
          )}
          {wealth > 0 && <LevelBadge kind="wealth" level={levelFromValue(wealth)} size="sm" />}
          {charm > 0 && <LevelBadge kind="charm" level={levelFromValue(charm)} size="sm" />}
        </div>

        {/* ============ 4. النبذة التعريفية ============ */}
        <div className="px-6 mt-4 text-center">
          {isMe ? (
            <button onClick={() => { setBioText(profile.bio || ""); setEditBio(true); }} className="w-full group">
              <p className="text-white/70 text-sm leading-relaxed max-w-[90%] mx-auto group-hover:text-white transition-colors">
                {profile.bio || "أضف نبذة تعريفية..."}
              </p>
            </button>
          ) : (
            <p className="text-white/70 text-sm leading-relaxed max-w-[90%] mx-auto">
              {profile.bio || "لا توجد نبذة تعريفية."}
            </p>
          )}
        </div>

        {/* ============ 5. الإحصائيات (Stats Card) ============ */}
        <div className="mx-4 mt-6 p-4 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl flex items-center justify-around">
          <InlineStat label="متابعين" value={stats.followers} onClick={() => setListMode("followers")} />
          <span className="w-px h-10 bg-white/10" />
          <InlineStat label="معجبين" value={stats.fans} onClick={() => setListMode("fans")} />
          <span className="w-px h-10 bg-white/10" />
          <InlineStat label="زوار" value={stats.visitors} onClick={isMe && onOpenVisits ? onOpenVisits : undefined} />
        </div>

        {/* ============ 6. التبويبات (Tabs) ============ */}
        <div className="sticky top-4 z-30 mx-4 mt-6 p-1.5 rounded-2xl bg-black/60 backdrop-blur-2xl border border-white/10 shadow-2xl flex items-center gap-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-black transition-all duration-300 ${
                tab === t.key
                  ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/30 scale-105"
                  : "text-white/50 hover:text-white hover:bg-white/5"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ============ 7. محتوى التبويبات ============ */}
        <div className="px-4 py-6 min-h-[300px] pb-32">
          {tab === "info" && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {lifePhotos && lifePhotos.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {lifePhotos.map((photo: any) => (
                    <div key={photo._id} className="aspect-square rounded-2xl overflow-hidden border border-white/10 relative group bg-white/5">
                      <AssetVideo url={photo.imageUrl} type="auto" className="w-full h-full object-cover" />
                      {isMe && (
                        <button onClick={async () => { if (!confirm("حذف هذه الصورة؟")) return; try { await removeLifePhoto({ photoId: photo._id, tokenOverride: getActiveToken() ?? deviceId }); } catch (e: any) { dialog.alert(e?.message); } }} className="absolute top-1 left-1 w-6 h-6 rounded-full bg-red-500/80 backdrop-blur flex items-center justify-center text-white active:scale-95"><Trash2 size={12} /></button>
                      )}
                    </div>
                  ))}
                  {isMe && (lifePhotos?.length ?? 0) < 9 && (
                    <label className="aspect-square rounded-2xl bg-white/5 border border-dashed border-white/20 flex items-center justify-center cursor-pointer active:scale-95 transition">
                      <input type="file" accept="image/*" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; try { const res = await smartUpload(f, { allowVideo: false }); await addLifePhoto({ imageUrl: res.url, tokenOverride: getActiveToken() ?? deviceId }); } catch (err: any) { dialog.alert(err?.message); } if (e.target) e.target.value = ""; }} />
                      <Plus size={24} className="text-white/40" />
                    </label>
                  )}
                </div>
              )}
              <Card tone="default" padding="lg">
                <div className="flex flex-col items-center justify-center py-6 text-white/40">
                  <Award size={40} className="mb-3 opacity-40 text-amber-400" />
                  <p className="text-sm font-black text-white/70">الأساطير والأوسمة</p>
                  <div className="flex gap-2 mt-4"><MedalsRow medals={medals} max={5} size="sm" /></div>
                </div>
              </Card>
            </div>
          )}

          {tab === "assets" && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {equipped?.vehicle && (
                <div className="relative w-full rounded-3xl overflow-hidden border border-white/10 p-6 flex flex-col items-center justify-center bg-white/5 min-h-[220px]">
                  <span className="absolute top-4 right-4 bg-amber-500/20 text-amber-300 border border-amber-500/30 px-3 py-1 rounded-full text-[10px] font-black z-10">المركبة المفعلة</span>
                  <AssetVideo url={equipped.vehicle.imageUrl} type={(equipped.vehicle as any).previewType || "image"} className="w-full h-40 drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]" />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <AssetBox label="إطار" count={itemCounts?.frame ?? 0} onOpen={isMe ? () => { setMyItemsCategory("frame"); setShowMyItems(true); } : undefined} />
                <AssetBox label="مركبة" count={itemCounts?.vehicle ?? 0} onOpen={isMe ? () => { setMyItemsCategory("vehicle"); setShowMyItems(true); } : undefined} />
                <AssetBox label="فقاعة دردشة" count={itemCounts?.chatBubble ?? 0} onOpen={isMe ? () => { setMyItemsCategory("chatBubble"); setShowMyItems(true); } : undefined} />
                <AssetBox label="تأثير دخول" count={itemCounts?.entryEffect ?? 0} onOpen={isMe ? () => { setMyItemsCategory("entryEffect"); setShowMyItems(true); } : undefined} />
              </div>
            </div>
          )}

          {tab === "relation" && (
            <Card tone="default" padding="lg" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-col items-center justify-center py-8 text-white/40">
                <Heart size={40} className="mb-3 opacity-40 text-pink-500" />
                <p className="text-sm font-black text-white/70">إنها فارغة هنا</p>
                <p className="text-xs mt-1">نؤمن بأن الحب سيأتي في النهاية</p>
              </div>
            </Card>
          )}

          {tab === "moments" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              {momentsFeed === undefined ? (
                <div className="flex justify-center py-12"><Loader2 size={28} className="animate-spin text-purple-500" /></div>
              ) : momentsFeed.length === 0 ? (
                <Card tone="default" padding="lg">
                  <div className="flex flex-col items-center justify-center py-8 text-white/40">
                    <ImageIcon size={40} className="mb-3 opacity-40" />
                    <p className="text-sm">لا توجد منشورات</p>
                  </div>
                </Card>
              ) : (
                <div className="grid grid-cols-3 gap-1">
                  {momentsFeed.map((m: any) => (
                    <div key={m._id} className="aspect-square rounded-lg overflow-hidden bg-white/5 border border-white/10 relative">
                      {m.imageUrls?.[0] ? <AssetVideo url={m.imageUrls[0]} type="auto" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center p-2"><p className="text-white/60 text-[9px] text-center">{m.text}</p></div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ============ 8. شريط الأزرار السفلي العائم ============ */}
        {!isMe && (
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[60] flex items-center justify-center gap-4 px-6 py-3 rounded-full bg-black/60 backdrop-blur-2xl border border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.8)]">
            <button
              onClick={async () => {
                if (friendStatus?.status === "friends" || isFollowing) {
                  const res = await openWith({ otherUserId: userId as Id<"users">, tokenOverride: getActiveToken() ?? deviceId });
                  setDmConversationId(res.conversationId);
                } else {
                  await toggleFollow({ tokenOverride: getActiveToken() ?? deviceId, targetUserId: userId as Id<"users"> });
                }
              }}
              className={`min-w-[50px] min-h-[50px] rounded-full flex items-center justify-center text-white shadow-lg active:scale-90 transition ${(friendStatus?.status === "friends" || isFollowing) ? "bg-gradient-to-br from-blue-500 to-indigo-600" : "bg-gradient-to-br from-emerald-500 to-teal-600"}`}
            >
              {(friendStatus?.status === "friends" || isFollowing) ? <MessageCircle size={24} /> : <UserPlus size={24} />}
            </button>

            <button
              onClick={async () => await toggleLikeMut({ tokenOverride: getActiveToken() ?? deviceId, targetUserId: userId as Id<"users"> })}
              className={`min-w-[50px] min-h-[50px] rounded-full flex items-center justify-center shadow-lg active:scale-90 transition ${isLiked ? "bg-gradient-to-br from-pink-500 to-rose-600 text-white" : "bg-white/10 border border-white/20 text-pink-400"}`}
            >
              <Heart size={24} fill={isLiked ? "currentColor" : "none"} />
            </button>

            <button onClick={onOpenGift} className="min-w-[50px] min-h-[50px] rounded-full bg-gradient-to-br from-purple-500 to-fuchsia-600 flex items-center justify-center text-white shadow-lg active:scale-90 transition">
              <Gift size={24} />
            </button>
          </div>
        )}
      </div>

      {/* ============ Modals & Overlays ============ */}
      {editBio && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-end justify-center" onClick={() => setEditBio(false)}>
          <div className="w-full max-w-md bg-[#151b24] rounded-t-3xl p-5 border-t border-white/10 animate-in slide-in-from-bottom duration-300" onClick={(e) => e.stopPropagation()} dir="rtl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold text-lg">تعديل النبذة التعريفية</h3>
              <button onClick={() => setEditBio(false)} className="text-white/50 hover:text-white p-1"><X size={20} /></button>
            </div>
            <textarea value={bioText} onChange={(e) => setBioText(e.target.value.slice(0, 150))} placeholder="اكتب شيئاً عن نفسك..." className="w-full h-32 bg-black/30 border border-white/10 rounded-xl p-3 text-white text-sm outline-none focus:border-purple-500 resize-none" />
            <div className="flex justify-between items-center mt-2">
              <span className="text-white/40 text-xs">{bioText.length}/150</span>
              <button onClick={async () => { try { await updateBioMut({ bio: bioText, tokenOverride: getActiveToken() ?? deviceId }); setEditBio(false); } catch (e: any) { dialog.alert(e?.message || "فشل الحفظ"); } }} className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-2 rounded-xl font-bold text-sm active:scale-95 transition">حفظ</button>
            </div>
          </div>
        </div>
      )}

      {/* Other Modals */}
      {dmConversationId && <ChatThreadSheet conversationId={dmConversationId as any} onClose={() => setDmConversationId(null)} />}
      {listMode && <UserListSheet userId={userId} mode={listMode} onClose={() => setListMode(null)} onUserClick={(id) => { setListMode(null); setViewUserId(id); }} />}
      {showGiftHistory && <GiftHistorySheet onClose={() => setShowGiftHistory(false)} onUserClick={(id) => setViewUserId(id)} userId={userId as Id<"users">} />}
      {showMedals && <MedalsSheet onClose={() => setShowMedals(false)} userId={userId as Id<"users">} />}
      {showMyItems && <MyItemsSheet onClose={() => setShowMyItems(false)} initialCategory={myItemsCategory} />}
      
      {/* Croppers */}
      {pendingFile && <ImageCropper file={pendingFile} aspect={1} shape="circle" onCancel={() => setPendingFile(null)} onConfirm={handleCroppedConfirm} />}
      {pendingCover && <ImageCropper file={pendingCover} aspect={16/9} shape="rect" onCancel={() => setPendingCover(null)} onConfirm={handleCoverCroppedConfirm} />}
    </div>
  );
}

// ============ Inline Stat ============
function InlineStat({ label, value, onClick }: { label: string; value: number; onClick?: () => void }) {
  const Comp: any = onClick ? "button" : "div";
  return (
    <Comp onClick={onClick} className={`flex flex-col items-center gap-1 ${onClick ? "active:scale-95 transition" : ""}`}>
      <span className="text-white text-xl font-black tabular-nums drop-shadow-md" dir="ltr">
        {formatNumber(value)}
      </span>
      <span className="text-white/50 text-xs font-bold">{label}</span>
    </Comp>
  );
}

// ============ Asset Box Component ============
function AssetBox({ label, count, onOpen }: { label: string; count: number; onOpen?: () => void }) {
  return (
    <button onClick={onOpen} disabled={!onOpen} className="rounded-2xl bg-white/5 border border-white/10 p-4 flex flex-col items-center justify-center gap-2 active:scale-95 transition hover:bg-white/10 disabled:opacity-50">
      <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
        <Star size={18} className="text-purple-300" />
      </div>
      <span className="text-white text-xs font-black">{label}</span>
      <span className="text-white/50 text-[10px] font-black bg-black/30 px-2 py-0.5 rounded-full">{count}</span>
    </button>
  );
}
