// [ezo-messages] نافذة المحادثة
import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { getDeviceId } from "../lib/device";
import { uploadToCloudinary } from "../lib/cloudinary";
import { dialog } from "../lib/dialog";
import { useBackButton } from "../lib/hooks/useBackButton";
import UserAvatar from "./UserAvatar";
import { ChevronRight, Loader2, Send, Image as ImageIcon, Check } from "lucide-react";

interface Props {
  conversationId: string;
  onClose: () => void;
}

export default function ChatThreadSheet({ conversationId, onClose }: Props) {
  useBackButton(true, onClose);
  const deviceId = getDeviceId();
  const thread = useQuery(api.directMessages.getThread, {
    conversationId: conversationId as any,
    tokenOverride: deviceId,
  });
  const send = useMutation(api.directMessages.send);
  const markRead = useMutation(api.directMessages.markRead);

  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // mark as read when opened
  useEffect(() => {
    if (thread) {
      markRead({ conversationId: conversationId as any, tokenOverride: deviceId }).catch(() => {});
    }
  }, [thread?.messages.length]);

  // auto scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [thread?.messages.length]);

  const handleSend = async () => {
    const t = text.trim();
    if (!t) return;
    setBusy(true);
    try {
      await send({ conversationId: conversationId as any, text: t, tokenOverride: deviceId });
      setText("");
    } catch (e: any) {
      dialog.alert(e?.message || "فشل الإرسال");
    } finally {
      setBusy(false);
    }
  };

  const handleImage = async (file: File) => {
    setUploading(true);
    try {
      const res = await uploadToCloudinary(file, "image");
      await send({ conversationId: conversationId as any, imageUrl: res.url, tokenOverride: deviceId });
    } catch (e: any) {
      dialog.alert(e?.message || "فشل الرفع");
    } finally {
      setUploading(false);
    }
  };

  if (thread === undefined) {
    return (
      <div className="fixed inset-0 z-[170] bg-gradient-to-b from-slate-900 to-black flex flex-col" dir="rtl">
        <div className="px-4 pt-4 pb-3 flex items-center gap-2 border-b border-white/10">
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white">
            <ChevronRight size={20} />
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center"><Loader2 size={28} className="animate-spin text-white/40" /></div>
      </div>
    );
  }

  if (!thread) return null;

  return (
    <div className="fixed inset-0 z-[170] bg-gradient-to-b from-slate-900 to-black flex flex-col" dir="rtl">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-center gap-2 border-b border-white/10 flex-shrink-0">
        <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white active:scale-95">
          <ChevronRight size={20} />
        </button>
        {thread.other && (
          <>
            <div className="w-10 h-10 rounded-full overflow-hidden bg-purple-700 flex items-center justify-center">
              <UserAvatar avatarUrl={thread.other.avatarUrl} name={thread.other.name} className="w-full h-full" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                {thread.other.verified && <Check size={11} className="text-blue-400" />}
                <p className="text-white text-sm font-black truncate">{thread.other.name}</p>
              </div>
              <p className="text-white/40 text-[10px]" dir="ltr">ID:{thread.other.userNumber ?? "—"}</p>
            </div>
          </>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2">
        {thread.messages.length === 0 ? (
          <div className="text-center py-16 text-white/40">
            <p className="text-xs">ابدأ المحادثة</p>
          </div>
        ) : (
          thread.messages.map((m: any) => (
            <div key={m._id} className={`flex ${m.fromMe ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-3 py-2 ${
                m.fromMe
                  ? "bg-gradient-to-br from-purple-600 to-pink-600 text-white"
                  : "bg-white/10 text-white"
              }`}>
                {m.imageUrl && (
                  <img src={m.imageUrl} alt="" className="rounded-xl max-w-full mb-1" />
                )}
                {m.text && <p className="text-sm break-words">{m.text}</p>}
                <p className="text-[9px] opacity-60 mt-1 text-left" dir="ltr">
                  {new Date(m.createdAt).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Input */}
      <div className="px-3 py-3 border-t border-white/10 flex-shrink-0 flex items-center gap-2">
        <label className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white cursor-pointer active:scale-95">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleImage(f);
              e.target.value = "";
            }}
          />
          {uploading ? <Loader2 size={18} className="animate-spin" /> : <ImageIcon size={18} />}
        </label>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
          placeholder="اكتب رسالة..."
          className="flex-1 bg-white/10 border border-white/15 rounded-2xl px-4 py-2.5 text-white text-sm outline-none placeholder:text-white/40"
        />
        <button
          onClick={handleSend}
          disabled={busy || !text.trim()}
          className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-white disabled:opacity-40 active:scale-95"
        >
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </div>
    </div>
  );
}
