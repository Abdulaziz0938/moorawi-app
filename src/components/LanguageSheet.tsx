// [ezo-services] اللغة
import { useState } from "react";
import { useBackButton } from "../lib/hooks/useBackButton";
import { Header } from "./VisitsSheet";
import { Check, Globe, Languages } from "lucide-react";

interface Props { onClose: () => void; }

const LANGS = [
  { code: "ar", name: "العربية",    flag: "🇸🇾", dir: "rtl" },
  { code: "en", name: "English",    flag: "🇬🇧", dir: "ltr" },
  { code: "tr", name: "Türkçe",     flag: "🇹🇷", dir: "ltr" },
  { code: "fr", name: "Français",   flag: "🇫🇷", dir: "ltr" },
];

export default function LanguageSheet({ onClose }: Props) {
  useBackButton(true, onClose);
  const [selected, setSelected] = useState<string>(() => localStorage.getItem("ezo_lang") ?? "ar");

  const handlePick = (code: string) => {
    setSelected(code);
    localStorage.setItem("ezo_lang", code);
  };

  return (
    <div className="fixed inset-0 z-[160] bg-gradient-to-b from-slate-900 to-black flex flex-col" dir="rtl">
      <Header onClose={onClose} title="اللغة" assetKey="ui.sheet.language" />

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <div className="text-center mb-4">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 mx-auto flex items-center justify-center mb-3">
            <Languages size={40} className="text-white" />
          </div>
          <p className="text-white text-base font-black">اختر لغتك</p>
          <p className="text-white/50 text-xs mt-1">سيتم تطبيق التغيير فوراً</p>
        </div>

        <div className="space-y-2">
          {LANGS.map((lang) => {
            const isSel = selected === lang.code;
            return (
              <button
                key={lang.code}
                onClick={() => handlePick(lang.code)}
                className={`w-full rounded-2xl border p-4 flex items-center gap-3 active:scale-95 transition ${
                  isSel
                    ? "bg-cyan-500/15 border-cyan-400/50"
                    : "bg-white/5 border-white/10"
                }`}
              >
                <span className="text-3xl">{lang.flag}</span>
                <div className="flex-1 text-right">
                  <p className={`text-sm font-black ${isSel ? "text-white" : "text-white/70"}`}>
                    {lang.name}
                  </p>
                  <p className="text-white/40 text-[10px]" dir="ltr">{lang.code.toUpperCase()}</p>
                </div>
                {isSel && (
                  <div className="w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center">
                    <Check size={16} className="text-white" strokeWidth={3} />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <div className="rounded-2xl bg-blue-500/10 border border-blue-400/30 p-3 flex gap-2 mt-6">
          <Globe size={14} className="text-blue-300 flex-shrink-0 mt-0.5" />
          <p className="text-blue-100/80 text-[11px] leading-relaxed">
            المزيد من اللغات قريباً. اللغة الحالية محفوظة على جهازك.
          </p>
        </div>
      </div>
    </div>
  );
}
