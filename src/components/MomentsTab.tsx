// [ezo-moments] تبويب اللحظات
import { useState, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { getDeviceId } from "../lib/device";
import { uploadToCloudinary } from "../lib/cloudinary";
import { dialog } from "../lib/dialog";
import UserAvatar from "./UserAvatar";
import MomentCreateSheet from "./MomentCreateSheet";
import MomentViewSheet from "./MomentViewSheet";
import Card from "./ui/Card";
import {
  Plus, Heart, MessageCircle, Loader2, Image as ImageIcon,
  MoreVertical, Trash2, Check,
} from "lucide-react";

interface Props {
  onUserClick?: (id: any) => void;
}

export default function MomentsTab({ onUserClick }: Props) {
  const deviceId = getDeviceId();
  const feed = useQuery(api.moments.feed, { tokenOverride: deviceId });
  const toggleLike = useMutation(api.moments.toggleLike);
  const removeMoment = useMutation(api.moments.remove);
  const [showCreate, setShowCreate] = useState(false);
  const [openMoment, setOpenMoment] = useState<any>(null);
  const [menuId, setMenuId] = useState<string | null>(null);

  const handleLike = async (m: any) => {
    try {
      await toggleLike({ momentId: m._id, tokenOverride: deviceId });
    } catch (e: any) { dialog.alert(e?.message || "فشل"); }
  };

  const handleDelete = (m: any) => {
    dialog.confirm("حذف هذا المنشور؟", async () => {
      try {
        await removeMoment({ momentId: m._id, tokenOverride: deviceId });
        setMenuId(null);
      } catch (e: any) { dialog.alert(e?.message || "فشل"); }
    }, "حذف", "حذف");
  };

  return (
    <div className="max-w-md mx-auto pb-24 min-h-screen" dir="rtl">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-gradient-to-b from-slate-950/95 to-slate-950/80 backdrop-blur-xl px-4 py-3 flex items-center justify-between border-b border-white/10">
        <h1 className="text-white text-lg font-black">لحظات</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white active:scale-95"
        >
          <Plus size={20} />
        </button>
      </div>

      {/* Feed */}
      <div className="px-4 py-3 space-y-4">
        {feed === undefined ? (
          <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-white/40" /></div>
        ) : feed.length === 0 ? (
<Card tone="default" padding="lg">
            <div className="text-center py-12 text-white/40">
              <ImageIcon size={56} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm font-black">لا توجد لحظات</p>
            <p className="text-xs mt-1">كن أول من ينشر لحظة</p>
            
              <button
                onClick={() => setShowCreate(true)}
                className="mt-4 px-6 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-sm font-black active:scale-95"
              >
                انشر الآن
              </button>
            </div>
          </Card>
        ) : (
          feed.map((m: any) => (
            <article key={m._id} className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl overflow-hidden">
              {/* Author */}
              <div className="flex items-center gap-3 p-3">
                <button
                  onClick={() => onUserClick?.(m.userId)}
                  className="flex items-center gap-3 flex-1 active:opacity-80"
                >
                  <div className="w-11 h-11 rounded-full overflow-hidden bg-purple-700 flex items-center justify-center flex-shrink-0">
                    <UserAvatar avatarUrl={m.author?.avatarUrl} name={m.author?.name} className="w-full h-full" />
                  </div>
                  <div className="flex-1 min-w-0 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {m.author?.verified && <Check size={11} className="text-blue-400" />}
                      <p className="text-white text-sm font-black truncate">{m.author?.name}</p>
                    </div>
                    <p className="text-white/40 text-[10px]">
                      {formatTime(m.createdAt)}
                    </p>
                  </div>
                </button>
                {m.isMine && (
                  <div className="relative">
                    <button
                      onClick={() => setMenuId(menuId === m._id ? null : m._id)}
                      className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-white/60"
                    >
                      <MoreVertical size={16} />
                    </button>
                    {menuId === m._id && (
                      <div className="absolute top-full left-0 mt-1 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden z-20">
                        <button
                          onClick={() => handleDelete(m)}
                          className="px-4 py-2.5 text-red-400 text-xs font-black flex items-center gap-2 hover:bg-white/5 whitespace-nowrap"
                        >
                          <Trash2 size={14} /> حذف
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Text */}
              {m.text && (
                <p className="px-4 pb-2 text-white/90 text-sm leading-relaxed whitespace-pre-wrap">
                  {m.text}
                </p>
              )}

              {/* Images */}
              {m.imageUrls.length > 0 && (
                <div className={`grid gap-1 ${
                  m.imageUrls.length === 1 ? "grid-cols-1" :
                  m.imageUrls.length === 2 ? "grid-cols-2" :
                  "grid-cols-3"
                }`}>
                  {m.imageUrls.slice(0, 9).map((url: string, i: number) => (
                    <button
                      key={i}
                      onClick={() => setOpenMoment(m)}
                      className="aspect-square bg-black/40 overflow-hidden"
                    >
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 px-4 py-3 border-t border-white/5">
                <button
                  onClick={() => handleLike(m)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition active:scale-95 ${
                    m.liked ? "bg-pink-500/20 text-pink-300" : "text-white/60 hover:bg-white/5"
                  }`}
                >
                  <Heart size={16} fill={m.liked ? "currentColor" : "none"} />
                  <span className="text-xs font-black tabular-nums">{m.likeCount}</span>
                </button>
                <button
                  onClick={() => setOpenMoment(m)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white/60 hover:bg-white/5 active:scale-95"
                >
                  <MessageCircle size={16} />
                  <span className="text-xs font-black tabular-nums">{m.commentCount}</span>
                </button>
              </div>
            </article>
          ))
        )}
      </div>

      {/* Modals */}
      {showCreate && <MomentCreateSheet onClose={() => setShowCreate(false)} />}
      {openMoment && (
        <MomentViewSheet
          momentId={openMoment._id}
          onClose={() => setOpenMoment(null)}
          onUserClick={onUserClick}
        />
      )}
    </div>
  );
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const diff = Date.now() - ts;
  if (diff < 60_000) return "الآن";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} د`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} س`;
  if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)} ي`;
  return d.toLocaleDateString("ar-EG");
}
