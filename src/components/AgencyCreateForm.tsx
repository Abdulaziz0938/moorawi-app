// [ezo-agency] نموذج طلب إنشاء وكالة + شروط + صفحة غير مسموح
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { getDeviceId } from "../lib/device";
import { uploadToCloudinary } from "../lib/cloudinary";
import { smartUpload } from "../lib/uploadAssets";
import { dialog } from "../lib/dialog";
import {
  ChevronRight, Loader2, Plus, Briefcase, Phone, MessageCircle,
  User, FileText, X, Check, AlertCircle, Home, Copy,
} from "lucide-react";
import { getActiveToken } from "../lib/session";

interface Props {
  onClose: () => void;
  onEnterRoom?: (roomId: any) => void;
}

export default function AgencyCreateForm({ onClose, onEnterRoom }: Props) {
  const deviceId = getDeviceId();
  const me = useQuery(api.profiles.me, { tokenOverride: getActiveToken() ?? deviceId });
  const config = useQuery(api.config.getAll);

  if (me === undefined) {
    return <Loading onClose={onClose} />;
  }
  if (!me) return null;

  // حساب مستوى الثراء
  // [ezo-fix] استخدام totalRecharged (الثراء) بدلاً من totalSent
  const wealthLevel = calculateWealthLevel((me as any).totalRecharged ?? (me as any).coins ?? 0);
  const isVerified = (me as any).verificationStatus === "approved";
  const canCreate = wealthLevel >= 30 && isVerified;

  if (!canCreate) {
    return <NotAllowed me={me} config={config} onClose={onClose} onEnterRoom={onEnterRoom} />;
  }

  return <Form onClose={onClose} />;
}

// ============================================================
// Loading
// ============================================================
function Loading({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[160] bg-gradient-to-b from-slate-900 to-black flex flex-col" dir="rtl">
      <Header onClose={onClose} title="إنشاء وكالة" />
      <div className="flex-1 flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-white/40" />
      </div>
    </div>
  );
}

