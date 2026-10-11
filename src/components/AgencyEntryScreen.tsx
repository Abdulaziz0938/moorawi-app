// [moorawi-agency] Agency entry — host/agent flow
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { getDeviceId } from "../lib/device";
import { uploadToCloudinary } from "../lib/cloudinary";
import { dialog } from "../lib/dialog";
import AgencyCreateForm from "./AgencyCreateForm";
import HostRequestsPanel from "./HostRequestsPanel";
import MyHostView from "./MyHostView";
import AgencyOverviewView from "./AgencyOverviewView";
import {
  ChevronRight, Search, Loader2, Briefcase, Mic, Users,
  Clock, Check, X, Plus, Award, Shield, Gift,
} from "lucide-react";

type Tab = "host" | "agent";
type View = "landing" | "joinSearch" | "myRequests" | "createRequest" | "createRequests" | "myAgency";

interface Props {
  initialTab?: Tab;
  onClose: () => void;
}

export default function AgencyEntryScreen({ initialTab = "host", onClose }: Props) {
  const deviceId = getDeviceId();
  const me = useQuery(api.profiles.me, { tokenOverride: deviceId });
  const [tab, setTab] = useState<Tab>(initialTab);
  const [view, setView] = useState<View>("landing");
  const [showPending, setShowPending] = useState(false);

  if (!me) return null;

  // إذا كان في وكالة → صفحة الوكالة
  if (me.agencyId) {
    if (tab === "agent") {
      // هل هو مالك الوكالة؟
      const isOwner = true; // TODO: check
      return <MyAgencyView onClose={onClose} tab={tab} />;
    }
    return <MyAgencyView onClose={onClose} tab={tab} />;
  }

  // ===== Views =====

  if (view === "joinSearch") {
    return <JoinSearch onClose={onClose} />;
  }

  if (view === "createRequest") {
    return <AgencyCreateForm onClose={() => setView("landing")} />;
  }

  if (view === "createRequests") {
    return <CreateRequestsView onClose={onClose} onBack={() => setView("landing")} />;
  }

  // ===== Landing =====
  const isHost = tab === "host";

  return (
    <div className="fixed inset-0 z-[150] bg-gradient-to-b from-slate-900 via-slate-950 to-black flex flex-col" dir="rtl">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-center justify-between border-b border-white/10 flex-shrink-0">
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-white active:scale-95"
        >
          <ChevronRight size={20} />
        </button>

        {/* Pending requests icon */}
        <button
          onClick={() => setShowPending(true)}
          className="w-10 h-10 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-white active:scale-95"
        >
          <Clock size={18} />
        </button>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setTab("host")}
            className={`text-sm font-black pb-1 relative ${tab === "host" ? "text-white" : "text-white/50"}`}
          >
            مضيف
            {tab === "host" && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-sky-400" />}
          </button>
          <button
            onClick={() => setTab("agent")}
            className={`text-sm font-black pb-1 relative ${tab === "agent" ? "text-white" : "text-white/50"}`}
          >
            وكيل
            {tab === "agent" && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-teal-400" />}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isHost ? <HostLanding onSearch={() => setView("joinSearch")} /> : <AgentLanding onCreate={() => setView("createRequest")} onMyRequests={() => setView("createRequests")} />}
      </div>

      {/* Pending Modal */}
      {showPending && <PendingModal onClose={() => setShowPending(false)} />}
    </div>
  );
}

// ============================================================
// HOST LANDING
// ============================================================
function HostLanding({ onSearch }: { onSearch: () => void }) {
  return (
    <>
      {/* Hero */}
      <div className="relative h-64 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-sky-900/60 via-purple-900/40 to-transparent" />
        <div className="relative h-full flex flex-col items-center justify-center px-4">
          <Mic size={64} className="text-sky-300 mb-3" />
          <h1 className="text-white text-2xl font-black mb-1">الانضمام إلى وكالة</h1>
          <p className="text-white/70 text-sm text-center">
            ابدأ رحلة البث الصوتي المباشر وعرض المواهب
          </p>
        </div>
      </div>

      {/* Features grid */}
      <div className="px-4 grid grid-cols-2 gap-3 mt-4">
        <FeatureCard icon={Award}       title="دعم وتدريب من الجهات الرسمية" color="from-purple-700/40 to-purple-900/40" border="border-purple-500/30" />
        <FeatureCard icon={Gift}        title="مكافآت ومزايا كبيرة"          color="from-amber-700/40 to-amber-900/40" border="border-amber-500/30" />
        <FeatureCard icon={Briefcase}   title="جوائز وفيرة للفعاليات"        color="from-teal-700/40 to-teal-900/40" border="border-teal-500/30" />
        <FeatureCard icon={Shield}      title="بيئة آمنة"                    color="from-emerald-700/40 to-emerald-900/40" border="border-emerald-500/30" />
      </div>

      {/* Rules */}
      <div className="px-4 mt-6">
        <h2 className="text-white text-base font-black mb-2">القوانين</h2>
        <ol className="text-white/70 text-xs space-y-2 leading-relaxed">
          <li>1. لتصبح مضيفاً وتحصل على المكافآت، يجب أن تستوفي متطلبات عدد الأيام على المايك وقيمة الهدايا.</li>
          <li>2. يجب على المضيف الانضمام إلى الوكالة للاستفادة من حقوق المضيفين. إذا غادر المضيف الوكالة، سيتم إلغاء المكافآت ذات الصلة.</li>
          <li>3. سياسة عدم التسامح مع الاحتيال: أي محاولة استمالة ضارة أو تلاعب في البيانات أو مخالفات، ستؤدي إلى استرجاع المكافآت أو إلغاء صفة المضيف.</li>
        </ol>
      </div>

      {/* Search button */}
      <div className="px-4 mt-6 mb-8">
        <button
          onClick={onSearch}
          className="w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 py-4 text-white font-black text-base flex items-center justify-center gap-2 active:scale-95 transition"
        >
          <Search size={20} />
          الانضمام إلى الوكالة
        </button>
      </div>
    </>
  );
}

// ============================================================
// AGENT LANDING
// ============================================================
function AgentLanding({ onCreate, onMyRequests }: { onCreate: () => void; onMyRequests: () => void }) {
  return (
    <>
      {/* Hero */}
      <div className="relative h-64 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-teal-900/60 via-purple-900/40 to-transparent" />
        <div className="relative h-full flex flex-col items-center justify-center px-4">
          <Briefcase size={64} className="text-teal-300 mb-3" />
          <h1 className="text-white text-2xl font-black mb-1">إنشاء وكالة</h1>
          <p className="text-white/70 text-sm text-center">
            انطلق وابنِ مملكة موهبتك على Ezo!
          </p>
        </div>
      </div>

      {/* Features grid */}
      <div className="px-4 grid grid-cols-2 gap-3 mt-4">
        <FeatureCard icon={Award}       title="عمولات ومكافآت عالية"        color="from-purple-700/40 to-purple-900/40" border="border-purple-500/30" />
        <FeatureCard icon={Briefcase}   title="دعم وفعاليات كثيرة"          color="from-amber-700/40 to-amber-900/40" border="border-amber-500/30" />
        <FeatureCard icon={Gift}        title="حاضنة الأحلام"               color="from-teal-700/40 to-teal-900/40" border="border-teal-500/30" />
        <FeatureCard icon={Shield}      title="بيئة آمنة"                    color="from-emerald-700/40 to-emerald-900/40" border="border-emerald-500/30" />
      </div>

      {/* Rules */}
      <div className="px-4 mt-6">
        <h2 className="text-white text-base font-black mb-2">القوانين</h2>
        <ol className="text-white/70 text-xs space-y-2 leading-relaxed">
          <li>1. النزاهة أولاً: يجب على مسؤولي النقابة دعم نمو المضيفين بنزاهة، وعدم استغلال حقوق المضيفين.</li>
          <li>2. توزيع المكافآت بانتظام: يجب دفع مكافآت المضيفين شهرياً في الوقت المحدد، وفي حالة الشكاوى المؤكدة، ستتدخل الإدارة وقد تصل إلى حل الوكالة!</li>
          <li>3. سياسة عدم التسامح مع الاحتيال: أي محاولة استمالة ضارة أو تلاعب في البيانات أو مخالفات، ستؤدي إلى استرجاع المكافآت أو حل الوكالة.</li>
        </ol>
      </div>

      {/* Buttons */}
      <div className="px-4 mt-6 mb-8 space-y-3">
        <button
          onClick={onCreate}
          className="w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 py-4 text-white font-black text-base flex items-center justify-center gap-2 active:scale-95 transition"
        >
          <Plus size={20} />
          إنشاء وكالة
        </button>
        <button
          onClick={onMyRequests}
          className="w-full rounded-2xl bg-white/10 border border-white/15 py-3 text-white font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition"
        >
          <Clock size={16} />
          طلباتي السابقة
        </button>
      </div>
    </>
  );
}

function FeatureCard({ icon: Icon, title, color, border }: any) {
  return (
    <div className={`rounded-2xl border ${border} bg-gradient-to-br ${color} p-4 flex flex-col items-center justify-center gap-2 min-h-[110px]`}>
      <Icon size={28} className="text-white/90" />
      <p className="text-white text-[11px] font-black text-center leading-tight">{title}</p>
    </div>
  );
}

// ============================================================
// JOIN SEARCH
// ============================================================
function JoinSearch({ onClose }: { onClose: () => void }) {
  const deviceId = getDeviceId();
  const [numStr, setNumStr] = useState("");
  const [submitted, setSubmitted] = useState<number | null>(null);
  const requestJoin = useMutation(api.agencies.requestJoin);

  const result = useQuery(
    api.agencies.findByNumber,
    submitted !== null ? { number: submitted } : "skip" as any
  );

  const handleSearch = () => {
    const n = parseInt(numStr, 10);
    if (isNaN(n) || n < 100) {
      dialog.alert("أدخل رقم وكالة صحيح (3 أرقام على الأقل)");
      return;
    }
    setSubmitted(n);
  };

  const handleJoin = async () => {
    if (!result) return;
    try {
      await requestJoin({ agencyId: result._id, tokenOverride: deviceId });
      dialog.alert("تم إرسال طلب الانضمام — انتظر موافقة الوكيل");
      onClose();
    } catch (e: any) {
      dialog.alert(e?.message || "فشل الطلب");
    }
  };

  return (
    <div className="fixed inset-0 z-[160] bg-gradient-to-b from-slate-900 via-slate-950 to-black flex flex-col" dir="rtl">
      <div className="px-4 pt-4 pb-3 flex items-center gap-2 border-b border-white/10">
        <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-white active:scale-95">
          <ChevronRight size={20} />
        </button>
        <h1 className="text-white text-base font-black">ابحث عن وكالة</h1>
      </div>

      <div className="p-4 flex items-center gap-2">
        <input
          type="text"
          inputMode="numeric"
          autoFocus
          value={numStr}
          onChange={(e) => setNumStr(e.target.value.replace(/\D/g, "").slice(0, 6))}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="أدخل رقم الوكالة (مثل 100)"
          className="flex-1 bg-white/10 border border-white/15 rounded-2xl px-4 py-3 text-white placeholder:text-white/40 text-sm focus:outline-none focus:border-purple-400 tabular-nums text-center font-black text-lg"
          dir="ltr"
        />
        <button
          onClick={handleSearch}
          disabled={!numStr}
          className="w-12 h-12 rounded-2xl bg-purple-600 flex items-center justify-center text-white disabled:opacity-40 active:scale-95"
        >
          <Search size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4">
        {submitted !== null && result === undefined && (
          <div className="flex justify-center py-12">
            <Loader2 size={24} className="animate-spin text-white/40" />
          </div>
        )}

        {submitted !== null && result === null && (
          <div className="text-center py-12 text-white/40">
            <p className="text-sm">لا توجد وكالة بهذا الرقم</p>
          </div>
        )}

        {result && (
          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-teal-900/30 to-purple-900/30 p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-16 h-16 rounded-2xl bg-black/40 flex items-center justify-center overflow-hidden flex-shrink-0">
                {result.logoUrl ? (
                  <img src={result.logoUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Briefcase size={26} className="text-teal-300" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-base font-black truncate">{result.name}</p>
                <p className="text-teal-300 text-xs font-black" dir="ltr">ID: {result.agencyNumber}</p>
                <p className="text-white/50 text-[11px] mt-0.5">المالك: {result.ownerName}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 mb-3 justify-center">
              <span className="text-emerald-300 text-xs flex items-center gap-1">
                <Users size={12} /> {result.activeHostCount} مضيف
              </span>
              <span className="text-amber-300 text-xs">مستوى {result.level}</span>
            </div>
            {result.description && (
              <p className="text-white/60 text-xs text-center mb-3">{result.description}</p>
            )}
            <button
              onClick={handleJoin}
              className="w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 py-3 text-white font-black text-sm active:scale-95"
            >
              إرسال طلب انضمام
            </button>
          </div>
        )}
      </div>
    </div>
  );
}


// ============================================================
// MY REQUESTS (للمستخدم)
// ============================================================
function CreateRequestsView({ onClose, onBack }: { onClose: () => void; onBack: () => void }) {
  const deviceId = getDeviceId();
  const reqs = useQuery(api.agencies.myCreateRequests, { tokenOverride: deviceId });

  return (
    <div className="fixed inset-0 z-[160] bg-gradient-to-b from-slate-900 via-slate-950 to-black flex flex-col" dir="rtl">
      <div className="px-4 pt-4 pb-3 flex items-center gap-2 border-b border-white/10">
        <button onClick={onBack} className="w-10 h-10 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-white">
          <ChevronRight size={20} />
        </button>
        <h1 className="text-white text-base font-black">طلباتي السابقة</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {reqs === undefined ? (
          <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-white/40" /></div>
        ) : reqs.length === 0 ? (
          <div className="text-center py-12 text-white/40">
            <Clock size={48} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">لا توجد طلبات</p>
          </div>
        ) : (
          reqs.map((r: any) => (
            <div key={r._id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-white font-black text-sm">{r.agencyName}</p>
                {r.status === "pending" && <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-black">قيد المراجعة</span>}
                {r.status === "approved" && <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black">تمت الموافقة</span>}
                {r.status === "rejected" && <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 text-[10px] font-black">مرفوض</span>}
              </div>
              <p className="text-white/40 text-[10px]" dir="ltr">
                {new Date(r.createdAt).toLocaleString("ar-EG")}
              </p>
              {r.note && <p className="text-white/60 text-xs mt-2">{r.note}</p>}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ============================================================
// MY AGENCY VIEW (placeholder — يُبنى لاحقاً)
// ============================================================
function MyAgencyView({ onClose, tab }: { onClose: () => void; tab: Tab }) {
  const [showRequests, setShowRequests] = useState(false);
  const deviceId = getDeviceId();
  const me = useQuery(api.profiles.me, { tokenOverride: deviceId });

  if (showRequests) {
    return <HostRequestsPanel onClose={onClose} onBack={() => setShowRequests(false)} />;
  }

  // تبويب "مضيف" → بياناتي كمضيف
  if (tab === "host") {
    return <MyHostView onClose={onClose} onShowRequests={() => setShowRequests(true)} />;
  }

  // تبويب "وكالة" → بيانات الوكالة الكاملة
  return (
    <AgencyOverviewView
      onClose={onClose}
      onShowRequests={() => setShowRequests(true)}
    />
  );
}

// ============================================================
// PENDING MODAL
// ============================================================
function PendingModal({ onClose }: { onClose: () => void }) {
  const deviceId = getDeviceId();
  const agencyReqs = useQuery(api.agencies.myRequests, { tokenOverride: deviceId });
  const createReqs = useQuery(api.agencies.myCreateRequests, { tokenOverride: deviceId });

  return (
    <div className="fixed inset-0 z-[170] bg-black/80 backdrop-blur-sm flex items-end" onClick={onClose}>
      <div className="w-full max-w-md mx-auto bg-slate-900 rounded-t-3xl p-4 max-h-[80dvh] overflow-y-auto" onClick={(e) => e.stopPropagation()} dir="rtl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white text-base font-black">الطلبات المعلقة</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white">
            <X size={16} />
          </button>
        </div>

        {agencyReqs?.length === 0 && createReqs?.length === 0 && (
          <p className="text-white/40 text-sm text-center py-8">لا توجد طلبات</p>
        )}

        {agencyReqs?.map((r: any) => (
          <div key={r._id} className="rounded-xl bg-white/5 border border-white/10 p-3 mb-2">
            <p className="text-white text-xs font-black">انضمام لـ {r.agencyName}</p>
            <p className="text-white/40 text-[10px] mt-1" dir="ltr">{new Date(r.createdAt).toLocaleString("ar-EG")}</p>
          </div>
        ))}

        {createReqs?.map((r: any) => (
          <div key={r._id} className="rounded-xl bg-white/5 border border-white/10 p-3 mb-2">
            <div className="flex items-center justify-between">
              <p className="text-white text-xs font-black">إنشاء وكالة: {r.agencyName}</p>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                r.status === "pending" ? "bg-amber-500/20 text-amber-300" :
                r.status === "approved" ? "bg-emerald-500/20 text-emerald-300" :
                "bg-red-500/20 text-red-300"
              }`}>
                {r.status === "pending" ? "قيد المراجعة" : r.status === "approved" ? "موافق" : "مرفوض"}
              </span>
            </div>
            <p className="text-white/40 text-[10px] mt-1" dir="ltr">{new Date(r.createdAt).toLocaleString("ar-EG")}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
