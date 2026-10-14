// [ezo-emoji] Animated emoji picker — shows above avatar
import { useState } from "react";
import { X, Search } from "lucide-react";
import { useBackButton } from "../lib/hooks/useBackButton";

interface Props {
  onClose: () => void;
  onPick: (emoji: string) => void;
}

// Free animated emoji URLs (from Google Fonts Noto Animated)
const ANIMATED: { key: string; label: string; url: string }[] = [
  { key: "party",     label: "حفلة",     url: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f389/512.gif" },
  { key: "heart",     label: "قلب",       url: "https://fonts.gstatic.com/s/e/notoemoji/latest/2764_fe0f/512.gif" },
  { key: "fire",      label: "نار",       url: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f525/512.gif" },
  { key: "star",      label: "نجمة",      url: "https://fonts.gstatic.com/s/e/notoemoji/latest/2b50/512.gif" },
  { key: "laugh",     label: "ضحك",       url: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f602/512.gif" },
  { key: "kiss",      label: "قبلة",      url: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f618/512.gif" },
  { key: "cool",      label: "رائع",      url: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f60e/512.gif" },
  { key: "cry",       label: "بكاء",      url: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f62d/512.gif" },
  { key: "wink",      label: "غمزة",      url: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f609/512.gif" },
  { key: "hug",       label: "حضن",       url: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f917/512.gif" },
  { key: "rocket",    label: "صاروخ",     url: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f680/512.gif" },
  { key: "crown",     label: "تاج",       url: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f451/512.gif" },
  { key: "diamond",   label: "ماسة",      url: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f48e/512.gif" },
  { key: "rose",      label: "وردة",      url: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f339/512.gif" },
  { key: "cake",      label: "كيك",       url: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f382/512.gif" },
  { key: "clap",      label: "تصفيق",     url: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f44f/512.gif" },
  { key: "pray",      label: "دعاء",      url: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f64f/512.gif" },
  { key: "thumbsup",  label: "ممتاز",     url: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f44d/512.gif" },
  { key: "skull",     label: "جمجمة",     url: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f480/512.gif" },
  { key: "100",       label: "100",       url: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f4af/512.gif" },
  { key: "rocket2",   label: "قمر",       url: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f319/512.gif" },
  { key: "money",     label: "فلوس",      url: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f4b0/512.gif" },
  { key: "crown2",    label: "كأس",       url: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f3c6/512.gif" },
  { key: "gift",      label: "هدية",      url: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f381/512.gif" },
];

export default function EmojiSheet({ onClose, onPick }: Props) {
  useBackButton(true, onClose);
  const [search, setSearch] = useState("");

  const filtered = ANIMATED.filter((e) => e.label.includes(search) || e.key.includes(search.toLowerCase()));

  return (
    <div className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-sm flex items-end justify-center" dir="rtl" onClick={onClose}>
      <div
        className="w-full max-w-md bg-gradient-to-b from-slate-900 to-black rounded-t-3xl max-h-[70dvh] flex flex-col overflow-hidden border-t border-white/15"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="text-lg">😀</span>
            <h2 className="text-white text-base font-black">الإيموجي المتحركة</h2>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white active:scale-95"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search */}
        <div className="px-3 py-2">
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
            <Search size={14} className="text-white/40" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث..."
              className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-white/30"
            />
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-3">
          <div className="grid grid-cols-4 gap-2">
            {filtered.map((e) => (
              <button
                key={e.key}
                onClick={() => { onPick(e.url); onClose(); }}
                className="aspect-square rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center justify-center gap-1 active:scale-95 transition hover:bg-white/10 hover:border-purple-400/40"
              >
                <img
                  src={e.url}
                  alt={e.label}
                  className="w-12 h-12 object-contain"
                  loading="lazy"
                  draggable={false}
                />
                <span className="text-white/60 text-[9px] font-bold">{e.label}</span>
              </button>
            ))}
          </div>
          {filtered.length === 0 && (
            <p className="text-white/40 text-center text-sm py-8">لا نتائج</p>
          )}
        </div>
      </div>
    </div>
  );
}
