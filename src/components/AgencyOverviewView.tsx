// [moorawi-agency] تبويب "وكالة" — لمالك الوكالة أو المضيف
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { getDeviceId } from "../lib/device";
import { dialog } from "../lib/dialog";
import { useBackButton } from "../lib/hooks/useBackButton";
import UserAvatar from "./UserAvatar";
import Card from "./ui/Card";
import StatBadge from "./ui/StatBadge";
import SectionTitle from "./ui/SectionTitle";
import { ChevronRight, Loader2, Briefcase, Users, Award, Crown, Clock, TrendingUp, Heart, DollarSign, LogOut, Copy, Check, Building2, User, Gem, Gift } from "lucide-react";

interface Props {
  onClose: () => void;
  onShowRequests?: () => void;
  onUserClick?: (userId: any) => void;
}

type Tab = "info" | "hosts" | "review" | "members";

export default function AgencyOverviewView({ onClose, onShowRequests, onUserClick }: Props) {
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
        {tab === "hosts" && <HostsList agencyId={agency._id} onUserClick={onUserClick} />}
        {tab === "review" && isOwner && <ReviewPanel onShowRequests={onShowRequests} />}
        {tab === "members" && <HostsList agencyId={agency._id} onUserClick={onUserClick} />}
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
<Card tone="purple" padding="lg">
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
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatBadge icon={Users} label="مضيفون" value={agency.activeHostCount ?? agency.hostCount} tone="emerald" size="sm" />
        <StatBadge icon={TrendingUp} label="نقاط الفريق" value={formatNum(agency.totalPoints30d)} tone="purple" size="sm" />
        <StatBadge icon={DollarSign} label="الإيرادات" value={`$${formatNum(agency.totalEarned)}`} tone="gold" size="sm" />
      </div>

      {/* Leave button (if not owner) */}
      {!isOwner && (
<Card tone="danger" interactive onClick={handleLeave} padding="lg">
          <div className="flex items-center justify-center gap-2 text-red-300 text-sm font-black">
            
          </div>
        </Card>
      )}
    </div>
  );
}

// ============================================================
// Hosts List (Excel-style rows)
// ============================================================
function HostsList({ agencyId, onUserClick }: { agencyId: any; onUserClick?: (id: any) => void }) {
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
<Card tone="default" padding="lg">
        <div className="text-center py-12 text-white/40">
          <Users size={48} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">لا يوجد مضيفون</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      <SectionTitle icon={Users} title={`${hosts.length} مضيف`} tone="purple" />
      {hosts.map((h: any) => (
        <HostRow key={h._id} host={h} onUserClick={onUserClick} />
      ))}
    </div>
  );
}

// ============================================================
// Host Row (Excel-style)
// ============================================================
function HostRow({ host, onUserClick }: any) {
  const [showStats, setShowStats] = useState(false);

  return (
<Card
      interactive
      onClick={() => setShowStats((v) => !v)}
      padding="md"
    >
      {/* Top row: avatar + name + VIP */}
      <div className="flex items-center gap-3">
        <div
          onClick={(e) => {
            e.stopPropagation();
            if (onUserClick) onUserClick(host.userId);
          }}
          className="w-14 h-14 rounded-full overflow-hidden bg-purple-700 flex items-center justify-center flex-shrink-0 border-2 border-white/15"
        >
          <UserAvatar avatarUrl={host.avatarUrl} name={host.name} className="w-full h-full" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-end gap-2 flex-wrap">
            {host.hostLevel > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-gradient-to-r from-amber-500 to-yellow-600 text-black text-[9px] font-black">
                Lv.{host.hostLevel}
              </span>
            )}
            <p className="text-white text-sm font-black truncate">{host.name}</p>
          </div>
          <p className="text-white/40 text-[10px] mt-0.5 text-left" dir="ltr">
            ID:{host.userNumber ?? "—"}
          </p>
        </div>

        {/* Chevron */}
        <ChevronRight size={16} className={`text-white/30 transition-transform ${showStats ? "rotate-90" : ""}`} />
      </div>

      {/* Stats row (grid 4 columns) */}
      {showStats && (
        <div className="grid grid-cols-4 gap-2 mt-3 pt-3 border-t border-white/5">
          <StatMini label="أيام" value={host.days ?? 0} color="text-purple-300" />
          <StatMini label="ساعات" value={formatNum(host.hours ?? 0)} color="text-blue-300" />
          <StatMini label="ماس" value={formatNum(host.diamondsHeld ?? 0)} color="text-cyan-300" />
          <StatMini label="قيمة السحر" value={formatNum(host.incomeThisMonth ?? 0)} color="text-pink-300" />
        </div>
      )}

      {/* Compact preview (always visible) */}
      {!showStats && (
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
          <span className="text-white/50 text-[10px]">
            {host.days ?? 0} يوم · {formatNum(host.hours ?? 0)} ساعة
          </span>
          <div className="flex items-center gap-3">
            <span className="text-cyan-300 text-[10px] font-bold">
              <span className="inline-flex items-center gap-1"><Gem size={11} className="text-cyan-400" /> {formatNum(host.diamondsHeld ?? 0)}</span>
            </span>
            <span className="text-pink-300 text-[10px] font-bold">
              <span className="inline-flex items-center gap-1"><Gift size={11} className="text-pink-400" /> {formatNum(host.incomeThisMonth ?? 0)}</span>
            </span>
          </div>
        </div>
      )}
    </Card>
  );
}

function StatMini({ label, value, color }: any) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className={`text-[11px] font-black ${color}`}>{value}</span>
      <span className="text-white/40 text-[9px]">{label}</span>
    </div>
  );
}

// ============================================================
// Review Panel (owner only)
// ============================================================
function ReviewPanel({ onShowRequests }: any) {
  return (
    <div className="space-y-3">
<Card interactive onClick={onShowRequests} tone="purple" padding="lg">
        
      </Card>
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


function formatNum(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + "B";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}
