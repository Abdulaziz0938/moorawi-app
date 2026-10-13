import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAssets, resolveAsset, useAssetsFull } from "../lib/assets";
import type { Id } from "../../convex/_generated/dataModel";
import { getDeviceId } from "../lib/device";
import { uploadToCloudinary } from "../lib/cloudinary";
import { dialog } from "../lib/dialog";
import {
  X, Home, Gift, MessageCircle, UserPlus, Crown, Loader2,
  Pencil, Camera, Eye, Trash2, ImageIcon, Copy, Check, Radio, Send, Inbox, Coins,
    Users, Heart, Award, Star, ChevronRight, Wand2 } from "lucide-react";
import { UserName } from "./UserBadges";
import LevelBadge from "./LevelBadge";
import VipAvatar from "./ui/VipAvatar";
import MedalsRow from "./MedalsRow";
import ImageCropper from "./ImageCropper";
import Card from "./ui/Card";
import MyItemsSheet from "./MyItemsSheet";
import StatBadge from "./ui/StatBadge";
import SectionTitle from "./ui/SectionTitle";
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
  userId, isMe, onClose, onOpenGift,
  onOpenAdminPanel, onOpenOwnerPanel, onEnterRoom,
}: Props) {
  const deviceId = getDeviceId();
  const profile = useQuery(api.profileFull.getFull, { userId: userId as Id<"users"> });
  const updateName = useMutation(api.users.updateName);
  const saveAvatar = useMutation(api.profiles.saveAvatar);
  const removeAvatar = useMutation(api.profiles.removeAvatar);

  const [editingName, setEditingName] = useState(false);
  const assets = useAssets();
  const [newName, setNewName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<Tab>("info");
  const [showMyItems, setShowMyItems] = useState(false);
  const [myItemsCategory, setMyItemsCategory] = useState<"frame" | "vehicle" | "entryEffect" | "chatBubble" | "soundWave" | "profileCard">("frame");
  const inventory = useQuery(api.shop.myInventory, { tokenOverride: deviceId });
  const equipped = useQuery(api.shop.getEquippedAssets, {
    userId: userId as Id<"users">,
  });
  const invCounts: Record<string, number> = {};
  for (const inv of inventory ?? []) {
    invCounts[inv.category] = (invCounts[inv.category] ?? 0) + 1;
  }

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
  const assetsFull = useAssetsFull();
  const vipFrameKey = vipLevel > 0 ? `vip.frame.${vipLevel}` : null;
  const vipFrameData = vipFrameKey ? assetsFull[vipFrameKey] : null;
  const vipFrameUrl = vipFrameData?.url ?? null;
  const finalFrameUrl = equippedFrame?.imageUrl ?? vipFrameUrl;
  // [ezo-frame] Yalla/SUGO standard: scale + offset from DB
  const finalFrameScale = equippedFrame?.frameScale ?? vipFrameData?.frameScale ?? 3.0;
  const finalFrameOffsetX = equippedFrame?.frameOffsetX ?? vipFrameData?.frameOffsetX ?? 0;
  const finalFrameOffsetY = equippedFrame?.frameOffsetY ?? vipFrameData?.frameOffsetY ?? 0;
  const bgGradient = VIP_BG[vipLevel] || VIP_BG[0];
  const isOwner = profile.userNumber === 1;
  const isAdmin = profile.adminRole === "super" || profile.adminRole === "moderator";
  const charm = profile.totalReceived ?? 0;
  const wealth = profile.totalSent ?? 0;
  const stats = profile.stats ?? { visitors: 0, fans: 0, followers: 0, following: 0, medals: 0 };
  const giftStats = (profile as any).giftStats ?? {
    sent: { count: 0, total: 0, transactions: 0 },
    received: { count: 0, total: 0, transactions: 0 },
  };
  const medals = (profile as any).medals ?? [];
  const room = (profile as any).room;

  // [moorawi-cropper] بدل الرفع المباشر — نفتح المقصّ أولاً
  const handleAvatarUpload = (file: File) => {
    if (!isMe) return;
    setPendingFile(file);
  };

  // بعد القصّ — نرفع الملف المقصوص فقط
  const handleCroppedConfirm = async (croppedFile: File) => {
    setPendingFile(null);
    setUploading(true);
    try {
      const result = await uploadToCloudinary(croppedFile);
      await saveAvatar({ avatarUrl: result.url, tokenOverride: deviceId });
      dialog.alert("تم تحديث الصورة");
    } catch (e: any) {
      dialog.alert(e?.message || "فشل الرفع");
    } finally {
      setUploading(false);
    }
  };

  const handleSaveName = async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    try {
      await updateName({ name: trimmed, tokenOverride: deviceId });
      setEditingName(false);
      dialog.alert("تم حفظ الاسم");
    } catch (e: any) {
      dialog.alert(e?.message || "فشل الحفظ");
    }
  };

  const handleAvatarClick = () => {
    if (isMe) setShowAvatarMenu(true);
    else if (profile.avatarUrl) setShowImagePreview(true);
  };

  const handleRemoveAvatar = async () => {
    setShowAvatarMenu(false);
    dialog.confirm("هل أنت متأكد من حذف الصورة؟", async () => {
      try {
        await removeAvatar({ tokenOverride: deviceId });
        dialog.alert("تم حذف الصورة");
      } catch (e: any) {
        dialog.alert(e?.message || "فشل الحذف");
      }
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

  return (
    <div className="fixed inset-0 z-[200] flex flex-col" dir="rtl">
      <div className={`absolute inset-0 bg-gradient-to-b ${bgGradient}`} />
      <div className="absolute inset-0 bg-black/40 backdrop-blur-2xl" />

      <div className="relative z-10 flex flex-col h-full overflow-y-auto">
        {/* ============ Header buttons ============ */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="w-10 h-10 rounded-full bg-white/15 backdrop-blur-xl border border-white/25 flex items-center justify-center text-white hover:bg-white/25 transition active:scale-95 z-20"
            aria-label="إغلاق"
          >
            <X size={20} />
          </button>

          <div className="flex items-center gap-2">
            {isMe && isOwner && (
              <button onClick={onOpenOwnerPanel} className="h-10 px-4 rounded-full bg-gradient-to-r from-yellow-400 to-amber-500 shadow-lg flex items-center gap-2 text-white hover:opacity-90 transition">
                <Crown size={16} />
                <span className="text-xs font-black">لوحة المالك</span>
              </button>
            )}
            {isMe && isAdmin && !isOwner && (
              <button onClick={onOpenAdminPanel} className="h-10 px-4 rounded-full bg-white/15 backdrop-blur border border-sky-300/40 flex items-center gap-2 text-white hover:bg-white/25 transition">
                <Crown size={16} className="text-sky-300" />
                <span className="text-xs font-black">لوحة الأدمن</span>
              </button>
            )}
          </div>
        </div>

        {/* ============ 1. Avatar (VIP Halo + Frame) ============ */}
        <div className="flex justify-center mt-4">
          <div className="relative">
            <div onClick={handleAvatarClick} className="active:scale-95 transition-transform cursor-pointer">
              <VipAvatar
                  src={profile?.avatarUrl}
                  name={profile?.name ?? "?"}
                  size={128}
                  vip={vipLevel}
                  ring={vipLevel === 0}
                  customFrameUrl={finalFrameUrl}
                  frameScale={finalFrameScale}
                  frameOffsetX={finalFrameOffsetX}
                  frameOffsetY={finalFrameOffsetY}
                />
            </div>
            {isMe && (
              <div className="absolute bottom-1 right-1 w-7 h-7 rounded-full bg-black/60 backdrop-blur-xl border border-white/30 flex items-center justify-center pointer-events-none z-20">
                <Camera size={12} className="text-white/90" />
              </div>
            )}
          </div>
        </div>

        {/* ============ 2. Name ============ */}
        <div className="flex flex-col items-center mt-3 px-4">
          {editingName ? (
            <div className="flex items-center gap-2 w-full max-w-xs">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={profile.name ?? ""}
                className="flex-1 bg-white/15 backdrop-blur border border-white/25 rounded-xl px-3 py-2 text-white text-sm text-center outline-none focus:border-purple-400"
                autoFocus
              />
              <button onClick={handleSaveName} className="px-3 py-2 bg-purple-600 rounded-xl text-white text-xs font-black">حفظ</button>
              <button onClick={() => setEditingName(false)} className="px-3 py-2 bg-white/15 rounded-xl text-white text-xs">إلغاء</button>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <UserName
                name={profile.name ?? "ضيف"}
                adminRole={profile.adminRole}
                roomRole={isOwner ? "owner" : null}
                size="lg"
                nameClassName="text-white text-xl drop-shadow"
                showCapsules={false}
              />
              {isMe && (
                <button onClick={() => { setNewName(profile.name ?? ""); setEditingName(true); }} className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center text-white/80 hover:bg-white/25 flex-shrink-0">
                  <Pencil size={12} />
                </button>
              )}
            </div>
          )}
        </div>

        {/* ============ 3. ID + copy + chips ============ */}
        <div className="flex items-center justify-center gap-1.5 mt-2 flex-wrap">
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
            <span className="text-[10px] bg-white/15 backdrop-blur border border-white/20 text-white px-2 py-0.5 rounded-full">{profile.age} سنة</span>
          )}
          {profile.gender && (
            <span className="text-[10px] bg-white/15 backdrop-blur border border-white/20 text-white px-2 py-0.5 rounded-full">
              {profile.gender === "male" ? "♂ ذكر" : profile.gender === "female" ? "♀ أنثى" : "آخر"}
            </span>
          )}
          {profile.country && (
            <span className="text-[10px] bg-white/15 backdrop-blur border border-white/20 text-white px-2 py-0.5 rounded-full">{profile.country}</span>
          )}
        </div>

        {/* ============ 3.5 Room actions ============ */}
        {(profile as any).ownedRoom && (
          <div className="flex items-center justify-center gap-2 mt-3 px-4">
            <button
              onClick={() => {
                if (onEnterRoom && (profile as any).ownedRoom) {
                  onEnterRoom((profile as any).ownedRoom._id);
                }
              }}
              className="rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2.5 text-white text-xs font-black flex items-center gap-2 active:scale-95 transition"
            >
              <Home size={14} />
              زيارة غرفة
            </button>
            {(profile as any).currentRoom && (
              <button
                onClick={() => {
                  if (onEnterRoom && (profile as any).currentRoom) {
                    onEnterRoom((profile as any).currentRoom._id);
                  }
                }}
                className="rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-2.5 text-white text-xs font-black flex items-center gap-2 active:scale-95 transition"
                title={`يدخل الآن غرفة ${(profile as any).currentRoom.name}`}
              >
                <Radio size={14} />
                تتبع
              </button>
            )}
          </div>
        )}

        {/* ============ 4. Charm + Wealth + VIP ============ */}
        <div className="flex items-center justify-center gap-2 mt-3 flex-wrap">
          {charm > 0 && <LevelBadge kind="charm" level={levelFromValue(charm)} size="sm" />}
          {wealth > 0 && <LevelBadge kind="wealth" level={levelFromValue(wealth)} size="sm" />}
          {vipLevel > 0 && (
            <div className="badge-glow">
              <img src={assets[`vip.logo.${vipLevel}`] ?? ""} alt={`VIP ${vipLevel}`} className="h-6 w-auto object-contain" draggable={false} />
            </div>
          )}
        
          {(equipped as any)?.vehicle?.imageUrl && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-400/40 backdrop-blur-xl">
              <img
                src={(equipped as any).vehicle.imageUrl}
                alt={(equipped as any).vehicle.name}
                className="h-4 w-auto object-contain"
                draggable={false}
              />
              <span className="text-[10px] font-black text-cyan-200">{(equipped as any).vehicle.name}</span>
            </div>
          )}
          {(equipped as any)?.chatBubble?.imageUrl && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-400/40 backdrop-blur-xl">
              <MessageCircle size={11} className="text-emerald-300" />
              <span className="text-[10px] font-black text-emerald-200">{(equipped as any).chatBubble.name}</span>
            </div>
          )}
          {(equipped as any)?.entryEffect?.imageUrl && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-pink-500/20 to-purple-500/20 border border-pink-400/40 backdrop-blur-xl">
              <Wand2 size={11} className="text-pink-300" />
              <span className="text-[10px] font-black text-pink-200">دخولية</span>
            </div>
          )}
        </div>

        {/* ============ 5. Bio ============ */}
        {profile.bio && (
          <p className="text-white/85 text-xs text-center px-8 mt-3 leading-relaxed">{profile.bio}</p>
        )}

          {/* ============ 6. Stats ============ */}
          <div className="mx-4 mt-5">
            <SectionTitle icon={Users} title="الإحصائيات" tone="purple" />
            <div className="grid grid-cols-3 gap-2">
              <StatBadge icon={Users} label="متابعين" value={formatNumber(stats.followers)} tone="purple" size="sm" />
              <StatBadge icon={Heart} label="معجبين" value={formatNumber(stats.fans)} tone="pink" size="sm" />
              <StatBadge icon={Eye} label="زوار" value={formatNumber(stats.visitors)} tone="default" size="sm" />
            </div>
          </div>

          {/* ============ 6.1. Gift Stats ============ */}
          <div className="mx-4 mt-5">
            <SectionTitle icon={Gift} title="الهدايا" tone="gold" />
            <div className="grid grid-cols-2 gap-3">
              <Card tone="pink" padding="md">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-pink-200 text-[10px] font-black">أرسل</span>
                  <Send size={14} className="text-pink-300" />
                </div>
                <p className="text-white text-lg font-black tabular-nums leading-tight" dir="ltr">
                  {formatNumber(giftStats.sent.count)}
                </p>
                <p className="text-pink-300 text-[10px] font-bold tabular-nums flex items-center gap-1 mt-0.5">
                  <Coins size={10} />
                  {formatNumber(giftStats.sent.total)}
                </p>
              </Card>
              <Card tone="emerald" padding="md">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-emerald-200 text-[10px] font-black">استلم</span>
                  <Inbox size={14} className="text-emerald-300" />
                </div>
                <p className="text-white text-lg font-black tabular-nums leading-tight" dir="ltr">
                  {formatNumber(giftStats.received.count)}
                </p>
                <p className="text-emerald-300 text-[10px] font-bold tabular-nums flex items-center gap-1 mt-0.5">
                  <Coins size={10} />
                  {formatNumber(giftStats.received.total)}
                </p>
              </Card>
            </div>
          </div>

          {/* ============ 7. Medals ============ */}
          {medals.length > 0 && (
            <div className="mx-4 mt-5">
              <SectionTitle icon={Award} title="الأوسمة" tone="gold" />
              <Card padding="md">
                <div className="flex justify-center">
                  <MedalsRow medals={medals} max={10} size="sm" />
                </div>
              </Card>
            </div>
          )}

          {/* ============ 8. My Room ============ */}
          {room && (
            <div className="mx-4 mt-5">
              <SectionTitle icon={Home} title="غرفتي" tone="purple" />
              <Card
                interactive
                onClick={() => { if (onEnterRoom && room._id) { onClose(); onEnterRoom(room._id); } }}
                padding="md"
              >
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl overflow-hidden bg-black/30 flex items-center justify-center flex-shrink-0">
                    {room.coverUrl ? (
                      <img src={room.coverUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Home size={24} className="text-white/70" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 text-right">
                    <p className="text-white text-sm font-black truncate">{room.name}</p>
                    <p className="text-white/50 text-[10px]" dir="ltr">ID:{room.roomNumber ?? "—"} • {room.memberCount} عضو</p>
                  </div>
                  <div className="px-2 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30">
                    <span className="text-[10px] font-black text-emerald-200">Lv.0</span>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* ============ 9. Tabs ============ */}
          <div className="mx-4 mt-5 flex items-center gap-1 p-1 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl">
            {[
              { key: "info" as Tab, label: "معلومات" },
              { key: "assets" as Tab, label: "الأصول" },
              { key: "relation" as Tab, label: "العلاقة" },
              { key: "moments" as Tab, label: "لحظات" },
            ].map((t) => (
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
                  <SectionTitle icon={ImageIcon} title="صور الحياة" action={{ label: "0/9", onClick: () => {} }} />
                  <div className="flex gap-2 overflow-x-auto">
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
                  <SectionTitle icon={Heart} title="أفضل داعم" tone="gold" />
                  <div className="grid grid-cols-3 gap-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="aspect-[5/4] rounded-xl bg-gradient-to-br from-amber-900/30 to-black/40 border border-amber-500/20 flex flex-col items-center justify-center gap-1">
                        <div className="w-8 h-8 rounded-full bg-white/10 border border-white/20" />
                        <p className="text-white/50 text-[9px]">انتظر...</p>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card padding="md">
                  <SectionTitle icon={Star} title="شرف" tone="purple" />
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl bg-gradient-to-br from-purple-700/40 to-purple-900/40 border border-purple-500/30 p-3 flex flex-col items-center">
                      <p className="text-white font-black text-lg" dir="ltr">Lv.{levelFromValue(charm)}</p>
                      <p className="text-white/60 text-[10px]">جاذبية</p>
                    </div>
                    <div className="rounded-xl bg-gradient-to-br from-amber-700/40 to-amber-900/40 border border-amber-500/30 p-3 flex flex-col items-center">
                      <p className="text-white font-black text-lg" dir="ltr">Lv.{levelFromValue(wealth)}</p>
                      <p className="text-white/60 text-[10px]">ثروة</p>
                    </div>
                  </div>
                </Card>
              </div>
            )}

          {tab === "assets" && (
              <div className="space-y-3">
                <AssetCategory label="هدية" count={0} tone="purple" />
                <AssetCategory label="أوسمة" count={medals.length} tone="gold" />
                <AssetCategory
                  label="إطار"
                  count={invCounts.frame ?? 0}
                  tone="emerald"
                  onClick={() => { setMyItemsCategory("frame"); setShowMyItems(true); }}
                />
                <AssetCategory
                  label="مركبة"
                  count={invCounts.vehicle ?? 0}
                  tone="default"
                  onClick={() => { setMyItemsCategory("vehicle"); setShowMyItems(true); }}
                />
                <AssetCategory
                  label="فقاعة دردشة"
                  count={invCounts.chatBubble ?? 0}
                  tone="pink"
                  onClick={() => { setMyItemsCategory("chatBubble"); setShowMyItems(true); }}
                />
                <AssetCategory
                  label="دخولية"
                  count={invCounts.entryEffect ?? 0}
                  tone="purple"
                  onClick={() => { setMyItemsCategory("entryEffect"); setShowMyItems(true); }}
                />
                <AssetCategory
                  label="موجات صوتية"
                  count={invCounts.soundWave ?? 0}
                  tone="default"
                  onClick={() => { setMyItemsCategory("soundWave"); setShowMyItems(true); }}
                />
                <AssetCategory
                  label="بطاقة الملف"
                  count={invCounts.profileCard ?? 0}
                  tone="gold"
                  onClick={() => { setMyItemsCategory("profileCard"); setShowMyItems(true); }}
                />
              </div>
            )}

          {tab === "relation" && (
            <div className="flex flex-col items-center justify-center py-12 text-white/40">
              <MessageCircle size={40} className="mb-3 opacity-40" />
              <p className="text-sm">لا توجد علاقة بعد</p>
            </div>
          )}

          {tab === "moments" && (
            <div className="flex flex-col items-center justify-center py-12 text-white/40">
              <ImageIcon size={40} className="mb-3 opacity-40" />
              <p className="text-sm">لا توجد منشورات</p>
            </div>
          )}
        </div>

        {/* ============ Action buttons (not me) ============ */}
        {!isMe && (
          <div className="mx-4 mb-6 flex items-center justify-center gap-4">
            <button onClick={onOpenGift} className="w-14 h-14 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white shadow-lg active:scale-90 transition">
              <Gift size={24} />
            </button>
            <button className="w-14 h-14 rounded-full bg-white/15 backdrop-blur border border-white/25 flex items-center justify-center text-white hover:bg-white/25 transition active:scale-90">
              <MessageCircle size={22} />
            </button>
            <button className="w-14 h-14 rounded-full bg-white/15 backdrop-blur border border-white/25 flex items-center justify-center text-white hover:bg-white/25 transition active:scale-90">
              <UserPlus size={22} />
            </button>
          </div>
        )}

        <div className="h-8" />
      </div>

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
              <Eye size={18} />
              عرض الصورة
            </button>
            <label className="w-full flex items-center gap-3 px-5 py-3.5 text-sm font-bold text-white hover:bg-white/10 cursor-pointer">
              {uploading ? <Loader2 size={18} className="animate-spin" /> : <ImageIcon size={18} />}
              {uploading ? "جاري الرفع..." : "تغيير الصورة"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
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
              <Trash2 size={18} />
              حذف الصورة
            </button>
          </div>
        </>
      )}

      {/* ============ Image Preview ============ */}
      {showImagePreview && profile.avatarUrl && (
        <div
          className="fixed inset-0 z-[260] flex items-center justify-center bg-black/95 backdrop-blur-md"
          onClick={() => setShowImagePreview(false)}
        >
          <button onClick={() => setShowImagePreview(false)} className="absolute top-4 right-4 w-11 h-11 rounded-full bg-white/15 backdrop-blur-xl border border-white/25 flex items-center justify-center text-white hover:bg-white/25 transition">
            <X size={22} />
          </button>
          <img
            src={profile?.avatarUrl || "/avatar.png"}
            alt=""
            className="max-w-[95vw] max-h-[85vh] object-contain rounded-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* [moorawi-cropper] مقصّ الصورة */}
      {pendingFile && (
        <ImageCropper
          file={pendingFile}
          aspect={1}
          shape="circle"
          onCancel={() => setPendingFile(null)}
          onConfirm={handleCroppedConfirm}
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

// ============ AssetCategory ============
function AssetCategory({
  label,
  count,
  tone,
  onClick,
}: {
  label: string;
  count: number;
  tone: "purple" | "gold" | "emerald" | "default" | "pink";
  onClick?: () => void;
}) {
  const inner = (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-xl bg-black/30 flex items-center justify-center">
          <span className="text-white text-sm font-black">{count}</span>
        </div>
        <p className="text-white text-sm font-bold">{label}</p>
      </div>
      {onClick ? (
        <ChevronRight size={18} className="text-white/40 rotate-180" />
      ) : (
        <p className="text-white/70 text-xs font-black">{count}</p>
      )}
    </div>
  );
  if (onClick) {
    return (
      <Card interactive tone={tone} onClick={onClick} padding="md">
        {inner}
      </Card>
    );
  }
  return <Card tone={tone} padding="md">{inner}</Card>;
}
