// [moorawi-agency] تبويب "وكالة" — لمالك الوكالة أو المضيف
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { getDeviceId } from "../lib/device";
import { dialog } from "../lib/dialog";
import { useBackButton } from "../lib/hooks/useBackButton";
import UserAvatar from "./UserAvatar";
import {
  ChevronRight, Loader2, Briefcase, Users, Award, Crown, Clock,
  TrendingUp, Heart, DollarSign, LogOut, Copy, Check, Building2, User,
} from "lucide-react";

interface Props {
  onClose: () => void;
  onShowRequests?: () => void;
}

type Tab = "info" | "hosts" | "review" | "members";

export default function AgencyOverviewView({ onClose, onShowRequests }: Props) {
  const deviceId = getDeviceId();
  const me = useQuery(api.profiles.me, { tokenOverride: deviceId });
  const agency = useQuery(
    api.agencies.myAgency,
    me?.agencyId ? { tokenOverride: deviceId } : "skip" as any
  );
  const [tab, setTab] = useState<Tab>("info");

  if (me === undefined || agency === undefined) {
    return (
      <Wrap onClose={onClose}>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 size={32} className="animate-spin text-white/40" />
        </div>
      </Wrap>
    );
  }

  if (!agency) {
    return (
      <Wrap onClose={onClose}>
        <div className="flex-1 flex flex-col items-center justify-center text-white/40 gap-2">
          <Briefcase size={48} className="opacity-30" />
          <p className="text-sm">لست في وكالة</p>
        </div>
      </Wrap>
    );
  }

  const isOwner = agency.ownerId === me?._id;

  return (
    <Wrap onClose={onClose}>
      {/* Tabs */}
      <div className="flex items-center gap-2 px-4 pb-3 border-b border-white/10 flex-shrink-0 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
        <TabBtn active={tab === "info"} onClick={() => setTab("info")} label="بيانات الوكالة" />
        <TabBtn active={tab === "hosts"} onClick={() => setTab("hosts")} label="المضيفون" />
        {isOwner && <TabBtn active={tab === "review"} onClick={() => setTab("review")} label="المراجعة" />}
        <TabBtn active={tab === "members"} onClick={() => setTab("members")} label="الأعضاء" />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {tab === "info" && <AgencyInfo agency={agency} isOwner={isOwner} />}
        {tab === "hosts" && <HostsList agencyId={agency._id} />}
        {tab === "review" && isOwner && <ReviewPanel onShowRequests={onShowRequests} />}
        {tab === "members" && <MembersList agencyId={agency._id} />}
      </div>
    </Wrap>
  );
}

// ============================================================
function Wrap({ onClose, children }: any) {
  useBackButton(true, onClose);
  return (
    <div className="fixed inset-0 z-[160] bg-gradient-to-b from-slate-900 via-slate-950 to-black flex flex-col" dir="rtl">
      <div className="px-4 pt-4 pb-3 flex items-center gap-2 border-b border-white/10 flex-shrink-0">
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-white active:scale-95"
        >
          <ChevronRight size={20} />
        </button>
        <h1 className="text-white text-base font-black flex-1">وكالتي</h1>
      </div>
      {children}
    </div>
  );
}

