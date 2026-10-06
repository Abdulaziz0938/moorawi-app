import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { getDeviceId } from "../lib/device";
import { Send, X, Image as ImageIcon, Loader2 } from "lucide-react";

interface Props {
  roomId: Id<"rooms">;
  onClose: () => void;
}

export default function ChatSheet({ roomId, onClose }: Props) {
  const deviceId = getDeviceId();
  const messages = useQuery(api.messages.list, { roomId });
  const sendMsg = useMutation(api.messages.send);
  const genUpload = useMutation(api.messages.generateUploadUrl);

  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages?.length]);

  const handleSend = async () => {
    const clean = text.trim();
    if (!clean) return;
    setSending(true);
    try {
      await sendMsg({ roomId, text: clean, tokenOverride: deviceId });
      setText("");
    } catch (e: any) {
      alert(e?.message || "خطأ");
    } finally {
      setSending(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await genUpload({ tokenOverride: deviceId });
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const { storageId } = await res.json();
      await sendMsg({ roomId, imageId: storageId, tokenOverride: deviceId });
    } catch (e: any) {
      alert(e?.message || "فشل رفع الصورة");
    } finally {
      setUploading(false);
    }
  };

  const formatTime = (t: number) => {
    const d = new Date(t);
    return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  };

  return (
    <div className="fixed inset-0 z-40 bg-black/60 flex items-end" onClick={onClose}>
      <div
        className="w-full max-w-md mx-auto bg-gray-950 rounded-t-2xl h-[70vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <h2 className="text-white font-bold">الدردشة</h2>
          <button onClick={onClose} className="text-white/70 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
          {messages === undefined ? (
            <div className="flex justify-center py-8">
              <Loader2 className="animate-spin text-white/50" size={24} />
            </div>
          ) : messages.length === 0 ? (
            <p className="text-white/40 text-center text-sm py-8">لا توجد رسائل بعد</p>
          ) : (
            messages.map((m) => {
              const isMine = m.senderId && messages[0] && m.senderId === m.senderId && false;
              return (
                <div key={m._id} className="flex gap-2 items-start">
                  <div className="w-7 h-7 rounded-full overflow-hidden bg-purple-500 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
                    {m.avatarUrl
                      ? <img src={m.avatarUrl} alt="" className="w-full h-full object-cover" />
                      : (m.senderName?.[0] || "?")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-bold text-purple-300">{m.senderName}</span>
                      {m.senderNumber && (
                        <span className="text-[9px] text-white/40" dir="ltr">ID:{m.senderNumber}</span>
                      )}
                      <span className="text-[9px] text-white/40">{formatTime(m.createdAt)}</span>
                    </div>
                    {m.text && (
                      <p className="text-white text-sm break-words mt-0.5">{m.text}</p>
                    )}
                    {m.imageUrl && (
                      <img
                        src={m.imageUrl}
                        alt=""
                        className="mt-1 rounded-lg max-w-[200px] max-h-[200px] object-cover"
                      />
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t border-white/10 px-3 py-2 flex items-center gap-2">
          <label className="p-2 rounded-full hover:bg-white/10 text-white/70 cursor-pointer">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              disabled={uploading}
            />
            {uploading ? <Loader2 size={18} className="animate-spin" /> : <ImageIcon size={18} />}
          </label>
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="اكتب رسالة..."
            className="flex-1 bg-white/10 text-white text-sm rounded-full px-4 py-2 outline-none placeholder-white/40"
            maxLength={500}
          />
          <button
            onClick={handleSend}
            disabled={sending || !text.trim()}
            className="p-2 bg-purple-600 rounded-full text-white disabled:opacity-40"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
