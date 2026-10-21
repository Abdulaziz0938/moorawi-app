// [ezo-moments] عرض منشور + تعليقات
import { useState } from "react";
import AssetVideo from "./ui/AssetVideo";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { getDeviceId } from "../lib/device";
import { dialog } from "../lib/dialog";
import { useBackButton } from "../lib/hooks/useBackButton";
import UserAvatar from "./UserAvatar";
import { X, Heart, Send, Loader2, Check } from "lucide-react";
import { getActiveToken } from "../lib/session";

interface Props {
  momentId: string;
  onClose: () => void;
  onUserClick?: (id: any) => void;
}

export default function MomentViewSheet({ momentId, onClose, onUserClick }: Props) {
  useBackButton(true, onClose);
  const deviceId = getDeviceId();
  const moment = useQuery(api.moments.getById, { momentId: momentId as any, tokenOverride: getActiveToken() ?? deviceId });
  const toggleLike = useMutation(api.moments.toggleLike);
  const addComment = useMutation(api.moments.addComment);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const handleComment = async () => {
    const t = text.trim();
    if (!t) return;
    setBusy(true);
    try {
      await addComment({ momentId: momentId as any, text: t, tokenOverride: getActiveToken() ?? deviceId });
      setText("");
    } catch (e: any) { dialog.alert(e?.message || "فشل"); }
    finally { setBusy(false); }
  };

  if (moment === undefined) {
    return (
      <div className="fixed inset-0 z-[170] bg-black/90 flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-white/40" />
      </div>
    );
  }
  if (!moment) return null;

  return (
    <div className="fixed inset-0 z-[170] bg-gradient-to-b from-slate-900 to-black flex flex-col" dir="rtl">
      <div className="px-4 pt-4 pb-3 flex items-center justify-between border-b border-white/10 flex-shrink-0">
        <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white active:scale-95">
          <X size={20} />
        </button>
        <h2 className="text-white text-base font-black">اللحظة</h2>
        <div className="w-10" />
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Author */}
        <button
          onClick={() => onUserClick?.(moment.userId)}
          className="w-full px-4 py-3 flex items-center gap-3 active:opacity-80"
        >
          <div className="w-12 h-12 rounded-full overflow-hidden bg-purple-700 flex items-center justify-center">
            <UserAvatar avatarUrl={moment.author?.avatarUrl} name={moment.author?.name} className="w-full h-full" />
          </div>
          <div className="flex-1 text-right">
            <div className="flex items-center justify-end gap-1.5">
              {moment.author?.verified && <Check size={11} className="text-blue-400" />}
              <p className="text-white text-sm font-black">{moment.author?.name}</p>
            </div>
            <p className="text-white/40 text-[10px]">
              {new Date(moment.createdAt).toLocaleString("ar-EG")}
            </p>
          </div>
        </button>

        {/* Text */}
        {moment.text && (
          <p className="px-4 py-2 text-white/90 text-sm leading-relaxed whitespace-pre-wrap">
            {moment.text}
          </p>
        )}

        {/* Images */}
        {moment.imageUrls.length > 0 && (
          <div className="space-y-2 px-4 py-2">
            {moment.imageUrls.map((url: string, i: number) => (
              <AssetVideo key={i} url={url} type="auto" className="rounded-2xl w-full" />
            ))}
          </div>
        )}

        {/* Like button */}
        <div className="px-4 py-3">
          <button
            onClick={() => toggleLike({ momentId: momentId as any, tokenOverride: getActiveToken() ?? deviceId })}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-pink-500/15 text-pink-300 active:scale-95"
          >
            <Heart size={16} fill="currentColor" />
            <span className="text-xs font-black">{moment.likeCount}</span>
          </button>
        </div>

        {/* Comments */}
        <div className="border-t border-white/10 px-4 py-3">
          <p className="text-white/60 text-xs font-black mb-3">{moment.commentCount} تعليق</p>
          <div className="space-y-3">
            {moment.comments.length === 0 ? (
              <p className="text-white/40 text-xs text-center py-4">كن أول من يعلّق</p>
            ) : (
              moment.comments.map((c: any) => (
                <button
                  key={c._id}
                  onClick={() => onUserClick?.(c.author?.userId)}
                  className="w-full flex items-start gap-2.5 text-right active:opacity-80"
                >
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-purple-700 flex-shrink-0">
                    <UserAvatar avatarUrl={c.author?.avatarUrl} name={c.author?.name} className="w-full h-full" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      {c.author?.verified && <Check size={10} className="text-blue-400" />}
                      <p className="text-white text-xs font-black">{c.author?.name}</p>
                    </div>
                    <p className="text-white/70 text-xs mt-0.5 break-words">{c.text}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Comment input */}
      <div className="border-t border-white/10 p-3 flex items-center gap-2 flex-shrink-0">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleComment()}
          placeholder="أضف تعليقاً..."
          className="flex-1 bg-white/10 border border-white/15 rounded-2xl px-4 py-2.5 text-white text-sm outline-none placeholder:text-white/40"
        />
        <button
          onClick={handleComment}
          disabled={busy || !text.trim()}
          className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white disabled:opacity-40 active:scale-95"
        >
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </div>
    </div>
  );
}
