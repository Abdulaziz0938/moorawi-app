// [moorawi-agency] طلبات الانضمام الواردة للوكيل — عرض الملف + قبول/رفض
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { getDeviceId } from "../lib/device";
import { dialog } from "../lib/dialog";
import UserAvatar from "./UserAvatar";
import { UserName } from "./UserBadges";
import {
  ChevronRight, Loader2, Check, X, User, Users, Clock,
  Eye, Briefcase, TrendingUp, Award, Heart,
} from "lucide-react";

interface Props {
  onClose: () => void;
  onBack?: () => void;
}

export default function HostRequestsPanel({ onClose, onBack }: Props) {
  const deviceId = getDeviceId();
  const requests = useQuery(api.agencies.hostRequests, { tokenOverride: deviceId });
  const review = useMutation(api.agencies.reviewRequest);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [previewUser, setPreviewUser] = useState<any>(null);

  const handleApprove = async (req: any) => {
    dialog.confirm(
      `قبول "${req.name}" في وكالتك؟`,
      async () => {
        setBusyId(req._id);
        try {
          await review({
            requestId: req._id,
            approve: true,
            tokenOverride: deviceId,
          });
          dialog.alert(`تم قبول ${req.name}`);
        } catch (e: any) {
          dialog.alert(e?.message || "فشل");
        } finally {
          setBusyId(null);
        }
      },
      "قبول",
      "قبول"
    );
  };

  const handleReject = async (req: any) => {
    dialog.confirm(
      `رفض طلب "${req.name}"؟`,
      async () => {
        setBusyId(req._id);
        try {
          await review({
            requestId: req._id,
            approve: false,
            tokenOverride: deviceId,
          });
        } catch (e: any) {
          dialog.alert(e?.message || "فشل");
        } finally {
          setBusyId(null);
        }
      },
      "رفض",
      "رفض"
    );
  };

  if (requests === undefined) {
    return (
      <div className="fixed inset-0 z-[160] bg-gradient-to-b from-slate-900 via-slate-950 to-black flex flex-col" dir="rtl">
        <Header onClose={onBack ?? onClose} title="طلبات الانضمام" />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 size={32} className="animate-spin text-white/40" />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[160] bg-gradient-to-b from-slate-900 via-slate-950 to-black flex flex-col" dir="rtl">
      <Header onClose={onBack ?? onClose} title="طلبات الانضمام" count={requests.length} />

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {requests.length === 0 ? (
          <div className="text-center py-16 text-white/40">
            <Users size={48} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">لا توجد طلبات معلقة</p>
          </div>
        ) : (
          requests.map((r: any) => {
            const isBusy = busyId === r._id;
            return (
              <div key={r._id} className="rounded-2xl border border-white/10 bg-white/5 p-3 space-y-3">
                {/* User row */}
                <button
                  onClick={() => setPreviewUser(r)}
                  className="w-full flex items-center gap-3 active:opacity-80"
                >
                  <div className="w-14 h-14 rounded-full overflow-hidden bg-purple-700 flex items-center justify-center flex-shrink-0">
                    <UserAvatar avatarUrl={r.avatarUrl} name={r.name} className="w-full h-full" />
                  </div>
                  <div className="flex-1 min-w-0 text-right">
                    <p className="text-white text-sm font-black truncate">{r.name}</p>
                    <p className="text-white/50 text-[10px]" dir="ltr">ID:{r.userNumber ?? "—"}</p>
                    <p className="text-white/40 text-[10px] mt-0.5">
                      <Clock size={10} className="inline mr-1" />
                      {new Date(r.createdAt).toLocaleDateString("ar-EG")}
                    </p>
                  </div>
                  <Eye size={16} className="text-white/40" />
                </button>

                {/* Quick stats */}
                <div className="grid grid-cols-3 gap-2">
                  <StatBox icon={TrendingUp} label="ثراء" value={`Lv.${r.wealthLevel}`} color="text-amber-300" />
                  <StatBox icon={Heart}      label="جاذبية" value={`${formatNum(r.charms)}`} color="text-pink-300" />
                  <StatBox icon={Award}      label="VIP" value={r.vipLevel > 0 ? `VIP ${r.vipLevel}` : "—"} color="text-purple-300" />
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApprove(r)}
                    disabled={isBusy}
                    className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-white font-black text-xs flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
                  >
                    {isBusy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                    قبول
                  </button>
                  <button
                    onClick={() => handleReject(r)}
                    disabled={isBusy}
                    className="flex-1 rounded-xl bg-red-600/80 py-2.5 text-white font-black text-xs flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
                  >
                    <X size={14} />
                    رفض
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Preview modal */}
      {previewUser && (
        <PreviewModal user={previewUser} onClose={() => setPreviewUser(null)} />
      )}
    </div>
  );
}

// ============================================================
// Preview Modal — الملف الشخصي الكامل
// ============================================================
function PreviewModal({ user, onClose }: { user: any; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[170] bg-black/80 backdrop-blur-sm flex items-end" onClick={onClose}>
      <div
        className="w-full max-w-md mx-auto bg-slate-900 rounded-t-3xl p-4 max-h-[85dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        <div className="flex justify-end mb-2">
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white">
            <X size={16} />
          </button>
        </div>

        {/* Avatar */}
        <div className="flex flex-col items-center mb-4">
          <div className="w-24 h-24 rounded-full overflow-hidden bg-purple-700 border-2 border-white/20 mb-2">
            <UserAvatar avatarUrl={user.avatarUrl} name={user.name} className="w-full h-full" />
          </div>
          <UserName
            name={user.name}
            vip={user.vipLevel}
            adminRole={null}
            roomRole={null}
            size="md"
          />
          <p className="text-white/50 text-xs mt-1" dir="ltr">ID:{user.userNumber ?? "—"}</p>
        </div>

        {/* Info chips */}
        <div className="flex items-center justify-center gap-2 flex-wrap mb-4">
          {user.age && <Chip>{user.age} سنة</Chip>}
          {user.gender && <Chip>{user.gender === "male" ? "ذكر" : user.gender === "female" ? "أنثى" : "آخر"}</Chip>}
          {user.country && <Chip>{user.country}</Chip>}
        </div>

        {/* Bio */}
        {user.bio && (
          <div className="rounded-2xl bg-white/5 border border-white/10 p-3 mb-3">
            <p className="text-white/50 text-[10px] font-black mb-1">نبذة</p>
            <p className="text-white/80 text-xs leading-relaxed">{user.bio}</p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <StatCard icon={TrendingUp} label="مستوى الثراء" value={`Lv.${user.wealthLevel}`} color="from-amber-700/30 to-amber-900/30 border-amber-500/30 text-amber-300" />
          <StatCard icon={Heart}      label="الشارات"       value={formatNum(user.charms)}    color="from-pink-700/30 to-pink-900/30 border-pink-500/30 text-pink-300" />
          <StatCard icon={Award}      label="VIP"           value={user.vipLevel > 0 ? `VIP ${user.vipLevel}` : "—"} color="from-purple-700/30 to-purple-900/30 border-purple-500/30 text-purple-300" />
          <StatCard icon={Briefcase}  label="الحالة"        value={user.verificationStatus === "approved" ? "موثق" : "غير موثق"} color="from-emerald-700/30 to-emerald-900/30 border-emerald-500/30 text-emerald-300" />
        </div>
      </div>
    </div>
  );
}

function Chip({ children }: any) {
  return (
    <span className="px-2.5 py-1 rounded-full bg-white/10 border border-white/15 text-white/70 text-[11px] font-bold">
      {children}
    </span>
  );
}

function StatBox({ icon: Icon, label, value, color }: any) {
  return (
    <div className="rounded-xl bg-black/30 border border-white/5 p-2 flex flex-col items-center gap-1">
      <Icon size={14} className={color} />
      <p className="text-white text-[11px] font-black">{value}</p>
      <p className="text-white/40 text-[9px]">{label}</p>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: any) {
  return (
    <div className={`rounded-2xl border bg-gradient-to-br p-3 flex flex-col gap-1 ${color}`}>
      <Icon size={16} />
      <p className="text-white text-sm font-black">{value}</p>
      <p className="text-white/60 text-[10px]">{label}</p>
    </div>
  );
}

function Header({ onClose, title, count }: { onClose: () => void; title: string; count?: number }) {
  return (
    <div className="px-4 pt-4 pb-3 flex items-center gap-2 border-b border-white/10 flex-shrink-0">
      <button
        onClick={onClose}
        className="w-10 h-10 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-white active:scale-95"
      >
        <ChevronRight size={20} />
      </button>
      <h1 className="text-white text-base font-black flex-1">
        {title}
        {count !== undefined && <span className="text-white/40 text-xs font-normal mr-2">({count})</span>}
      </h1>
    </div>
  );
}

function formatNum(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + "B";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}
