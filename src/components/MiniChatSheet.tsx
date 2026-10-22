// [ezo-minichat] Mini floating chat (read + send) — Binmo style
import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { getDeviceId } from "../lib/device";
import { getActiveToken } from "../lib/session";
import { X, Send, Minimize2, MessageCircle } from "lucide-react";

interface Props {
  roomId: Id<"rooms">;
  onClose: () => void;
}

export default function MiniChatSheet({ roomId, onClose }: Props) {
  const token = getActiveToken() ?? getDeviceId();
  const sinceRef = useRef(Date.now() - 1000 * 60 * 10);
  const messages = useQuery(api.messages.list, { roomId, since: sinceRef.current });
  const sendMsg = useMutation(api.messages.send);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (boxRef.current) boxRef.current.scrollTop = boxRef.current.scrollHeight;
  }, [messages?.length, collapsed]);

  const userMsgs = (messages ?? []).filter((m: any) => !m.system);

  const handleSend = async () => {
    const t = text.trim();
    if (!t) return;
    setSending(true);
    try {
      await sendMsg({ roomId, text: t, tokenOverride: token });
      setText("");
    } catch {}
    finally { setSending(false); }
  };

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="fixed bottom-20 left-4 z-[60] w-12 h-12 rounded-full bg-purple-600 shadow-2xl flex items-center justify-center text-white active:scale-95"
        title="الدردشة الموجزة"
      >
        <MessageCircle size={20} />
      </button>
    );
  }

  return (
    <div className="fixed bottom-20 left-3 z-[60] w-64 max-h-80 rounded-2xl bg-black/85 backdrop-blur-xl border border-white/15 shadow-2xl flex flex-col overflow-hidden" dir="rtl">
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
        <span className="text-white text-xs font-black flex items-center gap-1">
          <MessageCircle size={12} /> الدردشة
        </span>
        <div className="flex items-center gap-1">
          <button onClick={() => setCollapsed(true)} className="p-1 rounded hover:bg-white/10 text-white/60">
            <Minimize2 size={12} />
          </button>
          <button onClick={onClose} className="p-1 rounded hover:bg-white/10 text-white/60">
            <X size={12} />
          </button>
        </div>
      </div>
      <div ref={boxRef} className="flex-1 overflow-y-auto px-2 py-1.5 space-y-1">
        {userMsgs.length === 0 ? (
          <p className="text-white/30 text-[10px] text-center py-4">لا رسائل بعد</p>
        ) : userMsgs.map((m: any) => (
          <div key={m._id} className="text-[10px] leading-snug">
            <span className="text-purple-300 font-bold">{m.senderName}: </span>
            <span className="text-white/85">{m.text}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1 p-1.5 border-t border-white/10">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleSend(); }}
          placeholder="اكتب..."
          className="flex-1 bg-white/10 rounded-lg px-2 py-1 text-white text-[11px] outline-none focus:bg-white/15"
        />
        <button
          onClick={handleSend}
          disabled={sending || !text.trim()}
          className="w-7 h-7 rounded-lg bg-purple-600 text-white flex items-center justify-center disabled:opacity-40 active:scale-95"
        >
          <Send size={11} />
        </button>
      </div>
    </div>
  );
}
