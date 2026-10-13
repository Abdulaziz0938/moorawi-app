// [moorawi-agency] بياناتي كمضيف
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { getDeviceId } from "../lib/device";
import { dialog } from "../lib/dialog";
import {
  ChevronRight, Loader2, Clock, Users, TrendingUp, Award,
  Briefcase, Target, DollarSign, Heart, Calendar, Info, LogOut,
} from "lucide-react";
import Card from "./ui/Card";
import StatBadge from "./ui/StatBadge";
import SectionTitle from "./ui/SectionTitle";

interface Props {
  onClose: () => void;
  onShowRequests?: () => void;
  isOwner?: boolean;
}

export default function MyHostView({ onClose, onShowRequests, isOwner = false }: Props) {
  const deviceId = getDeviceId();
  const status = useQuery(api.agencies.myStatus, { tokenOverride: deviceId });

  if (status === undefined) {
    return (
      <div className="fixed inset-0 z-[160] bg-gradient-to-b from-slate-900 to-black flex flex-col" dir="rtl">
        <Header onClose={onClose} title="بياناتي كمضيف" />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 size={32} className="animate-spin text-white/40" />
        </div>
      </div>
    );
  }

  if (!status || !status.agencyId) {
    return (
      <div className="fixed inset-0 z-[160] bg-gradient-to-b from-slate-900 to-black flex flex-col" dir="rtl">
        <Header onClose={onClose} title="بياناتي كمضيف" />
        <div className="flex-1 flex flex-col items-center justify-center text-white/40 px-6">
          <Briefcase size={48} className="mb-3 opacity-30" />
          <p className="text-sm">لست في وكالة حالياً</p>
        </div>
      </div>
    );
  }

  const progress = status.targetCoins > 0
    ? Math.min(100, Math.round((status.incomeThisMonth / status.targetCoins) * 100))
    : 0;

  return (
    <div className="fixed inset-0 z-[160] bg-gradient-to-b from-slate-900 via-slate-950 to-black flex flex-col" dir="rtl">
      <Header onClose={onClose} title="بياناتي كمضيف" onShowRequests={onShowRequests} />

      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {/* Agency card */}
<Card tone="purple" padding="lg">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-black/40 flex items-center justify-center flex-shrink-0">
              <Briefcase size={22} className="text-teal-300" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-black truncate">{status.agencyName}</p>
              <p className="text-teal-300 text-[10px] font-black" dir="ltr">ID: {status.agencyNumber}</p>
            </div>
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/20 border border-amber-400/40">
              <Award size={11} className="text-amber-300" />
              <span className="text-amber-200 text-[10px] font-black">Lv.{status.hostLevel}</span>
            </div>
          </div>
        </Card>

        {/* Today stats */}
        <Section title="بياناتي هذا الشهر">
          <div className="grid grid-cols-3 gap-2">
            <StatBadge icon={Calendar} label="أيام" value={status.daysThisMonth} tone="purple" size="sm" />
            <StatBadge icon={Clock} label="ساعات" value={formatNum(status.hoursThisMonth)} tone="blue" size="sm" />
            <StatBadge icon={TrendingUp} label="الماس" value={formatNum(status.diamondsHeld)} tone="blue" size="sm" />
          </div>
        </Section>

        {/* Target progress */}
        <Section title="التارجت">
<Card tone="default" padding="lg">
            <div className="flex items-center justify-between">
              <span className="text-white/60 text-xs">الدخل الحالي</span>
              <span className="text-white text-sm font-black" dir="ltr">{formatNum(status.incomeThisMonth)}</span>
            </div>

            {/* Progress bar */}
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-white/40">{progress}%</span>
              <span className="text-white/40">
                الهدف: <span className="text-amber-300 font-black" dir="ltr">{formatNum(status.targetCoins)}</span>
              </span>
            </div>

            {status.nextLevelTarget > 0 && (
              <div className="flex items-center justify-between pt-2 border-t border-white/5">
                <span className="text-white/50 text-[10px]">المستوى التالي</span>
                <span className="text-emerald-300 text-[11px] font-black" dir="ltr">{formatNum(status.nextLevelTarget)}</span>
              </div>
            )}

            {status.halfSeasonTarget > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-white/50 text-[10px]">نصف الموسم</span>
                <span className="text-purple-300 text-[11px] font-black" dir="ltr">{formatNum(status.halfSeasonTarget)}</span>
              </div>
            )}
          </Card>
        </Section>

        {/* Salary */}
        {status.hostLevel > 0 && (
          <Section title="الراتب المتوقع">
            <div className="space-y-2">
              <SalaryRow icon={DollarSign} label="راتب أساسي" value={`$${status.baseSalary}`} color="text-blue-300" />
              <SalaryRow icon={Heart}      label="راتب ماس"   value={`$${status.diamondSalary}`} color="text-pink-300" />
              <div className="flex items-center justify-between rounded-2xl bg-emerald-500/15 border border-emerald-400/30 backdrop-blur-xl px-4 py-3">
                <span className="text-white font-black text-sm">الإجمالي</span>
                <span className="text-emerald-300 font-black text-lg" dir="ltr">${status.totalSalary}</span>
              </div>
            </div>
          </Section>
        )}

        {/* Info */}
<Card tone="default" padding="md" className="flex gap-2">
          <Info size={16} className="text-blue-300 flex-shrink-0 mt-0.5" />
          <p className="text-blue-100 text-[11px] leading-relaxed">
            الاحتفاظ بالماس في حسابك يزيد من راتبك. أي صرف سيخفض راتب الماس تلقائياً.
          </p>
        </Card>

        {/* Leave Button (للمضيف غير المالك) */}
        {!isOwner && <LeaveButton />}

      </div>
    </div>
  );
}

// ============================================================
function LeaveButton() {
  const deviceId = getDeviceId();
  const leaveAgency = useMutation(api.agencies.leaveAgency);

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
<Card tone="danger" interactive onClick={handleLeave} padding="lg">
        <div className="flex items-center justify-center gap-2 text-red-300 text-sm font-black">
          <LogOut size={16} />
          مغادرة الوكالة
        </div>
      </Card>
  );
}

function Header({ onClose, title, onShowRequests }: { onClose: () => void; title: string; onShowRequests?: () => void }) {
  return (
    <div className="px-4 pt-4 pb-3 flex items-center gap-2 border-b border-white/10 flex-shrink-0">
      <button
        onClick={onClose}
        className="w-10 h-10 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-white active:scale-95"
      >
        <ChevronRight size={20} />
      </button>
      <h1 className="text-white text-base font-black flex-1">{title}</h1>
      {onShowRequests && (
        <button
          onClick={onShowRequests}
          className="px-3 py-2 rounded-xl bg-purple-600 text-white text-xs font-black flex items-center gap-1.5 active:scale-95"
        >
          <Users size={14} />
          الطلبات
        </button>
      )}
    </div>
  );
}

function Section({ title, children }: any) {
  return (
    <div>
      <SectionTitle title={title} tone="purple" />
      {children}
    </div>
  );
}


function SalaryRow({ icon: Icon, label, value, color }: any) {
  return (
<Card tone="default" padding="md" className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon size={14} className={color} />
        <span className="text-white/70 text-xs">{label}</span>
      </div>
      <span className={`font-black text-sm ${color}`} dir="ltr">{value}</span>
    </Card>
  );
}

function formatNum(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + "B";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}
