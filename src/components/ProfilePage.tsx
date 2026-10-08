import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { getDeviceId } from "../lib/device";
import { uploadToCloudinary } from "../lib/cloudinary";
import { dialog } from "../lib/dialog";
import {
  X, Home, Shield, User as UserIcon, Gift, MessageCircle, UserPlus,
  Crown, Loader2, Pencil, Camera, Settings, ShieldCheck,
} from "lucide-react";

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

  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState("");
  const [uploading, setUploading] = useState(false);

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
            <div className="w-32 h-32 rounded-full overflow-hidden bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-white text-4xl font-black ring-4 ring-white/30 shadow-2xl">
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <span>{profile.name[0] || "?"}</span>
              )}
            </div>
            {isMe && (
              <label className="absolute bottom-0 right-0 w-10 h-10 rounded-full bg-purple-600 border-2 border-white flex items-center justify-center cursor-pointer hover:bg-purple-500 transition">
                {uploading ? (
                  <Loader2 size={16} className="animate-spin text-white" />
                ) : (
                  <Camera size={16} className="text-white" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleAvatarUpload(f);
                  }}
                />
              </label>
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
            <div className="flex items-center gap-2">
              {/* Room role icon */}
              {isOwner && <Home size={16} className="text-amber-400" fill="currentColor" />}
              {profile.adminRole === "moderator" && <Shield size={16} className="text-sky-400" fill="currentColor" />}
              {!isOwner && profile.adminRole !== "moderator" && <UserIcon size={14} className="text-emerald-400" fill="currentColor" />}

              <h1 className="text-white text-xl font-black drop-shadow">{profile.name}</h1>

              {isMe && (
                <button
                  onClick={() => { setNewName(profile.name); setEditingName(true); }}
                  className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center text-white/80 hover:bg-white/25"
                >
                  <Pencil size={12} />
                </button>
              )}
            </div>
          )}

          {profile.userNumber !== null && (
            <p className="text-white/60 text-xs mt-1">ID:{profile.userNumber}</p>
          )}

          {/* Vip Banner */}
          {vipLevel > 0 && (
            <img
              src={`/vip/vip${vipLevel}.png`}
              alt=""
              className="mt-3 h-7 w-auto object-contain drop-shadow-lg"
              draggable={false}
            />
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
    </div>
  );
}
