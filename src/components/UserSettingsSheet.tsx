// [ezo-settings] إعدادات المستخدم
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { getDeviceId } from "../lib/device";
import { clearSession, getActiveToken } from "../lib/session";
import { dialog } from "../lib/dialog";
import { useBackButton } from "../lib/hooks/useBackButton";
import { Header } from "./VisitsSheet";
import {
  User, Globe, Bell, Shield, Info, LogOut, ChevronLeft,
  Camera, Pencil, Lock, MessageSquare, BookOpen,
} from "lucide-react";

interface Props {
  onClose: () => void;
  onOpenLanguage: () => void;
  onOpenVerify: () => void;
  onOpenProfile: () => void;
  onOpenSupport: () => void;
  onLogout?: () => void;
}

export default function UserSettingsSheet({
  onClose, onOpenLanguage, onOpenVerify, onOpenProfile, onOpenSupport, onLogout,
}: Props) {
  useBackButton(true, onClose);
  const deviceId = getDeviceId();
  const me = useQuery(api.profiles.me, { tokenOverride: getActiveToken() ?? deviceId });

  const [notifOn, setNotifOn] = useState(
    () => localStorage.getItem("ezo_notif") !== "off"
  );

  const toggleNotif = () => {
    const next = !notifOn;
    setNotifOn(next);
    localStorage.setItem("ezo_notif", next ? "on" : "off");
  };

  const isVerified = (me as any)?.verificationStatus === "approved";

  return (
    <div className="fixed inset-0 z-[165] bg-gradient-to-b from-slate-900 to-black flex flex-col" dir="rtl">
      <Header onClose={onClose} title="الإعدادات" assetKey="ui.sheet.settings" />

      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {/* ===== Account ===== */}
        <Section title="الحساب">
          <Row
            icon={User}
            label="تعديل الملف الشخصي"
            sub="الصورة، الاسم، النبذة"
            onClick={() => { onClose(); onOpenProfile(); }}
          />
          <Row
            icon={Shield}
            label="التوثيق"
            sub={isVerified ? "حسابك موثق ✅" : "احصل على شارة التوثيق"}
            onClick={() => { onClose(); onOpenVerify(); }}
            highlight={!isVerified}
          />
        </Section>

        {/* ===== Preferences ===== */}
        <Section title="التفضيلات">
          <Row
            icon={Globe}
            label="اللغة"
            sub={localStorage.getItem("ezo_lang") === "en" ? "English" : "العربية"}
            onClick={() => { onClose(); onOpenLanguage(); }}
          />
          <ToggleRow
            icon={Bell}
            label="الإشعارات"
            sub={notifOn ? "مفعّلة" : "معطّلة"}
            value={notifOn}
            onToggle={toggleNotif}
          />
        </Section>

        {/* ===== Help ===== */}
        <Section title="المساعدة">
          <Row
            icon={MessageSquare}
            label="خدمة العملاء"
            sub="تواصل عبر الواتساب"
            onClick={() => { onClose(); onOpenSupport(); }}
          />
          <Row
            icon={Info}
            label="حول Ezo"
            sub="Ezo Group Voice Chat Rooms · v1.0"
            onClick={() => dialog.alert("Ezo Group Voice Chat Rooms\nالإصدار 1.0\n\nجميع الحقوق محفوظة © 2026")}
          />
        </Section>

        {/* ===== Danger ===== */}
        <Section title="خروج">
          <button
            onClick={() => {
              if (onLogout) { onClose(); onLogout(); return; }
              dialog.confirm("تسجيل الخروج من الحساب؟", () => {
                clearSession();
                window.location.reload();
              }, "خروج", "خروج");
            }}
            className="w-full rounded-2xl bg-red-500/10 border border-red-400/30 p-4 flex items-center gap-3 active:scale-95"
          >
            <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
              <LogOut size={18} className="text-red-300" />
            </div>
            <div className="flex-1 text-right">
              <p className="text-red-300 text-sm font-black">تسجيل الخروج</p>
              <p className="text-white/40 text-[10px]">ستحتاج لإدخال بياناتك مرة أخرى</p>
            </div>
          </button>
        </Section>

        <p className="text-center text-white/30 text-[10px] py-2">
          Ezo Group Voice Chat Rooms © 2026
        </p>
      </div>
    </div>
  );
}

// ============================================================
function Section({ title, children }: any) {
  return (
    <div>
      <h3 className="text-white/50 text-[11px] font-black mb-1.5 px-1">{title}</h3>
      <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
        {children}
      </div>
    </div>
  );
}

function Row({ icon: Icon, label, sub, onClick, highlight }: any) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3.5 active:bg-white/5 border-b border-white/5 last:border-b-0 ${
        highlight ? "bg-emerald-500/5" : ""
      }`}
    >
      <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
        highlight ? "bg-emerald-500/20" : "bg-white/10"
      }`}>
        <Icon size={16} className={highlight ? "text-emerald-300" : "text-white/70"} />
      </div>
      <div className="flex-1 text-right">
        <p className="text-white text-sm font-black">{label}</p>
        {sub && <p className="text-white/40 text-[10px] mt-0.5">{sub}</p>}
      </div>
      <ChevronLeft size={16} className="text-white/30" />
    </button>
  );
}

function ToggleRow({ icon: Icon, label, sub, value, onToggle }: any) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-white/5 border-b border-white/5 last:border-b-0"
    >
      <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
        <Icon size={16} className="text-white/70" />
      </div>
      <div className="flex-1 text-right">
        <p className="text-white text-sm font-black">{label}</p>
        {sub && <p className="text-white/40 text-[10px] mt-0.5">{sub}</p>}
      </div>
      <div className={`w-11 h-6 rounded-full transition relative flex-shrink-0 ${
        value ? "bg-emerald-500" : "bg-white/15"
      }`}>
        <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${
          value ? "right-0.5" : "right-[22px]"
        }`} />
      </div>
    </button>
  );
}