// ============================================================
// Info Tab
// ============================================================
function AgencyInfo({ agency, isOwner }: any) {
  const deviceId = getDeviceId();
  const [copied, setCopied] = useState(false);
  const leaveAgency = useMutation(api.agencies.leaveAgency);

  const handleCopy = () => {
    if (agency.agencyNumber) {
      navigator.clipboard.writeText(String(agency.agencyNumber)).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const handleLeave = () => {
    dialog.confirm(
      "هل أنت متأكد من مغادرة الوكالة؟",
      async () => {
        try {
          await leaveAgency({ tokenOverride: deviceId });
          dialog.alert("تم مغادرة الوكالة");
        } catch (e: any) {
          dialog.alert(e?.message || "فشل");
        }
      },
      "مغادرة",
      "مغادرة"
    );
  };

  return (
    <div className="space-y-4">
      {/* Card */}
      <div className="rounded-2xl bg-gradient-to-br from-teal-900/40 to-purple-900/40 border border-teal-400/30 p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-16 h-16 rounded-2xl bg-black/40 flex items-center justify-center overflow-hidden flex-shrink-0">
            {agency.logoUrl ? (
              <img src={agency.logoUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <Briefcase size={28} className="text-teal-300" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-lg font-black truncate">{agency.name}</p>
            <p className="text-teal-300 text-xs font-black" dir="ltr">ID: {agency.agencyNumber ?? "—"}</p>
          </div>
          <div className="px-3 py-1.5 rounded-full bg-amber-500/20 border border-amber-400/40">
            <span className="text-amber-200 text-xs font-black">Lv.{agency.level}</span>
          </div>
        </div>

        {agency.description && (
          <p className="text-white/70 text-xs leading-relaxed mb-3">{agency.description}</p>
        )}

        <button
          onClick={handleCopy}
          className="w-full rounded-xl bg-black/30 border border-white/10 py-2.5 px-4 flex items-center justify-center gap-2 text-white/70 text-xs font-black active:scale-95"
        >
          {copied ? <Check size={14} className="text-green-300" /> : <Copy size={14} />}
          نسخ رقم الوكالة
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={Users} label="مضيفون" value={agency.activeHostCount ?? agency.hostCount} color="text-emerald-300" />
        <StatCard icon={TrendingUp} label="نقاط الفريق" value={formatNum(agency.totalPoints30d)} color="text-purple-300" />
        <StatCard icon={DollarSign} label="الإيرادات" value={`$${formatNum(agency.totalEarned)}`} color="text-amber-300" />
      </div>

      {/* Leave button (if not owner) */}
      {!isOwner && (
        <button
          onClick={handleLeave}
          className="w-full rounded-2xl bg-red-500/10 border border-red-400/30 py-3.5 text-red-300 text-sm font-black flex items-center justify-center gap-2 active:scale-95"
        >
          <LogOut size={16} />
          مغادرة الوكالة
        </button>
      )}
    </div>
  );
}

// ============================================================
// Hosts List
// ============================================================
function HostsList({ agencyId }: { agencyId: any }) {
  const deviceId = getDeviceId();
  const hosts = useQuery(api.agencies.agencyHosts, {
    agencyId,
    tokenOverride: deviceId,
  } as any);

  if (hosts === undefined) {
    return <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-white/40" /></div>;
  }

  if (hosts.length === 0) {
    return (
      <div className="text-center py-16 text-white/40">
        <Users size={48} className="mx-auto mb-3 opacity-30" />
        <p className="text-sm">لا يوجد مضيفون</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-white/50 text-xs text-center mb-2">{hosts.length} مضيف</p>
      {hosts.map((h: any) => (
        <div key={h._id} className="rounded-2xl bg-white/5 border border-white/10 p-3 flex items-center gap-3">
          <div className="w-12 h-12 rounded-full overflow-hidden bg-purple-700 flex items-center justify-center flex-shrink-0">
            <UserAvatar avatarUrl={h.avatarUrl} name={h.name} className="w-full h-full" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-black truncate">{h.name}</p>
            <p className="text-white/50 text-[10px]" dir="ltr">ID:{h.userNumber ?? "—"}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-emerald-300 text-[10px] flex items-center gap-0.5">
                <TrendingUp size={9} /> {formatNum(h.incomeThisMonth)}
              </span>
              <span className="text-cyan-300 text-[10px]">
                💎 {formatNum(h.diamondsHeld)}
              </span>
            </div>
          </div>
          <div className="px-2 py-1 rounded-full bg-amber-500/20 border border-amber-400/40">
            <span className="text-amber-200 text-[10px] font-black">Lv.{h.hostLevel}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// Review Panel (owner only)
// ============================================================
function ReviewPanel({ onShowRequests }: any) {
  return (
    <div className="space-y-3">
      <button
        onClick={onShowRequests}
        className="w-full rounded-2xl bg-gradient-to-br from-purple-700/40 to-pink-700/40 border border-purple-400/40 p-6 flex flex-col items-center justify-center gap-2 active:scale-95"
      >
        <Clock size={32} className="text-purple-200" />
        <p className="text-white font-black text-sm">طلبات الانضمام</p>
        <p className="text-white/60 text-xs">مراجعة طلبات المضيفين الجدد</p>
      </button>
    </div>
  );
}

// ============================================================
// Members List
// ============================================================
function MembersList({ agencyId }: { agencyId: any }) {
  const deviceId = getDeviceId();
  const hosts = useQuery(api.agencies.agencyHosts, {
    agencyId,
    tokenOverride: deviceId,
  } as any);

  if (hosts === undefined) {
    return <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-white/40" /></div>;
  }

  return (
    <div className="space-y-2">
      {hosts.map((h: any) => (
        <div key={h._id} className="rounded-2xl bg-white/5 border border-white/10 p-3 flex items-center gap-3">
          <div className="w-11 h-11 rounded-full overflow-hidden bg-purple-700 flex items-center justify-center flex-shrink-0">
            <UserAvatar avatarUrl={h.avatarUrl} name={h.name} className="w-full h-full" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-black truncate">{h.name}</p>
            <p className="text-white/40 text-[10px]" dir="ltr">ID:{h.userNumber ?? "—"}</p>
          </div>
          <span className="text-white/40 text-[10px]">
            انضم {new Date(h.joinedAt).toLocaleDateString("ar-EG")}
          </span>
        </div>
      ))}
    </div>
  );
}

// ============================================================
function TabBtn({ active, onClick, label }: any) {
  return (
    <button
      onClick={onClick}
      className={`flex-shrink-0 px-3 py-1.5 rounded-full border text-xs font-black transition ${
        active
          ? "bg-purple-500/30 border-purple-400/60 text-white"
          : "bg-white/5 border-white/10 text-white/60"
      }`}
    >
      {label}
    </button>
  );
}

function StatCard({ icon: Icon, label, value, color }: any) {
  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-3 flex flex-col items-center gap-1">
      <Icon size={16} className={color} />
      <p className="text-white text-sm font-black tabular-nums">{value}</p>
      <p className="text-white/40 text-[10px]">{label}</p>
    </div>
  );
}

function formatNum(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + "B";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}
