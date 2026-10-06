import { useRef, useState } from "react";
import { Send, Image as ImageIcon, Loader2 } from "lucide-react";

interface Props {
  onSend: (text: string) => Promise<void>;
  onImage: (file: File) => Promise<void>;
  sending: boolean;
  uploading: boolean;
}

export default function CompactChatInput({ onSend, onImage, sending, uploading }: Props) {
  const [text, setText] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = async () => {
    const clean = text.trim();
    if (!clean) return;
    await onSend(clean);
    setText("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter = new line, never sends. Only the send button sends.
    if (e.key === "Enter" && !e.shiftKey) {
      // Allow default newline behavior (do not preventDefault)
    }
  };

  const autoResize = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 100) + "px";
  };

  return (
    <div className="flex items-end gap-2 bg-white/10 rounded-2xl px-2 py-1.5">
      <label className="p-1.5 text-white/70 hover:text-white cursor-pointer flex-shrink-0">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onImage(f);
            if (fileRef.current) fileRef.current.value = "";
          }}
          className="hidden"
          disabled={uploading}
        />
        {uploading ? <Loader2 size={18} className="animate-spin" /> : <ImageIcon size={18} />}
      </label>
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => { setText(e.target.value); autoResize(e.target); }}
        onKeyDown={handleKeyDown}
        placeholder="اكتب رسالة..."
        rows={1}
        className="flex-1 bg-transparent text-white text-sm outline-none placeholder-white/40 resize-none py-1.5 max-h-[100px]"
        maxLength={500}
      />
      <button
        onClick={handleSend}
        disabled={sending || !text.trim()}
        className="p-1.5 bg-purple-600 rounded-full text-white disabled:opacity-40 flex-shrink-0"
      >
        <Send size={16} />
      </button>
    </div>
  );
}
