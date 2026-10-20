// [moorawi-services] خدمة العملاء
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { dialog } from "../lib/dialog";
import { useBackButton } from "../lib/hooks/useBackButton";
import { Header } from "./VisitsSheet";
import { MessageCircle, Phone, Copy, Check, Home, ExternalLink } from "lucide-react";

interface Props { onClose: () => void; }

export default function SupportSheet({ onClose }: Props) {
  useBackButton(true, onClose);
  const config = useQuery(api.config.getAll);
  const [copied, setCopied] = useState(false);

  const whatsapp = config?.["admin.whatsapp"] ?? "+306995026837";
  const roomNumber = config?.["admin.roomNumber"] ?? "1111";

  const handleCopy = () => {
    navigator.clipboard.writeText(whatsapp).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleWhatsapp = () => {
    const phone = whatsapp.replace(/[^0-9]/g, "");
    window.open(`https://wa.me/${phone}`, "_blank");
  };

  return (
    <div className="fixed inset-0 z-[160] bg-gradient-to-b from-slate-900 to-black flex flex-col" dir="rtl">
      <Header onClose={onClose} title="خدمة العملاء" assetKey="ui.sheet.support" />

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <div className="text-center mb-6">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 mx-auto flex items-center justify-center mb-3">
            <MessageCircle size={48} className="text-white" />
          </div>
          <p className="text-white text-base font-black">نحن هنا لمساعدتك</p>
          <p className="text-white/50 text-xs mt-1">تواصل معنا عبر الواتساب</p>
        </div>

        <button onClick={handleWhatsapp} className="w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 p-4 flex items-center gap-3 active:scale-95">
          <div className="w-12 h-12 rounded-2xl bg-black/20 flex items-center justify-center">
            <MessageCircle size={22} className="text-white" />
          </div>
          <div className="flex-1 text-right">
            <p className="text-white font-black text-sm">WhatsApp</p>
            <p className="text-white/80 text-xs" dir="ltr">{whatsapp}</p>
          </div>
          <ExternalLink size={18} className="text-white/70" />
        </button>

        <button onClick={handleCopy} className="w-full rounded-2xl bg-white/5 border border-white/10 p-4 flex items-center gap-3 active:scale-95">
          <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
            <Phone size={22} className="text-white/70" />
          </div>
          <div className="flex-1 text-right">
            <p className="text-white font-black text-sm">نسخ الرقم</p>
            <p className="text-white/50 text-xs">احفظه في جهات الاتصال</p>
          </div>
          {copied ? <Check size={18} className="text-emerald-400" /> : <Copy size={18} className="text-white/50" />}
        </button>

        <div className="rounded-2xl bg-amber-500/10 border border-amber-400/30 p-4 flex gap-3">
          <Home size={18} className="text-amber-300 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-200 text-sm font-black">غرفة الإدارة</p>
            <p className="text-amber-100/70 text-xs mt-1">ابحث برقم <span className="font-black" dir="ltr">{roomNumber}</span> في تبويب الغرف للتواصل المباشر</p>
          </div>
        </div>
      </div>
    </div>
  );
}
