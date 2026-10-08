import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { getDeviceId } from "../lib/device";
import { uploadToCloudinary } from "../lib/cloudinary";
import { dialog } from "../lib/dialog";
import {
  X, Home, Shield, User as UserIcon, Gift, MessageCircle, UserPlus,
  Crown, Loader2, Pencil, Camera, ShieldCheck, Eye, Trash2, ImageIcon,
} from "lucide-react";
import { UserName } from "./UserBadges";

interface Props {
  userId: string;
  currentUserRole?: "owner" | "moderator" | "speaker" | "listener";
  isMe?: boolean;
  onClose: () => void;
  onOpenGift?: () => void;
  onOpenAdminPanel?: () => void;
  onOpenOwnerPanel?: () => void;
}

function formatNumber(n: number): string {
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

export default function ProfilePage({
  userId,
  isMe,
  onClose,
  onOpenGift,
  onOpenAdminPanel,
  onOpenOwnerPanel,
}: Props) {
  const deviceId = getDeviceId();
  const profile = useQuery(api.profiles.getById, { userId: userId as Id<"users"> });
  const updateName = useMutation(api.users.updateName);
  const saveAvatar = useMutation(api.profiles.saveAvatar);
  const removeAvatar = useMutation(api.profiles.removeAvatar);

  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(false);

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

  const vipLevel = profile.vip;
  const bgGradient = VIP_BG[vipLevel] || VIP_BG[0];
  const isOwner = profile.userNumber === 1;
  const isAdmin = profile.adminRole === "super" || profile.adminRole === "moderator";

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
    if (isMe) {
      setShowAvatarMenu(true);
    } else {
      if (profile.avatarUrl) setShowImagePreview(true);
    }
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

  return (
    <div className="fixed inset-0 z-[200] flex flex-col" dir="rtl">
      {/* Backdrop */}
      <div className={`absolute inset-0 bg-gradient-to-b ${bgGradient}`} />
      <div className="absolute inset-0 bg-black/40 backdrop-blur-2xl" />

      {/* Content */}
      <div className="relative z-10 flex flex-col h-full overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/15 backdrop-blur-xl border border-white/25 flex items-center justify-center text-white hover:bg-white/25 transition active:scale-95"
          >
            <X size={20} />
          </button>

          {isMe && (
            <div className="flex items-center gap-2">
              {isAdmin && (
                <button
                  onClick={onOpenAdminPanel}
                  className="h-10 px-4 rounded-full bg-white/15 backdrop-blur-xl border border-sky-300/40 flex items-center gap-2 text-white hover:bg-white/25 transition"
                >
                  <ShieldCheck size={16} className="text-sky-300" />
                  <span className="text-xs font-black">لوحة الأدمن</span>
                </button>
              )}
              {isOwner && (
                <button
                  onClick={onOpenOwnerPanel}
                  className="h-10 px-4 rounded-full bg-gradient-to-r from-yellow-400 to-amber-500 shadow-lg flex items-center gap-2 text-white hover:opacity-90 transition"
                >
                  <Crown size={16} />
                  <span className="text-xs font-black">لوحة المالك</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Avatar */}
        <div className="flex justify-center mt-4">
          <div className="relative">
            <button
              onClick={handleAvatarClick}
              className="w-32 h-32 rounded-full overflow-hidden bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-white text-4xl font-black ring-4 ring-white/30 shadow-2xl active:scale-95 transition-transform"
            >
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <span>{profile.name[0] || "?"}</span>
              )}
            </button>
            {/* Hidden integrated camera indicator (only visual hint) */}
            {isMe && (
              <div className="absolute bottom-1 right-1 w-7 h-7 rounded-full bg-black/60 backdrop-blur-xl border border-white/30 flex items-center justify-center pointer-events-none">
                <Camera size={12} className="text-white/90" />
              </div>
            )}
          </div>
        </div>

        {/* Name */}
        <div className="flex flex-col items-center mt-4 px-4">
          {editingName ? (
            <div className="flex items-center gap-2 w-full max-w-xs">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={profile.name}
                className="flex-1 bg-white/15 backdrop-blur border border-white/25 rounded-xl px-3 py-2 text-white text-sm text-center outline-none focus:border-purple-400"
                autoFocus
              />
              <button onClick={handleSaveName} className="px-3 py-2 bg-purple-600 rounded-xl text-white text-xs font-black">
                حفظ
              </button>
              <button onClick={() => setEditingName(false)} className="px-3 py-2 bg-white/15 rounded-xl text-white text-xs">
                إلغاء
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <UserName
                name={profile.name}
                vip={profile.vip}
                adminRole={profile.adminRole}
                roomRole={isOwner ? "owner" : null}
                size="lg"
                nameClassName="text-white text-xl drop-shadow"
              />
              {isMe && (
                <button
                  onClick={() => { setNewName(profile.name); setEditingName(true); }}
                  className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center text-white/80 hover:bg-white/25 flex-shrink-0"
                >
                  <Pencil size={12} />
                </button>
              )}
            </div>
          )}

          {profile.userNumber !== null && (
            <p className="text-white/60 text-xs mt-1">ID:{profile.userNumber}</p>
          )}



          {profile.bio && (
            <p className="text-white/80 text-xs mt-3 text-center max-w-[90%]">{profile.bio}</p>
          )}

          {/* Info chips */}
          <div className="flex items-center gap-2 mt-3 flex-wrap justify-center">
            {profile.age && (
              <span className="text-[11px] bg-white/15 backdrop-blur border border-white/20 text-white px-3 py-1 rounded-full">
                {profile.age} سنة
              </span>
            )}
            {profile.gender && (
              <span className="text-[11px] bg-white/15 backdrop-blur border border-white/20 text-white px-3 py-1 rounded-full">
                {profile.gender === "male" ? "♂ ذكر" : profile.gender === "female" ? "♀ أنثى" : "آخر"}
              </span>
            )}
            {profile.country && (
              <span className="text-[11px] bg-white/15 backdrop-blur border border-white/20 text-white px-3 py-1 rounded-full">
                {profile.country}
              </span>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="mx-4 mt-6 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-4 grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-2xl">💎</p>
            <p className="text-white text-base font-black mt-1">{formatNumber(profile.totalSent)}</p>
            <p className="text-white/60 text-[10px]">ثروة</p>
          </div>
          <div>
            <p className="text-2xl">✨</p>
            <p className="text-white text-base font-black mt-1">{formatNumber(profile.totalReceived)}</p>
            <p className="text-white/60 text-[10px]">جاذبية</p>
          </div>
          <div>
            <p className="text-2xl">❤️</p>
            <p className="text-white text-base font-black mt-1">{formatNumber(profile.charms)}</p>
            <p className="text-white/60 text-[10px]">شارات</p>
          </div>
        </div>

        {/* Action buttons (not me) */}
        {!isMe && (
          <div className="mx-4 mt-5 flex items-center justify-center gap-4">
            <button
              onClick={onOpenGift}
              className="w-14 h-14 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white shadow-lg active:scale-90 transition"
            >
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

      {/* Avatar Menu (for me) */}
      {isMe && showAvatarMenu && (
        <>
          <div className="fixed inset-0 z-[250]" onClick={() => setShowAvatarMenu(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[260] w-[260px] rounded-3xl overflow-hidden shadow-2xl animate-[dialogPop_0.22s_cubic-bezier(0.34,1.56,0.64,1)]"
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

      {/* Image Preview (full screen) */}
      {showImagePreview && profile.avatarUrl && (
        <div
          className="fixed inset-0 z-[260] flex items-center justify-center bg-black/95 backdrop-blur-md animate-[fadeIn_0.2s_ease-out]"
          onClick={() => setShowImagePreview(false)}
        >
          <button
            onClick={() => setShowImagePreview(false)}
            className="absolute top-4 right-4 w-11 h-11 rounded-full bg-white/15 backdrop-blur-xl border border-white/25 flex items-center justify-center text-white hover:bg-white/25 transition"
          >
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
