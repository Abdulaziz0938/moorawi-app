import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAssets, resolveAsset } from "../lib/assets";
import type { Id } from "../../convex/_generated/dataModel";
import { getDeviceId } from "../lib/device";
import { uploadToCloudinary } from "../lib/cloudinary";
import { dialog } from "../lib/dialog";
import {
  X, Home, Gift, MessageCircle, UserPlus, Crown, Loader2,
  Pencil, Camera, Eye, Trash2, ImageIcon, Copy, Check,
} from "lucide-react";
import { UserName } from "./UserBadges";
import LevelBadge from "./LevelBadge";
import MedalsRow from "./MedalsRow";
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
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<Tab>("info");

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
  const bgGradient = VIP_BG[vipLevel] || VIP_BG[0];
  const isOwner = profile.userNumber === 1;
  const isAdmin = profile.adminRole === "super" || profile.adminRole === "moderator";
  const charm = profile.totalReceived ?? 0;
  const wealth = profile.totalSent ?? 0;
  const stats = profile.stats ?? { visitors: 0, fans: 0, followers: 0, following: 0, medals: 0 };
  const medals = (profile as any).medals ?? [];
  const room = (profile as any).room;

  const handleAvatarUpload = async (file: File) => {
    if (!isMe) return;
    setUploading(true);
    try {
      const result = await uploadToCloudinary(file);
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

        {/* ============ 1. Avatar ============ */}
        <div className="flex justify-center mt-4">
          <div className="relative">
            <button
              onClick={handleAvatarClick}
              className="w-32 h-32 rounded-full overflow-hidden bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-white text-4xl font-black ring-4 ring-white/30 shadow-2xl active:scale-95 transition-transform"
            >
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <span>{(profile.name?.[0] ?? "?") || "?"}</span>
              )}
            </button>
            {isMe && (
              <div className="absolute bottom-1 right-1 w-7 h-7 rounded-full bg-black/60 backdrop-blur-xl border border-white/30 flex items-center justify-center pointer-events-none">
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

        {/* ============ 4. Charm + Wealth + VIP ============ */}
        <div className="flex items-center justify-center gap-2 mt-3 flex-wrap">
          {charm > 0 && <LevelBadge kind="charm" level={levelFromValue(charm)} size="sm" />}
          {wealth > 0 && <LevelBadge kind="wealth" level={levelFromValue(wealth)} size="sm" />}
          {vipLevel > 0 && (
            <div className="badge-glow">
              <img src={resolveAsset(assets, `vip.banner.${vipLevel}`, `/vip/vip${vipLevel}.png`)} alt={`VIP ${vipLevel}`} className="h-6 w-auto object-contain" draggable={false} />
            </div>
          )}
        </div>

        {/* ============ 5. Bio ============ */}
        {profile.bio && (
          <p className="text-white/85 text-xs text-center px-8 mt-3 leading-relaxed">{profile.bio}</p>
        )}

        {/* ============ 6. Stats (3) ============ */}
        <div className="mx-4 mt-4 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl grid grid-cols-3">
          <StatBox label="المتابعين" value={stats.followers} />
          <StatBox label="المعجبين" value={stats.fans} />
          <StatBox label="الزوار" value={stats.visitors} />
        </div>

        {/* ============ 7. Medals ============ */}
        {medals.length > 0 && (
          <div className="mx-4 mt-3 flex justify-center">
            <MedalsRow medals={medals} max={10} size="sm" />
          </div>
        )}

        {/* ============ 8. My Room ============ */}
        {room && (
          <div className="mx-4 mt-4">
            <p className="text-white/60 text-xs font-black mb-2 text-right">غرفتي</p>
            <button
              onClick={() => { if (onEnterRoom && room._id) { onClose(); onEnterRoom(room._id); } }}
              className="w-full rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 p-3 flex items-center gap-3 hover:bg-white/15 transition active:scale-[0.98]"
            >
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
            </button>
          </div>
        )}

        {/* ============ 9. Tabs ============ */}
        <div className="mx-4 mt-4 flex items-center justify-around border-b border-white/10">
          {[
            { key: "info" as Tab, label: "معلومات" },
            { key: "assets" as Tab, label: "الأصول" },
            { key: "relation" as Tab, label: "العلاقة" },
            { key: "moments" as Tab, label: "لحظات 0" },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`relative py-2 px-1 text-xs font-black transition ${
                tab === t.key ? "text-white" : "text-white/50 hover:text-white/75"
              }`}
            >
              {t.label}
              {tab === t.key && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-white" />
              )}
            </button>
          ))}
        </div>

        {/* ============ Tab content ============ */}
        <div className="px-4 py-4 min-h-[200px]">
          {tab === "info" && (
            <div className="space-y-3">
              {/* صور الحياة */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-white/60 text-xs font-black">صور الحياة</p>
                  <span className="text-white/40 text-[10px]" dir="ltr">0/9</span>
                </div>
                <div className="flex gap-2 overflow-x-auto">
                  {isMe ? (
                    <div className="w-20 h-20 rounded-xl bg-white/5 border border-dashed border-white/20 flex items-center justify-center flex-shrink-0">
                      <UserPlus size={20} className="text-white/40" />
                    </div>
                  ) : (
                    <p className="text-white/40 text-xs py-4">لا توجد صور</p>
                  )}
                </div>
              </div>

              {/* أفضل داعم */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
                <p className="text-white/60 text-xs font-black mb-2">أفضل داعم</p>
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="aspect-[5/4] rounded-xl bg-gradient-to-br from-amber-900/30 to-black/40 border border-amber-500/20 flex flex-col items-center justify-center gap-1">
                      <div className="w-8 h-8 rounded-full bg-white/10 border border-white/20" />
                      <p className="text-white/50 text-[9px]">انتظر...</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* شرف */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
                <p className="text-white/60 text-xs font-black mb-2">شرف</p>
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
              </div>
            </div>
          )}

          {tab === "assets" && (
            <div className="space-y-3">
              <AssetCategory label="هدية" count={0} tone="purple" />
              <AssetCategory label="أوسمة" count={medals.length} tone="amber" />
              <AssetCategory label="إطار" count={0} tone="emerald" />
              <AssetCategory label="مركبة" count={0} tone="blue" />
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
            src={profile.avatarUrl}
            alt=""
            className="max-w-[95vw] max-h-[85vh] object-contain rounded-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

// ============ StatBox ============
function StatBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-center gap-0.5 py-3">
      <p className="text-white text-base font-black tabular-nums" dir="ltr">{formatNumber(value)}</p>
      <p className="text-white/60 text-[10px]">{label}</p>
    </div>
  );
}

// ============ AssetCategory ============
function AssetCategory({ label, count, tone }: { label: string; count: number; tone: "purple" | "amber" | "emerald" | "blue" }) {
  const toneMap = {
    purple:  { bg: "from-purple-900/30 to-purple-950/50",   border: "border-purple-500/30",  text: "text-purple-200" },
    amber:   { bg: "from-amber-900/30 to-amber-950/50",     border: "border-amber-500/30",   text: "text-amber-200" },
    emerald: { bg: "from-emerald-900/30 to-emerald-950/50", border: "border-emerald-500/30", text: "text-emerald-200" },
    blue:    { bg: "from-blue-900/30 to-blue-950/50",       border: "border-blue-500/30",    text: "text-blue-200" },
  }[tone];
  return (
    <div className={`rounded-2xl border ${toneMap.border} bg-gradient-to-br ${toneMap.bg} p-3 flex items-center justify-between`}>
      <div className="flex items-center gap-2">
        <div className={`w-9 h-9 rounded-xl bg-black/30 flex items-center justify-center`}>
          <span className={`${toneMap.text} text-sm font-black`}>0</span>
        </div>
        <p className="text-white text-sm font-bold">{label}</p>
      </div>
      <p className={`text-xs font-black ${toneMap.text}`}>0</p>
    </div>
  );
}