// ============================================================
// Not Allowed Screen
// ============================================================
function NotAllowed({ me, config, onClose, onEnterRoom }: any) {
  const whatsapp = config?.["admin.whatsapp"] ?? "+306995026837";
  const roomNumber = config?.["admin.roomNumber"] ?? "1111";
  const [copied, setCopied] = useState(false);

  const handleCopyWhatsapp = () => {
    navigator.clipboard.writeText(whatsapp).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleGoToRoom = () => {
    if (!onEnterRoom) {
      dialog.alert(`رقم غرفة الإدارة: ${roomNumber}\nاذهب لتبويب الغرف وابحث بـ ${roomNumber}`);
      return;
    }
    // نحاول الدخول بالرقم
    dialog.alert(`ابحث في تبويب الغرف عن: ${roomNumber}`);
  };

  return (
    <div className="fixed inset-0 z-[160] bg-gradient-to-b from-slate-900 via-slate-950 to-black flex flex-col" dir="rtl">
      <Header onClose={onClose} title="إنشاء وكالة" />

      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        {/* Icon */}
        <div className="relative mb-6">
          <div className="w-32 h-32 rounded-full bg-purple-500/10 border-2 border-purple-400/20 flex items-center justify-center">
            <Briefcase size={56} className="text-purple-300/40" />
          </div>
          <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-red-500 flex items-center justify-center border-4 border-slate-950">
            <X size={20} className="text-white" strokeWidth={3} />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-white text-2xl font-black mb-3">غير مسموح</h2>
        <p className="text-white/70 text-sm leading-relaxed max-w-xs">
          عذراً، لا يمكنك إنشاء وكالة. فقط مستوى الثروة ≥ 30 متاح
        </p>
        <p className="text-white/50 text-xs mt-2">
          مستواك الحالي: <span className="text-amber-300 font-black">{calculateWealthLevel(me.totalSent ?? 0)}</span>
        </p>

        <p className="text-white/60 text-sm mt-6 leading-relaxed max-w-xs">
          إذا كنت ترغب في الإنشاء، يرجى التواصل مع الإدارة
        </p>
      </div>

      {/* Footer */}
      <div className="px-4 pb-6 pt-4 border-t border-white/10 space-y-3">
        {/* WhatsApp */}
        <button
          onClick={handleCopyWhatsapp}
          className="w-full rounded-2xl bg-blue-500/10 border border-blue-400/30 py-3 px-4 flex items-center justify-center gap-2 text-blue-300 font-black text-sm active:scale-95"
        >
          <Phone size={16} />
          WhatsApp: <span dir="ltr">{whatsapp}</span>
          {copied ? <Check size={14} className="text-green-300" /> : <Copy size={14} className="opacity-60" />}
        </button>

        {/* Go to admin room */}
        <button
          onClick={handleGoToRoom}
          className="w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 py-4 text-white font-black text-base flex items-center justify-center gap-2 active:scale-95"
        >
          <Home size={18} />
          {roomNumber} — غرفة الإدارة
        </button>
      </div>
    </div>
  );
}

// ============================================================
// Form
// ============================================================
function Form({ onClose }: { onClose: () => void }) {
  const deviceId = getDeviceId();
  const [fullName, setFullName] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [agencyName, setAgencyName] = useState("");
  const [logo, setLogo] = useState("");
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const submit = useMutation(api.agencies.submitCreateRequest);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const res = await smartUpload(file, { allowVideo: false });
      setLogo(res.url);
    } catch (e: any) {
      dialog.alert(e?.message || "فشل رفع الصورة");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (fullName.trim().length < 3) return dialog.alert("أدخل اسمك الكامل");
    if (idNumber.trim().length < 4) return dialog.alert("أدخل رقم الهوية");
    if (phone.trim().length < 6) return dialog.alert("أدخل رقم المحمول");
    if (bio.trim().length < 10) return dialog.alert("عرّف نفسك (10 أحرف على الأقل)");
    if (agencyName.trim().length < 2) return dialog.alert("أدخل اسم الوكالة");
    if (!agreed) return dialog.alert("يجب الموافقة على الشروط");

    setBusy(true);
    try {
      await submit({
        agencyName: agencyName.trim(),
        fullName: fullName.trim(),
        idNumber: idNumber.trim(),
        phone: phone.trim(),
        bio: bio.trim(),
        logoUrl: logo || undefined,
        tokenOverride: getActiveToken() ?? deviceId,
      });
      dialog.alert("تم إرسال الطلب — سيتم مراجعته قريباً");
      onClose();
    } catch (e: any) {
      dialog.alert(e?.message || "فشل الإرسال");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[160] bg-gradient-to-b from-slate-900 via-slate-950 to-black flex flex-col" dir="rtl">
      <Header onClose={onClose} title="إنشاء وكالة" />

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

        {/* الاسم */}
        <Field
          label="الاسم"
          required
          icon={User}
          value={fullName}
          onChange={setFullName}
          placeholder="الاسم الكامل"
          maxLength={50}
        />

        {/* رقم الهوية */}
        <Field
          label="رقم الهوية"
          required
          icon={FileText}
          value={idNumber}
          onChange={setIdNumber}
          placeholder="رقم الهوية الوطنية"
          maxLength={20}
          dir="ltr"
        />

        {/* هاتف المحمول */}
        <Field
          label="هاتف المحمول"
          required
          icon={Phone}
          value={phone}
          onChange={setPhone}
          placeholder="مثال: 00963965205427"
          maxLength={20}
          dir="ltr"
        />

        {/* عرّف نفسك */}
        <div className="space-y-2">
          <label className="text-white/70 text-xs font-black flex items-center gap-1">
            <AlertCircle size={12} className="text-purple-300" />
            عرّف نفسك، قدم نفسك لنفسك
            <span className="text-red-400">*</span>
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="مثال: عبدالعزيز الحسين من سوريا ادلب عمري 23..."
            maxLength={300}
            rows={3}
            className="w-full bg-white/10 border border-white/15 rounded-2xl px-4 py-3 text-white placeholder:text-white/40 text-sm focus:outline-none focus:border-purple-400 resize-none"
          />
        </div>

        {/* اسم الوكالة + غطاء */}
        <div className="flex gap-3">
          <div className="flex-1 space-y-2">
            <label className="text-white/70 text-xs font-black flex items-center gap-1">
              <Briefcase size={12} className="text-teal-300" />
              اسم الوكالة
              <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={agencyName}
              onChange={(e) => setAgencyName(e.target.value)}
              placeholder="مثال: الدولة المعراوية"
              maxLength={30}
              className="w-full bg-white/10 border border-white/15 rounded-2xl px-4 py-3 text-white placeholder:text-white/40 text-sm focus:outline-none focus:border-purple-400"
            />
          </div>

          {/* Logo */}
          <div className="space-y-2">
            <label className="text-white/70 text-xs font-black flex items-center gap-1">
              <Briefcase size={12} className="text-teal-300" />
              غطاء الوكالة
              <span className="text-red-400">*</span>
            </label>
            <label className="block cursor-pointer w-20 h-14 rounded-2xl border-2 border-dashed border-white/20 bg-black/30 overflow-hidden">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleUpload(f);
                  e.target.value = "";
                }}
              />
              {uploading ? (
                <div className="w-full h-full flex items-center justify-center">
                  <Loader2 size={18} className="animate-spin text-white/50" />
                </div>
              ) : logo ? (
                <img src={logo} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Plus size={20} className="text-white/40" />
                </div>
              )}
            </label>
          </div>
        </div>

        {/* Rules */}
        <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
          <h3 className="text-white text-xs font-black mb-2">القوانين</h3>
          <ol className="text-white/60 text-[11px] space-y-1.5 leading-relaxed">
            <li>1. يجب أن يكون حسابك موثقاً ومكتمل التحقق من الوجه.</li>
            <li>2. مستوى الثروة يجب أن يكون 30 أو أعلى.</li>
            <li>3. يجب الالتزام بقوانين الوكالة ودفع مكافآت المضيفين.</li>
            <li>4. أي احتيال أو تلاعب يؤدي إلى استرجاع المكافآت أو حل الوكالة.</li>
          </ol>
        </div>

        {/* Agree */}
        <label className="flex items-center gap-3 cursor-pointer py-2">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="w-5 h-5 accent-emerald-500"
          />
          <span className="text-white/70 text-xs leading-relaxed">
            تقديم طلب إنشاء وكالة يعني موافقتك على القواعد ذات الصلة
          </span>
        </label>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={busy || uploading || !agreed}
          className="w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 py-4 text-white font-black text-base disabled:opacity-40 active:scale-95"
        >
          {busy ? <Loader2 size={20} className="animate-spin mx-auto" /> : "إرسال"}
        </button>

        <div className="h-6" />
      </div>
    </div>
  );
}

// ============================================================
// Helpers
// ============================================================
function Header({ onClose, title }: { onClose: () => void; title: string }) {
  return (
    <div className="px-4 pt-4 pb-3 flex items-center gap-2 border-b border-white/10 flex-shrink-0">
      <button
        onClick={onClose}
        className="w-10 h-10 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-white active:scale-95"
      >
        <ChevronRight size={20} />
      </button>
      <h1 className="text-white text-base font-black">{title}</h1>
    </div>
  );
}

function Field({ label, required, icon: Icon, value, onChange, placeholder, maxLength, dir }: any) {
  return (
    <div className="space-y-2">
      <label className="text-white/70 text-xs font-black flex items-center gap-1">
        <Icon size={12} className="text-purple-300" />
        {label}
        {required && <span className="text-red-400">*</span>}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        dir={dir}
        className="w-full bg-white/10 border border-white/15 rounded-2xl px-4 py-3 text-white placeholder:text-white/40 text-sm focus:outline-none focus:border-purple-400"
      />
    </div>
  );
}

// حساب مستوى الثراء (نفس المعادلة من lib/levels)
function calculateWealthLevel(value: number): number {
  const THRESHOLDS = (() => {
    const t: number[] = new Array(101).fill(0);
    t[0] = 0; t[1] = 500;
    let cur = 500;
    const steps = [
      { from: 2, to: 10, inc: 5500 },
      { from: 11, to: 20, inc: 12500 },
      { from: 21, to: 30, inc: 42500 },
      { from: 31, to: 40, inc: 150000 },
      { from: 41, to: 50, inc: 540000 },
      { from: 51, to: 60, inc: 1850000 },
      { from: 61, to: 70, inc: 6400000 },
      { from: 71, to: 80, inc: 23000000 },
      { from: 81, to: 90, inc: 78000000 },
      { from: 91, to: 100, inc: 290000000 },
    ];
    for (const s of steps) {
      for (let l = s.from; l <= s.to; l++) {
        cur += s.inc;
        t[l] = cur;
      }
    }
    return t;
  })();
  const v = Math.max(0, value || 0);
  if (v < THRESHOLDS[1]) return 0;
  for (let l = 100; l >= 1; l--) {
    if (v >= THRESHOLDS[l]) return l;
  }
  return 0;
}
